import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { getServerEnv } from "./env";

// Server-side public client (anon key) for endpoints that must work without service role.
export function createSupabasePublicClient() {
  const env = getServerEnv();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

