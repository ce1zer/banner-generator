import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrThrow } from "@/lib/auth/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, isForbidden, isUnauthenticated } from "@/lib/util/http";

const themeCreateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters/numbers/hyphens"),
  name: z.string().min(2).max(120),
  prompt_template: z.string().min(10).max(20_000),
  is_active: z.boolean().default(true),
  access_tier: z.enum(["free", "pro"]).default("free"),
  sort_order: z.number().int().default(0),
});

export async function GET() {
  try {
    await requireAdminOrThrow();
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("themes")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ themes: data ?? [] });
  } catch (err) {
    if (isUnauthenticated(err)) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (isForbidden(err)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminOrThrow();
    const body = themeCreateSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("themes")
      .insert(body)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ theme: data }, { status: 201 });
  } catch (err) {
    if (isUnauthenticated(err)) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (isForbidden(err)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

