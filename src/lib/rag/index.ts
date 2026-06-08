import { getTextProvider } from "@/lib/ai";
import { config } from "@/lib/config";
import { insertChunks, type ChunkInput } from "@/lib/db/chunks";
import { createDocument, finalizeDocument } from "@/lib/db/documents";
import type { SourceDocument } from "@/lib/types";
import { chunkPages } from "./chunk";
import { formatChunkContent } from "./format";
import { parseDocument } from "./parse";
export { retrieveContext } from "./retrieve";

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
 * Parse → chunk → embed → persist. No separate metadata layer — the chunks
 * themselves are what the AI searches and reads.
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
