import { PNG } from "pngjs";
import { getServerEnv } from "@/lib/supabase/env";
import sharp from "sharp";
import { renderTemplateValue, safeJsonParse } from "./template";

export type NanoBananaResult = {
  buffer: Buffer;
  contentType: string;
  width: number;
  height: number;
};

export async function generateComposition(args: {
  prompt: string;
  aspect: "4:5";
  referenceImageUrl: string;
}): Promise<NanoBananaResult> {
  const env = getServerEnv();

  // Local/dev fallback: keep the full app flow working even without API keys.
  if (!env.NANO_BANANA_API_KEY || !env.NANO_BANANA_API_URL) {
    return generatePlaceholderPng();
  }

  // NOTE: We intentionally do NOT assume the exact Nano Banana request/response fields.
  // This module provides the robustness guarantees (timeout + 1 retry) and a clean adapter seam.
  // TODO: Paste the real API mapping in `callNanoBananaApi`.
  return retryOnce(
    () => callWithTimeout((signal) => callNanoBananaApi(env, args, signal), 50_000),
    { retryDelayMs: 500 },
  );
}

async function callNanoBananaApi(
  env: ReturnType<typeof getServerEnv>,
  args: { prompt: string; aspect: "4:5"; referenceImageUrl: string },
  signal: AbortSignal,
): Promise<NanoBananaResult> {
  if (!env.NANO_BANANA_API_URL || !env.NANO_BANANA_API_KEY) {
    return generatePlaceholderPng();
  }

  // IMPORTANT: We still avoid assuming Nano Banana's exact request field names.
  // You configure a JSON request template in env and we just replace placeholders.
  //
  // Example template:
  // { "prompt": "{{PROMPT}}", "reference_image_url": "{{REFERENCE_IMAGE_URL}}", "aspect_ratio": "{{ASPECT}}" }
  if (!env.NANO_BANANA_REQUEST_TEMPLATE_JSON) {
    throw new Error(
      "Missing NANO_BANANA_REQUEST_TEMPLATE_JSON. Provide a JSON body template using placeholders {{PROMPT}}, {{REFERENCE_IMAGE_URL}}, {{ASPECT}}.",
    );
  }

  const requestTemplate = safeJsonParse<Record<string, unknown>>(
    env.NANO_BANANA_REQUEST_TEMPLATE_JSON,
  );
  const payload = renderTemplateValue(requestTemplate, {
    PROMPT: args.prompt,
    REFERENCE_IMAGE_URL: args.referenceImageUrl,
    ASPECT: args.aspect,
  });

  const authHeader = env.NANO_BANANA_AUTH_HEADER ?? "Authorization";
  const authValueTemplate = env.NANO_BANANA_AUTH_VALUE_TEMPLATE ?? "Bearer {{API_KEY}}";
  const authValue = authValueTemplate.replaceAll("{{API_KEY}}", env.NANO_BANANA_API_KEY);

  // Basic URL validation helps avoid undici's opaque "expected pattern" error.
  try {
    new URL(env.NANO_BANANA_API_URL);
  } catch {
    throw new Error(
      `Invalid NANO_BANANA_API_URL (must be an absolute URL): "${env.NANO_BANANA_API_URL}"`,
    );
  }

  // Debug logging is intentionally "safe": it never prints API keys, prompts, or full signed URLs.
  const debugEnabled =
    (process.env.NANO_BANANA_DEBUG ?? "").toLowerCase() === "1" ||
    (process.env.NANO_BANANA_DEBUG ?? "").toLowerCase() === "true";
  const safeUrl = (raw: string) => {
    try {
      const u = new URL(raw);
      return `${u.protocol}//${u.host}${u.pathname}`;
    } catch {
      return "(invalid-url)";
    }
  };

  const res = await fetch(env.NANO_BANANA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [authHeader]: authValue,
    },
    body: JSON.stringify(payload),
    signal,
  });

  const contentTypeHeader = res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const errBody = contentTypeHeader.includes("application/json")
      ? JSON.stringify(await res.json())
      : await res.text();
    if (debugEnabled) {
      console.error("[NanoBanana] non-2xx response", {
        status: res.status,
        contentType: contentTypeHeader,
        apiUrl: safeUrl(env.NANO_BANANA_API_URL),
        referenceImageUrl: safeUrl(args.referenceImageUrl),
        bodyPreview: errBody.slice(0, 800),
      });
    }
    throw new Error(`Nano Banana error (${res.status}): ${errBody}`);
  }

  // 1) Provider returns raw image bytes
  if (contentTypeHeader.startsWith("image/")) {
    if (debugEnabled) {
      console.error("[NanoBanana] response=raw_image", {
        contentType: contentTypeHeader,
        apiUrl: safeUrl(env.NANO_BANANA_API_URL),
      });
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    return {
      buffer,
      contentType: contentTypeHeader,
      width: meta.width ?? 1024,
      height: meta.height ?? 1280,
    };
  }

  // 2) Provider returns JSON (base64 or URL to fetch)
  const json = contentTypeHeader.includes("application/json")
    ? await res.json()
    : null;
  if (!json) {
    if (debugEnabled) {
      console.error("[NanoBanana] unexpected response content-type", {
        contentType: contentTypeHeader,
        apiUrl: safeUrl(env.NANO_BANANA_API_URL),
      });
    }
    throw new Error(`Unexpected Nano Banana response content-type: ${contentTypeHeader}`);
  }

  const mode = (env.NANO_BANANA_RESPONSE_MODE ?? "auto").toLowerCase();
  const base64Field = env.NANO_BANANA_JSON_IMAGE_BASE64_FIELD ?? "image_base64";
  const urlField = env.NANO_BANANA_JSON_IMAGE_URL_FIELD ?? "image_url";
  const ctField = env.NANO_BANANA_JSON_CONTENT_TYPE_FIELD ?? "content_type";

  const jsonObj = json as Record<string, unknown>;
  const jsonCt = (jsonObj[ctField] as string | undefined) ?? "image/png";

  const tryBase64 = () => {
    const b64 = jsonObj[base64Field];
    if (typeof b64 !== "string" || !b64) return null;
    const cleaned = b64.includes(",") ? b64.split(",").pop()! : b64;
    return Buffer.from(cleaned, "base64");
  };
  const tryUrl = () => {
    const url = jsonObj[urlField];
    if (typeof url !== "string" || !url) return null;
    return url;
  };

  let buffer: Buffer | null = null;
  let contentType = jsonCt;

  if (debugEnabled) {
    console.error("[NanoBanana] response=json", {
      apiUrl: safeUrl(env.NANO_BANANA_API_URL),
      mode,
      contentType: contentTypeHeader,
      jsonKeys: Object.keys(jsonObj).slice(0, 40),
      base64Field,
      urlField,
      hasBase64Field: typeof jsonObj[base64Field] === "string",
      hasUrlField: typeof jsonObj[urlField] === "string",
    });
  }

  if (mode === "json_base64" || mode === "auto") {
    buffer = tryBase64();
  }

  if (!buffer && (mode === "json_url" || mode === "auto")) {
    const url = tryUrl();
    if (url) {
      try {
        new URL(url);
      } catch {
        if (debugEnabled) {
          console.error("[NanoBanana] invalid json_url field", {
            urlField,
            urlValuePreview: String(url).slice(0, 200),
          });
        }
        throw new Error(`Nano Banana returned invalid image URL in "${urlField}"`);
      }
      const imgRes = await fetch(url, { signal });
      if (!imgRes.ok) throw new Error(`Nano Banana image fetch failed: ${imgRes.status}`);
      contentType = imgRes.headers.get("content-type") ?? contentType;
      buffer = Buffer.from(await imgRes.arrayBuffer());
    }
  }

  if (!buffer) {
    const keys = Object.keys(jsonObj).slice(0, 25).join(", ");
    throw new Error(
      `Nano Banana JSON response missing image. Looked for base64 field "${base64Field}" or url field "${urlField}". Keys: ${keys}`,
    );
  }

  const meta = await sharp(buffer).metadata();
  return {
    buffer,
    contentType,
    width: meta.width ?? 1024,
    height: meta.height ?? 1280,
  };
}

async function callWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function retryOnce<T>(
  fn: () => Promise<T>,
  opts: { retryDelayMs: number },
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    // Don't retry on abort; it will just burn time.
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    await new Promise((r) => setTimeout(r, opts.retryDelayMs));
    return await fn();
  }
}

function generatePlaceholderPng(): NanoBananaResult {
  const width = 1024;
  const height = 1280; // 4:5 portrait
  const png = new PNG({ width, height });

  // Simple cinematic-ish gradient (no text).
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const t = y / height;
      const r = Math.floor(20 + 40 * t);
      const g = Math.floor(18 + 26 * t);
      const b = Math.floor(28 + 80 * t);
      png.data[idx] = r;
      png.data[idx + 1] = g;
      png.data[idx + 2] = b;
      png.data[idx + 3] = 255;
    }
  }

  // Soft vignette
  const cx = width / 2;
  const cy = height / 2;
  const maxD = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxD;
      const v = Math.max(0, 1 - d * 0.9);
      png.data[idx] = Math.floor(png.data[idx] * v);
      png.data[idx + 1] = Math.floor(png.data[idx + 1] * v);
      png.data[idx + 2] = Math.floor(png.data[idx + 2] * v);
    }
  }

  const buffer = PNG.sync.write(png);
  return { buffer, contentType: "image/png", width, height };
}

