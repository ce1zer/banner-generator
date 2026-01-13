import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrThrow } from "@/lib/auth/requireUser";
import { createSignedUrl } from "@/lib/storage/admin";
import { errorMessage, isUnauthenticated } from "@/lib/util/http";

const paramsSchema = z.object({ id: z.string().uuid() });

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, user } = await requireUserOrThrow();
    const { id } = paramsSchema.parse(await ctx.params);

    const { data: gen, error } = await supabase
      .from("generations")
      .select(
        "id,status,created_at,theme_id,input,prompt_final,dog_photo_path,result_image_path,image_width,image_height,error",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (error || !gen) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let signedUrl: string | null = null;
    if (gen.status === "succeeded" && gen.result_image_path) {
      signedUrl = await createSignedUrl({
        bucket: "generated",
        path: gen.result_image_path,
        expiresInSeconds: 60,
      });
    }

    return NextResponse.json({
      generation: {
        ...gen,
        signedUrl,
      },
    });
  } catch (err) {
    if (isUnauthenticated(err)) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

