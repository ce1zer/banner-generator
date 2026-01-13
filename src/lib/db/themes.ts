import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { ThemeListItem } from "@/lib/types/models";

export async function listActiveThemes(): Promise<ThemeListItem[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("themes")
    .select("id,name,slug")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

