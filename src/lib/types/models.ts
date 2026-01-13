export type ThemeListItem = {
  id: string;
  name: string;
  slug: string;
};

export type GenerationStatus =
  | "draft"
  | "queued"
  | "generating"
  | "succeeded"
  | "failed";

export type GenerationInput = {
  title?: string;
  subtitle?: string;
  contact?: string;
};

