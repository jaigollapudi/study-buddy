import { getLeadChunksPerDocument } from "@/lib/db/chunks";
import { listDocuments } from "@/lib/db/documents";
import type { Citation, RetrievedChunk, SourceDocument } from "@/lib/types";

function prettyDocName(name: string): string {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

/** Preface, syllabus, answer keys — not numbered chapters. */
export function isSupplementaryDocument(name: string): boolean {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase();
  if (/ps$/.test(base)) return true; // e.g. iesc1ps
  return /(preface|foreword|syllabus|appendix|answer|teacher|guide|contents|index)/.test(
    base,
  );
}

/** NCERT-style codes: iesc101 → ch.1, iesc113 → ch.13 */
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

/** Pull a human-readable chapter title from the first page excerpt. */
export function extractChapterTitle(content: string, filename: string): string {
  const text = content.replace(/^Textbook:.*\n/i, "").trim();

  const labeled = text.match(
    /chapter\s*\d+\s*[:\.\-–—]?\s*([^\n]{4,120})/i,
  );
  if (labeled?.[1]) return cleanTitle(labeled[1]);

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= 6 && l.length <= 140);

  for (const line of lines.slice(0, 12)) {
    if (/^(unit|chapter)\s*\d+\s*$/i.test(line)) continue;
    if (/ncert|cbse|textbook|class\s*(ix|9|nine)/i.test(line) && line.length < 50)
      continue;
    if (/^\d+$/.test(line)) continue;
    if (/^page\s*\d/i.test(line)) continue;
    if (/©|isbn|all rights/i.test(line)) continue;
    return cleanTitle(line);
  }

  return prettyDocName(filename);
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/^[\d.\s]+/, "")
    .replace(/[:\-–—]+$/, "")
    .trim();
}

export interface ChapterListResult {
  content: string;
  citations: Citation[];
}

/**
 * Build a deterministic chapter list (no LLM) when we have one PDF per chapter.
 * Returns null if there are no chapter documents to list.
 */
export async function tryBuildChapterList(
  subjectId: string,
): Promise<ChapterListResult | null> {
  const docs = (await listDocuments(subjectId)).filter((d) => d.status === "ready");
  const chapters = sortChapterDocuments(
    docs.filter((d) => !isSupplementaryDocument(d.name)),
  );
  if (!chapters.length) return null;

  const leadChunks = await getLeadChunksPerDocument(subjectId, 1);
  const leadByDoc = new Map(leadChunks.map((c) => [c.documentId, c]));

  const entries = chapters.map((doc, i) => {
    const lead = leadByDoc.get(doc.id);
    const title = lead
      ? extractChapterTitle(lead.content, doc.name)
      : prettyDocName(doc.name);
    return { index: i + 1, title, lead };
  });

  const lines = entries.map((e) => `${e.index}. **${e.title}**`);
  let content = `Here are the **${entries.length} chapters** in your textbook:\n\n${lines.join("\n")}`;

  const supplementary = docs.filter((d) => isSupplementaryDocument(d.name));
  if (supplementary.length) {
    const names = supplementary.map((d) => prettyDocName(d.name)).join(", ");
    content += `\n\n_Additional files uploaded (not counted as chapters): ${names}._`;
  }

  const citations: Citation[] = entries
    .filter((e): e is typeof e & { lead: RetrievedChunk } => !!e.lead)
    .map((e) => ({
      documentId: e.lead.documentId,
      documentName: e.lead.documentName,
      page: e.lead.page,
      chunkIndex: e.lead.chunkIndex,
      score: 1,
    }));

  return { content, citations };
}
