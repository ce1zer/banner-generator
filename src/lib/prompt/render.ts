const DEFAULT_STYLE =
  "cinematic, gritty, high-end, clean composition, symmetrical balance, space reserved for typography overlay later, no text";

export function renderPromptTemplate(args: {
  template: string;
  themeName: string;
  themeSlug: string;
  aspect?: string;
  style?: string;
}) {
  const aspect = args.aspect ?? "4:5 portrait";
  const style = args.style ?? DEFAULT_STYLE;

  // Hard-enforce "no text" guidance even if a template forgets it.
  const hardNoText =
    "Absolutely no text, no typography, no letters, no logos, no watermarks, no signage.";

  const rendered = args.template
    .replaceAll("{{ASPECT}}", aspect)
    .replaceAll("{{STYLE}}", style)
    .replaceAll("{{THEME_NAME}}", args.themeName)
    .replaceAll("{{THEME_SLUG}}", args.themeSlug);

  if (rendered.toLowerCase().includes("no text")) return rendered;
  return `${rendered}\n\n${hardNoText}\n`;
}

