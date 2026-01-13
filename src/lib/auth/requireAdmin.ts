import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminEmailsAllowlist } from "@/lib/supabase/env";

export async function requireAdminOrThrow() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("UNAUTHENTICATED");

  const email = (user.email ?? "").toLowerCase();
  const allowlist = getAdminEmailsAllowlist();
  if (!email || !allowlist.includes(email)) throw new Error("FORBIDDEN");

  return { supabase, user, email };
}

