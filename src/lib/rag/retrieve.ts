import { getTextProvider } from "@/lib/ai";
import { config } from "@/lib/config";
import {
  hybridSearch,
  matchChunks,
  matchChunksPerDocument,
} from "@/lib/db/chunks";
import { listDocuments } from "@/lib/db/documents";
import type { RetrievedChunk } from "@/lib/types";
import { detectQueryBreadth } from "./intent";

export interface RetrievalDebugInfo {
  query: string;
  breadth: "broad" | "focused";
  strategy: "hybrid" | "vector" | "per-doc-merge";
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

function dedupeById(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  return chunks.filter((c) => !seen.has(c.id) && seen.add(c.id));
}

function rankAndCap(chunks: RetrievedChunk[], max: number): RetrievedChunk[] {
  return [...chunks].sort((a, b) => b.score - a.score).slice(0, max);
}

/**
 * Retrieve relevant passages with hybrid BM25+vector search.
 * Broad queries (e.g. "list chapters", "what topics are covered") additionally
 * run a per-document pass so all uploaded files contribute at least one chunk.
 */
export async function retrieveContext(
  query: string,
  opts: { subjectId?: string | null; topK?: number } = {},
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];

  const subjectId = opts.subjectId ?? null;
  const [vector] = await getTextProvider().embed([query]);
  const breadth = detectQueryBreadth(query);
  const candidateK = opts.topK ?? config.rag.topK;
  const finalK = config.rag.maxContextChunks;

  const readyDocs = subjectId
    ? (await listDocuments(subjectId)).filter((d) => d.status === "ready")
    : [];
  const docCount = readyDocs.length;

  let chunks: RetrievedChunk[];
  let strategy: RetrievalDebugInfo["strategy"];

  if (subjectId && docCount > 1 && breadth === "broad") {
    // For "what chapters exist" style questions, pull best chunk from every doc
    // then merge with the global hybrid results.
    const [perDoc, hybrid] = await Promise.all([
      matchChunksPerDocument(vector, subjectId, config.rag.perDocTopK),
      hybridSearch(vector, query, candidateK, subjectId),
    ]);
    chunks = rankAndCap(dedupeById([...perDoc, ...hybrid]), finalK);
    strategy = "per-doc-merge";
  } else {
    // Hybrid for all other questions.
    chunks = await hybridSearch(vector, query, finalK, subjectId);
    strategy = "hybrid";
    if (!chunks.length) {
      chunks = rankAndCap(await matchChunks(vector, finalK, subjectId), finalK);
      strategy = "vector";
    }
  }

  lastDebug = {
    query,
    breadth,
    strategy,
    candidateCount: candidateK,
    finalCount: chunks.length,
    chunks: chunks.map((c) => ({
      id: c.id,
      documentName: c.documentName,
      page: c.page,
      score: Math.round(c.score * 10000) / 10000,
      contentSnippet: c.content.slice(0, 200).replace(/\n/g, " "),
    })),
  };

  return chunks;
}
