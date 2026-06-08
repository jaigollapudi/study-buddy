import type { SourceDocument } from "@/lib/types";

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
