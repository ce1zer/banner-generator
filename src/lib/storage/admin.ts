import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function uploadPrivateObject(args: {
  bucket: "uploads" | "generated";
  path: string;
  data: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage.from(args.bucket).upload(args.path, args.data, {
    contentType: args.contentType,
    upsert: true,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
}

export async function createSignedUrl(args: {
  bucket: "uploads" | "generated";
  path: string;
  expiresInSeconds: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(args.bucket)
    .createSignedUrl(args.path, args.expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

