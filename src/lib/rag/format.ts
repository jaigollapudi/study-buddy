import type { SourceDocument } from "@/lib/types";
import {
  chapterNumberFromFilename,
  isSupplementaryDocument,
  sortChapterDocuments,
} from "./catalog";

/** Strip a file extension for display. */
export function prettyDocName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

/** Prefix stored in each chunk so embeddings carry document + page context. */
export function formatChunkContent(
  documentName: string,
  page: number | null,
  text: string,
): string {
  const label = prettyDocName(documentName);
  const pagePart = page != null ? `, page ${page}` : "";
  return `Textbook: ${label}${pagePart}\n${text.trim()}`;
}

/** Short catalog block — chapter files only, in chapter order. */
export function buildDocumentCatalog(docs: SourceDocument[]): string {
  const chapters = sortChapterDocuments(
    docs.filter((d) => !isSupplementaryDocument(d.name)),
  );
  if (!chapters.length) return "";
  return chapters
    .map((d) => {
      const num = chapterNumberFromFilename(d.name);
      const label = prettyDocName(d.name);
      const pages = d.pageCount != null ? `${d.pageCount} pp` : "? pp";
      const prefix = num != null ? `Ch.${num}` : "Ch.?";
      return `${prefix} — ${label} (${pages})`;
    })
    .join("\n");
}

/** Trim long opening excerpts so catalog-style prompts stay fast. */
export function truncateForContext(text: string, max = 700): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}
