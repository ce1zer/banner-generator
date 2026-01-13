export function makeUploadPath(args: {
  userId: string;
  objectId: string;
  ext: string;
}) {
  const safeExt = args.ext.startsWith(".") ? args.ext.slice(1) : args.ext;
  return `uploads/${args.userId}/${args.objectId}.${safeExt}`;
}

export function makeGeneratedPath(args: { userId: string; generationId: string }) {
  return `generated/${args.userId}/${args.generationId}.png`;
}

