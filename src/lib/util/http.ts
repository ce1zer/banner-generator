export function errorMessage(err: unknown) {
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export function isUnauthenticated(err: unknown) {
  return err instanceof Error && err.message === "UNAUTHENTICATED";
}

export function isForbidden(err: unknown) {
  return err instanceof Error && err.message === "FORBIDDEN";
}

