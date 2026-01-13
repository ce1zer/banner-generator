export function renderTemplateValue(
  value: unknown,
  vars: Record<string, string>,
): unknown {
  if (typeof value === "string") {
    let out = value;
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{{${k}}}`, v);
    }
    return out;
  }

  if (Array.isArray(value)) {
    return value.map((v) => renderTemplateValue(v, vars));
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = renderTemplateValue(v, vars);
    }
    return out;
  }

  // numbers/booleans/null etc
  return value;
}

export function safeJsonParse<T = unknown>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error("Invalid JSON in NANO_BANANA_REQUEST_TEMPLATE_JSON");
  }
}

