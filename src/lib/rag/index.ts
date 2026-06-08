import { getTextProvider } from "@/lib/ai";
import { config } from "@/lib/config";
import {
  getLeadChunksPerDocument,
  insertChunks,
  matchChunks,
  type ChunkInput,
} from "@/lib/db/chunks";
import { createDocument, finalizeDocument, listDocuments } from "@/lib/db/documents";
import type { RetrievedChunk, SourceDocument } from "@/lib/types";
import { chunkPages } from "./chunk";
import { isSupplementaryDocument } from "./catalog";
import { buildDocumentCatalog, formatChunkContent } from "./format";
import { detectQueryIntent, type QueryIntent } from "./intent";
import { parseDocument } from "./parse";

/** Embed an array of texts in batches to avoid overloading Ollama. */
async function embedBatched(texts: string[]): Promise<number[][]> {
  const provider = getTextProvider();
  const out: number[][] = [];
  const batch = config.rag.embedBatchSize;
  for (let i = 0; i < texts.length; i += batch) {
    const slice = texts.slice(i, i + batch);
    out.push(...(await provider.embed(slice)));
  }
  return out;
}

/**
 * Parse → chunk → embed → persist a textbook for a subject. The document row is
 * created immediately (status "processing") and finalized when chunks land.
 */
export async function ingestDocument(
  subjectId: string,
  filename: string,
  bytes: ArrayBuffer,
): Promise<SourceDocument> {
  const { pages, type, pageCount } = await parseDocument(filename, bytes);
  const chunks = chunkPages(pages);
  if (!chunks.length) throw new Error("No readable text found in that file.");

  const doc = await createDocument({
    subjectId,
    name: filename,
    type,
    size: bytes.byteLength,
    pageCount,
    status: "processing",
  });

  try {
    const stored = chunks.map((c) =>
      formatChunkContent(filename, c.page, c.content),
    );
    const vectors = await embedBatched(stored);
    const rows: ChunkInput[] = chunks.map((c, i) => ({
      content: stored[i],
      page: c.page,
      chunkIndex: c.chunkIndex,
      embedding: vectors[i],
    }));
    await insertChunks(doc.id, subjectId, rows);
    await finalizeDocument(doc.id, {
      status: "ready",
      chunkCount: rows.length,
      pageCount,
    });
    return { ...doc, status: "ready", chunkCount: rows.length };
  } catch (err) {
    await finalizeDocument(doc.id, {
      status: "error",
      error: err instanceof Error ? err.message : "Ingestion failed.",
    });
    throw err;
  }
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  intent: QueryIntent;
  catalog: string;
}

/** Embed a query and retrieve chunks using intent-aware strategy. */
export async function retrieveContext(
  query: string,
  opts: { subjectId?: string | null; topK?: number } = {},
): Promise<RetrievalResult> {
  const intent = detectQueryIntent(query);
  const subjectId = opts.subjectId ?? null;

  const docs = subjectId
    ? (await listDocuments(subjectId)).filter((d) => d.status === "ready")
    : [];
  const catalog = buildDocumentCatalog(docs);

  if (!query.trim()) {
    return { chunks: [], intent, catalog };
  }

  // Structure questions: one opening excerpt per uploaded chapter file beats
  // global vector search across thousands of body-text chunks.
  if (intent === "catalog" && subjectId && docs.length) {
    const lead = (await getLeadChunksPerDocument(subjectId, 1)).filter(
      (c) => !isSupplementaryDocument(c.documentName),
    );
    return { chunks: lead, intent, catalog };
  }

  const [vector] = await getTextProvider().embed([query]);
  const topK = opts.topK ?? (intent === "catalog" ? 12 : config.rag.topK);
  const chunks = await matchChunks(vector, topK, subjectId);
  return { chunks, intent, catalog };
}
