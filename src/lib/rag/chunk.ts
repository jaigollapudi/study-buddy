import { config } from "@/lib/config";
import type { ParsedPage } from "./parse";

export interface TextChunk {
  content: string;
  page: number | null;
  chunkIndex: number;
}

/** Split a single block of text into overlapping, sentence-aware pieces. */
function splitBlock(
  raw: string,
  size = config.rag.chunkSize,
  overlap = config.rag.chunkOverlap,
): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) return [];
  if (text.length <= size) return [text];

  const sentences = text.match(/[^.!?\n]+[.!?]?\s*/g) ?? [text];
  const pieces: string[] = [];
  let buf = "";
  for (const s of sentences) {
    if ((buf + s).length > size && buf) {
      pieces.push(buf.trim());
      buf = overlap > 0 ? buf.slice(-overlap) : "";
    }
    buf += s;
    while (buf.length > size * 1.5) {
      pieces.push(buf.slice(0, size).trim());
      buf = buf.slice(size - overlap);
    }
  }
  if (buf.trim()) pieces.push(buf.trim());
  return pieces.filter(Boolean);
}

/**
 * Chunk parsed pages, attaching the originating page number to each chunk so we
 * can cite "Textbook X, p. N". Empty/whitespace pages are skipped.
 */
export function chunkPages(pages: ParsedPage[]): TextChunk[] {
  const chunks: TextChunk[] = [];
  let index = 0;
  for (const { page, text } of pages) {
    if (!text || !text.trim()) continue;
    for (const piece of splitBlock(text)) {
      chunks.push({ content: piece, page, chunkIndex: index++ });
    }
  }
  return chunks;
}
