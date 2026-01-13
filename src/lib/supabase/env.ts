import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  ADMIN_EMAILS: z.string().optional(),
  NANO_BANANA_API_KEY: z.string().optional(),
  NANO_BANANA_API_URL: z.string().url().optional(),
  // Nano Banana adapter wiring (kept flexible to avoid assuming provider schema).
  NANO_BANANA_REQUEST_TEMPLATE_JSON: z.string().optional(),
  NANO_BANANA_AUTH_HEADER: z.string().optional(),
  NANO_BANANA_AUTH_VALUE_TEMPLATE: z.string().optional(),
  NANO_BANANA_RESPONSE_MODE: z.string().optional(), // "auto" | "image" | "json_base64" | "json_url"
  NANO_BANANA_JSON_IMAGE_BASE64_FIELD: z.string().optional(),
  NANO_BANANA_JSON_IMAGE_URL_FIELD: z.string().optional(),
  NANO_BANANA_JSON_CONTENT_TYPE_FIELD: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(): ServerEnv {
  // In Next.js, process.env is only available server-side for non-NEXT_PUBLIC vars.
  // We validate at runtime to fail fast in dev.
  return serverEnvSchema.parse(process.env);
}

export function getAdminEmailsAllowlist(): string[] {
  const { ADMIN_EMAILS } = getServerEnv();
  if (!ADMIN_EMAILS) return [];
  return ADMIN_EMAILS.split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

