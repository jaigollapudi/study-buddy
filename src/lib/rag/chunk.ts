import { config } from "@/lib/config";
import type { ParsedPage } from "./parse";

export interface TextChunk {
  content: string;
  page: number | null;
  chunkIndex: number;
}

// Patterns that identify section/heading lines in school textbooks.
const HEADING_RE = /^(chapter\s+\d|unit\s+\d|\d+\.\d|\d+\s+[A-Z]|[A-Z][A-Z\s]{4,}$)/;

/** Returns true if a line looks like a heading/section title. */
function isHeading(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 120) return false;
  return HEADING_RE.test(t) || (t === t.toUpperCase() && t.replace(/\s/g, "").length >= 4);
}

/**
 * Semantic-boundary-aware splitting.
 * Priority: headings > paragraph breaks > sentences > hard size limit.
 * Smaller default (600 chars) keeps one concept per chunk.
 */
function splitBlock(
  raw: string,
  size = config.rag.chunkSize,
  overlap = config.rag.chunkOverlap,
): string[] {
  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!text) return [];
  if (text.length <= size) return [text];

  const pieces: string[] = [];

  // Split at heading boundaries first — keeps heading + its content together.
  const paragraphs = text.split(/\n\n+/);
  let buf = "";
  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    const firstLine = trimmed.split("\n")[0].trim();
    const startsHeading = isHeading(firstLine);

    // If this paragraph starts with a heading and buf is non-empty, flush.
    if (startsHeading && buf) {
      pieces.push(...splitAtSentences(buf.trim(), size, overlap));
      buf = "";
    }

    buf = buf ? `${buf}\n\n${trimmed}` : trimmed;

    // Flush if buffer is getting large (don't let it grow past 2× chunk size).
    if (buf.length >= size * 2) {
      pieces.push(...splitAtSentences(buf.trim(), size, overlap));
      buf = overlap > 0 ? lastChars(buf, overlap) : "";
    }
  }

  if (buf.trim()) {
    pieces.push(...splitAtSentences(buf.trim(), size, overlap));
  }

  return pieces.filter((p) => p.trim().length > 0);
}

function splitAtSentences(text: string, size: number, overlap: number): string[] {
  if (text.length <= size) return [text];

  const sentences = text.match(/[^.!?\n]+[.!?]?\s*/g) ?? [text];
  const pieces: string[] = [];
  let buf = "";

  for (const s of sentences) {
    if ((buf + s).length > size && buf) {
      pieces.push(buf.trim());
      buf = overlap > 0 ? lastChars(buf, overlap) : "";
    }
    buf += s;
    while (buf.length > size * 1.5) {
      pieces.push(buf.slice(0, size).trim());
      buf = buf.slice(size - overlap);
    }
  }
  if (buf.trim()) pieces.push(buf.trim());
  return pieces;
}

function lastChars(s: string, n: number): string {
  return s.length > n ? s.slice(-n) : s;
}

/**
 * Opening pages often contain chapter titles, headings, and activity boxes.
 * Split by paragraph so each heading/concept is its own retrievable chunk.
 */
function chunkOpeningPage(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  const size = config.rag.openingChunkSize;

  // One paragraph/line per chunk on opening pages.
  const units = normalized
    .split(/\n+/)
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 4);

  const pieces: string[] = [];
  let buf = "";
  for (const unit of units) {
    if (isHeading(unit) && buf) {
      pieces.push(buf.trim());
      buf = unit;
    } else if ((buf + "\n" + unit).length > size && buf) {
      pieces.push(buf.trim());
      buf = unit;
    } else {
      buf = buf ? `${buf}\n${unit}` : unit;
    }
  }
  if (buf.trim()) pieces.push(buf.trim());

  return pieces.length ? pieces : splitBlock(normalized, size, 60);
}

/**
 * Chunk parsed pages with page numbers for citations.
 * Page 1 uses fine-grained line splitting; other pages use heading-aware
 * semantic splitting at the configured chunk size.
 */
export function chunkPages(pages: ParsedPage[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;
  for (const { page, text } of pages) {
    if (!text?.trim()) continue;
    const pieces = page === 1 ? chunkOpeningPage(text) : splitBlock(text);
    for (const content of pieces) {
      chunks.push({ content, page, chunkIndex: index++ });
    }
  }
  return chunks;
}
