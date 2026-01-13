import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminOrThrow } from "@/lib/auth/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { errorMessage, isForbidden, isUnauthenticated } from "@/lib/util/http";

const paramsSchema = z.object({ id: z.string().uuid() });

const themeUpdateSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters/numbers/hyphens")
    .optional(),
  name: z.string().min(2).max(120).optional(),
  prompt_template: z.string().min(10).max(20_000).optional(),
  is_active: z.boolean().optional(),
  access_tier: z.enum(["free", "pro"]).optional(),
  sort_order: z.number().int().optional(),
});

export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrThrow();
    const { id } = paramsSchema.parse(await ctx.params);
    const patch = themeUpdateSchema.parse(await request.json());
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("themes")
      .update(patch)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ theme: data });
  } catch (err) {
    if (isUnauthenticated(err)) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (isForbidden(err)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrThrow();
    const { id } = paramsSchema.parse(await ctx.params);
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("themes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isUnauthenticated(err)) return NextResponse.json({ error: "Login required" }, { status: 401 });
    if (isForbidden(err)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

