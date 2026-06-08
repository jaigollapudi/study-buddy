/** How the student is asking — drives retrieval strategy and reply style. */
export type QueryIntent = "catalog" | "tutor";

const CATALOG_PATTERNS = [
  /\b(chapters?|units?|lessons?|topics?)\b.*\b(name|called|title|list|what|which|how many)\b/i,
  /\b(what|which|name|list)\b.*\b(chapters?|units?|lessons?|topics?)\b/i,
  /\blist\b.*\b(chapters?|units?|documents?|textbooks?|files?)\b/i,
  /\btable of contents?\b/i,
  /\bhow many\b.*\b(chapters?|units?)\b/i,
  /\bwhat (?:books?|textbooks?|documents?|files?) (?:are there|do (?:we|you) have|(?:is|are) (?:uploaded|available))\b/i,
  /\b(?:all|every)\b.*\bchapters?\b/i,
  /\bchapters? (?:are )?called\b/i,
];

/** Detect questions about structure (chapter names, TOC) vs. content tutoring. */
export function detectQueryIntent(query: string): QueryIntent {
  const q = query.trim();
  if (!q) return "tutor";
  if (CATALOG_PATTERNS.some((re) => re.test(q))) return "catalog";
  return "tutor";
}
