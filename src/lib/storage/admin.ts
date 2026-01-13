import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function normalizePath(bucket: "uploads" | "generated", path: string) {
  // Older versions of the app stored paths with a bucket prefix like "uploads/<uid>/..."
  // but Supabase Storage expects paths *inside* the bucket.
  const prefix = `${bucket}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}

export async function uploadPrivateObject(args: {
  bucket: "uploads" | "generated";
  path: string;
  data: Blob | ArrayBuffer | Uint8Array;
  contentType: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.storage
    .from(args.bucket)
    .upload(normalizePath(args.bucket, args.path), args.data, {
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
    .createSignedUrl(normalizePath(args.bucket, args.path), args.expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

