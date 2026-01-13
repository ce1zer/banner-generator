export function makeUploadPath(args: {
  userId: string;
  objectId: string;
  ext: string;
}) {
  const safeExt = args.ext.startsWith(".") ? args.ext.slice(1) : args.ext;
  // Bucket: "uploads" (private). Path is inside the bucket.
  return `${args.userId}/${args.objectId}.${safeExt}`;
}

export function makeGeneratedPath(args: { userId: string; generationId: string }) {
  // Bucket: "generated" (private). Path is inside the bucket.
  return `${args.userId}/${args.generationId}.png`;
}

