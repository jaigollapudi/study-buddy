/** Strip a file extension for display. */
export function prettyDocName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

/**
 * Prefix embedded/stored chunk text with source location. The LLM answers from
 * the content below the header — not from metadata we maintain separately.
 */
export function formatChunkContent(
  documentName: string,
  page: number | null,
  text: string,
): string {
  const label = prettyDocName(documentName);
  const loc = page != null ? `${label}, page ${page}` : label;
  return `[${loc}]\n${text.trim()}`;
}

/** Trim long excerpts to keep prompts bounded. */
export function truncateForContext(text: string, max = 1200): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}
