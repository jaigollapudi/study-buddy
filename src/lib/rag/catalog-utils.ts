import type { RetrievedChunk, SourceDocument } from "@/lib/types";

/** Preface, syllabus, teacher guides — not counted as chapters. */
export function isSupplementaryDocument(name: string): boolean {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase();
  return /^(syllabus|preface|frontmatter|toc|index|appendix)/.test(base)
    || /1ps$/.test(base)   // e.g. iesc1ps = preface/syllabus PDF
    || /_ps$/.test(base);
}

/** Sort uploaded files by numeric chapter code when present (e.g. iesc101 → 1). */
export function chapterNumberFromFilename(name: string): number | null {
  const m = name.match(/(\d{2,3})/);
  if (!m) return null;
  const n = Number(m[1]);
  if (n >= 100) return n - 100;
  return n;
}

export function sortChapterDocuments(docs: SourceDocument[]): SourceDocument[] {
  return [...docs].sort((a, b) => {
    const na = chapterNumberFromFilename(a.name) ?? 999;
    const nb = chapterNumberFromFilename(b.name) ?? 999;
    if (na !== nb) return na - nb;
    return a.name.localeCompare(b.name);
  });
}

/** Sort retrieved opening chunks in chapter order; drop supplementary files. */
export function sortCatalogChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  return chunks
    .filter((c) => !isSupplementaryDocument(c.documentName))
    .sort((a, b) => {
      const na = chapterNumberFromFilename(a.documentName) ?? 999;
      const nb = chapterNumberFromFilename(b.documentName) ?? 999;
      if (na !== nb) return na - nb;
      return a.documentName.localeCompare(b.documentName);
    });
}
