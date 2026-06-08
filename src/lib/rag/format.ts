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

/**
 * Pull short title-like lines from opening page text (CBSE PDFs often bury
 * the chapter title mid-page after intro paragraphs).
 */
export function extractLikelyChapterTitle(pageText: string): string | null {
  const lines = pageText
    .split(/\n+/)
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length >= 8 && l.length <= 100);

  for (const line of lines) {
    // "Exploring Mixtures and their Separation Chapter" or "Title: Subtitle"
    if (/^[A-Z][^.!?]{5,90}(?:\s+Chapter)?$/.test(line) && !/^Chapter\s/i.test(line)) {
      return line.replace(/\s+Chapter\s*$/i, "").trim();
    }
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,8}:\s*[A-Z]/.test(line)) {
      return line;
    }
  }

  // Titles buried mid-page, often immediately before a standalone "Chapter" line.
  const joined = lines.join(" ");
  const beforeChapter =
    joined.match(
      /([A-Z][a-z]+(?::\s*(?:The\s+)?(?:[A-Za-z]+\s+){1,8}[A-Za-z]+))\s+Chapter\b/,
    ) ??
    joined.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){2,8})\s+Chapter\b/);
  if (beforeChapter?.[1]) {
    return beforeChapter[1].replace(/\s+/g, " ").replace(/\s+Chapter\s*$/i, "").trim();
  }

  const colonMid = joined.match(
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,5})/,
  );
  return colonMid?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

/** Trim long excerpts to keep prompts bounded. */
export function truncateForContext(text: string, max = 1200): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}
