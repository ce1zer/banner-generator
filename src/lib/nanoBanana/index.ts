import { PNG } from "pngjs";
import { getServerEnv } from "@/lib/supabase/env";

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
  _env: ReturnType<typeof getServerEnv>,
  _args: { prompt: string; aspect: "4:5"; referenceImageUrl: string },
  _signal: AbortSignal,
): Promise<NanoBananaResult> {
  // TODO: Implement provider-specific request/response mapping here.
  // Requirements:
  // - server-side only
  // - must send: prompt string + reference image + aspect ratio 4:5
  // - return: {buffer, contentType, width, height}
  //
  // IMPORTANT: Avoid assuming exact request fields until you have the provider docs.
  throw new Error(
    "Nano Banana adapter is not configured. TODO: Implement request/response mapping in src/lib/nanoBanana/index.ts",
  );
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

