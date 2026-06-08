/** Broad queries need chunks from many documents, not just global top-K. */
export type QueryBreadth = "broad" | "focused";

const BROAD_PATTERNS = [
  /\b(chapters?|units?|lessons?|topics?)\b.*\b(name|called|title|list|what|which|how many|cover|there)\b/i,
  /\b(what|which|name|list)\b.*\b(chapters?|units?|lessons?|topics?)\b/i,
  /\bwhat\s+chapters?\s+(?:are\s+)?there\b/i,
  /\blist\b.*\b(chapters?|units?|documents?|textbooks?|files?|topics?)\b/i,
  /\btable of contents?\b/i,
  /\bhow many\b.*\b(chapters?|units?)\b/i,
  /\bwhat (?:is|are) (?:covered|taught|in the)\b/i,
  /\b(?:all|every)\b.*\bchapters?\b/i,
];

export function detectQueryBreadth(query: string): QueryBreadth {
  const q = query.trim();
  if (!q) return "focused";
  if (BROAD_PATTERNS.some((re) => re.test(q))) return "broad";
  return "focused";
}

/** @deprecated Use detectQueryBreadth — kept for prompt style only. */
export type QueryIntent = "catalog" | "tutor";
export function detectQueryIntent(query: string): QueryIntent {
  return detectQueryBreadth(query) === "broad" ? "catalog" : "tutor";
}
