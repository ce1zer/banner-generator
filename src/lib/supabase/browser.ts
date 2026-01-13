import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

// Browser client uses ONLY public env vars (safe to expose).
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // During `next build` in environments without env vars (or when prerendering),
  // we avoid throwing to keep compilation unblocked.
  if (!url || !anonKey) {
    if (typeof window !== "undefined") {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
      );
    }
    return createBrowserClient<Database>(
      "http://localhost:54321",
      "missing-anon-key",
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}

