import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserOrThrow } from "@/lib/auth/requireUser";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { uploadPrivateObject, createSignedUrl } from "@/lib/storage/admin";
import { makeGeneratedPath, makeUploadPath } from "@/lib/storage/paths";
import { renderPromptTemplate } from "@/lib/prompt/render";
import { generateComposition } from "@/lib/nanoBanana";
import { errorMessage, isUnauthenticated } from "@/lib/util/http";

const inputSchema = z.object({
  themeId: z.string().uuid(),
  title: z.string().max(120).optional().or(z.literal("")),
  subtitle: z.string().max(200).optional().or(z.literal("")),
  contact: z.string().max(200).optional().or(z.literal("")),
});

const HARD_TIMEOUT_MS = 55_000;

export async function POST(request: Request) {
  try {
    const { supabase: supabaseUser, user } = await requireUserOrThrow();

    const form = await request.formData();
    const raw = {
      themeId: String(form.get("themeId") ?? ""),
      title: String(form.get("title") ?? ""),
      subtitle: String(form.get("subtitle") ?? ""),
      contact: String(form.get("contact") ?? ""),
    };
    const parsed = inputSchema.parse(raw);
    const dogPhoto = form.get("dogPhoto");
    if (!(dogPhoto instanceof File)) {
      return NextResponse.json({ error: "Upload required" }, { status: 400 });
    }

    // Validate theme is active (public RLS allows selecting active themes).
    const supabasePublic = createSupabasePublicClient();
    const { data: theme, error: themeErr } = await supabasePublic
      .from("themes")
      .select("id,name,slug,prompt_template,is_active")
      .eq("id", parsed.themeId)
      .eq("is_active", true)
      .single();
    if (themeErr || !theme) {
      return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
    }

    // Create generation job record (queued).
    const { data: gen, error: genErr } = await supabaseUser
      .from("generations")
      .insert({
        user_id: user.id,
        theme_id: theme.id,
        status: "queued",
        input: {
          title: parsed.title || undefined,
          subtitle: parsed.subtitle || undefined,
          contact: parsed.contact || undefined,
        },
      })
      .select("id")
      .single();
    if (genErr || !gen) throw new Error(genErr?.message ?? "Failed to create generation");

    // Run inline generation with a hard timeout (Vercel safety).
    const generationId = gen.id;
    await callWithHardTimeout(
      () => runInlineGeneration({ supabaseUser, userId: user.id, generationId, theme, dogPhoto }),
      HARD_TIMEOUT_MS,
    );

    return NextResponse.json({ generationId });
  } catch (err) {
    if (isUnauthenticated(err)) {
      return NextResponse.json({ error: "Login required to generate" }, { status: 401 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const message = errorMessage(err);
    // If we timed out, return 504 so the client can retry UX.
    const status = message === "HARD_TIMEOUT" ? 504 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function runInlineGeneration(args: {
  supabaseUser: Awaited<ReturnType<typeof requireUserOrThrow>>["supabase"];
  userId: string;
  generationId: string;
  theme: { id: string; name: string; slug: string; prompt_template: string };
  dogPhoto: File;
}) {
  // TODO (future worker): move this function into a background worker (Edge Function / queue)
  // and have /api/generations/start only enqueue + return generationId.
  const supabaseAdmin = createSupabaseAdminClient();

  const photoExt = guessExt(args.dogPhoto);
  const uploadPath = makeUploadPath({
    userId: args.userId,
    objectId: crypto.randomUUID(),
    ext: photoExt,
  });

  const photoBytes = Buffer.from(await args.dogPhoto.arrayBuffer());
  await uploadPrivateObject({
    bucket: "uploads",
    path: uploadPath,
    data: photoBytes,
    contentType: args.dogPhoto.type || "application/octet-stream",
  });

  const referenceImageUrl = await createSignedUrl({
    bucket: "uploads",
    path: uploadPath,
    expiresInSeconds: 60 * 5,
  });

  const promptFinal = renderPromptTemplate({
    template: args.theme.prompt_template,
    themeName: args.theme.name,
    themeSlug: args.theme.slug,
    aspect: "4:5 portrait",
  });

  // Move to generating with resolved prompt + upload path.
  {
    const { error } = await args.supabaseUser
      .from("generations")
      .update({
        status: "generating",
        dog_photo_path: uploadPath,
        prompt_final: promptFinal,
        error: null,
      })
      .eq("id", args.generationId);
    if (error) throw new Error(error.message);
  }

  try {
    const result = await generateComposition({
      prompt: promptFinal,
      aspect: "4:5",
      referenceImageUrl,
    });

    const resultPath = makeGeneratedPath({
      userId: args.userId,
      generationId: args.generationId,
    });

    const { error: uploadErr } = await supabaseAdmin.storage.from("generated").upload(resultPath, result.buffer, {
      contentType: result.contentType,
      upsert: true,
    });
    if (uploadErr) throw new Error(uploadErr.message);

    const { error } = await args.supabaseUser
      .from("generations")
      .update({
        status: "succeeded",
        result_image_path: resultPath,
        image_width: result.width,
        image_height: result.height,
        error: null,
      })
      .eq("id", args.generationId);
    if (error) throw new Error(error.message);
  } catch (err) {
    const { error } = await args.supabaseUser
      .from("generations")
      .update({
        status: "failed",
        error: errorMessage(err),
      })
      .eq("id", args.generationId);
    if (error) throw new Error(error.message);
    throw err;
  }
}

function guessExt(file: File) {
  const name = file.name.toLowerCase();
  const fromName = name.split(".").pop();
  if (fromName && fromName.length <= 6) return fromName;
  const type = file.type.toLowerCase();
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  return "jpg";
}

async function callWithHardTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("HARD_TIMEOUT")), ms)),
  ]);
}

