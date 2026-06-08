import { getTextProvider } from "@/lib/ai";
import { config } from "@/lib/config";
import {
  getPageOneChunksPerDocument,
  hybridSearch,
  matchChunks,
} from "@/lib/db/chunks";
import { listDocuments } from "@/lib/db/documents";
import type { RetrievedChunk } from "@/lib/types";
import { sortCatalogChunks } from "./catalog-utils";
import { extractLikelyChapterTitle } from "./format";
import { detectQueryBreadth } from "./intent";

export interface RetrievalDebugInfo {
  query: string;
  breadth: "broad" | "focused";
  strategy: "catalog-openings" | "hybrid" | "vector";
  candidateCount: number;
  finalCount: number;
  chunks: Array<{
    id: string;
    documentName: string;
    page: number | null;
    score: number;
    contentSnippet: string;
  }>;
}

let lastDebug: RetrievalDebugInfo | null = null;
export function getLastRetrievalDebug() {
  return lastDebug;
}

function rankAndCap(chunks: RetrievedChunk[], max: number): RetrievedChunk[] {
  return [...chunks].sort((a, b) => b.score - a.score).slice(0, max);
}

function recordDebug(
  query: string,
  breadth: "broad" | "focused",
  strategy: RetrievalDebugInfo["strategy"],
  candidateCount: number,
  chunks: RetrievedChunk[],
) {
  lastDebug = {
    query,
    breadth,
    strategy,
    candidateCount,
    finalCount: chunks.length,
    chunks: chunks.map((c) => ({
      id: c.id,
      documentName: c.documentName,
      page: c.page,
      score: Math.round(c.score * 10000) / 10000,
      contentSnippet: c.content.slice(0, 200).replace(/\n/g, " "),
    })),
  };
}

/**
 * Catalog queries ("what chapters", "list topics") cannot rely on vector
 * similarity — the query embedding matches random body text that mentions
 * "chapter" on page 7+, not the title on page 1. Instead we deterministically
 * fetch the first N chunks from every uploaded file.
 */
/** Strip the `[filename, page N]` prefix stored in embedded chunk text. */
function stripChunkPrefix(text: string): string {
  return text.replace(/^\[[^\]]+\]\s*/i, "").trim();
}

/**
 * Merge all page-1 chunks per file into one excerpt so buried titles
 * (e.g. mid-page on CBSE PDFs) are visible to the LLM.
 */
async function retrieveCatalogOpenings(
  subjectId: string,
): Promise<RetrievedChunk[]> {
  const pageChunks = await getPageOneChunksPerDocument(
    subjectId,
    config.rag.catalogChunksPerDoc,
  );
  const sorted = sortCatalogChunks(pageChunks);

  const byDoc = new Map<string, RetrievedChunk[]>();
  for (const c of sorted) {
    const list = byDoc.get(c.documentId) ?? [];
    list.push(c);
    byDoc.set(c.documentId, list);
  }

  const merged: RetrievedChunk[] = [];
  for (const [, chunks] of byDoc) {
    const first = chunks[0];
    const body = chunks.map((c) => stripChunkPrefix(c.content)).join("\n");
    const title = extractLikelyChapterTitle(body);
    const label = first.page
      ? `${first.documentName.replace(/\.[^.]+$/, "")}, page ${first.page}`
      : first.documentName;
    const header = title ? `Chapter title: ${title}\n\n` : "";
    merged.push({
      ...first,
      content: `[${label}]\n${header}${body.slice(0, 2000)}`,
      score: 1,
    });
  }

  return merged.slice(0, config.rag.maxCatalogChunks);
}

/**
 * Retrieve relevant passages with hybrid BM25+vector search for focused
 * questions, and deterministic opening-chunk retrieval for catalog questions.
 */
export async function retrieveContext(
  query: string,
  opts: { subjectId?: string | null; topK?: number } = {},
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];

  const subjectId = opts.subjectId ?? null;
  const breadth = detectQueryBreadth(query);
  const candidateK = opts.topK ?? config.rag.topK;
  const finalK = config.rag.maxContextChunks;

  if (subjectId && breadth === "broad") {
    const readyDocs = (await listDocuments(subjectId)).filter((d) => d.status === "ready");
    if (readyDocs.length > 1) {
      const chunks = await retrieveCatalogOpenings(subjectId);
      recordDebug(query, breadth, "catalog-openings", readyDocs.length, chunks);
      return chunks;
    }
  }

  const [vector] = await getTextProvider().embed([query]);
  let chunks = await hybridSearch(vector, query, finalK, subjectId);
  let strategy: RetrievalDebugInfo["strategy"] = "hybrid";

  if (!chunks.length) {
    chunks = rankAndCap(await matchChunks(vector, finalK, subjectId), finalK);
    strategy = "vector";
  }

  recordDebug(query, breadth, strategy, candidateK, chunks);
  return chunks;
}
