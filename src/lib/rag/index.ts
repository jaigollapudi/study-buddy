import { nanoid } from "nanoid";
import { getTextProvider } from "@/lib/ai";
import { config } from "@/lib/config";
import type { RetrievedChunk, SourceDocument } from "@/lib/types";
import { chunkText } from "./chunk";
import { parseDocument } from "./parse";
import {
  addDocument,
  deleteDocument,
  listDocuments,
  searchChunks,
} from "./store";

/** Parse → chunk → embed → store an uploaded document. */
export async function ingestDocument(
  filename: string,
  bytes: ArrayBuffer,
): Promise<SourceDocument> {
  const { text, type } = await parseDocument(filename, bytes);
  if (!text.trim()) {
    throw new Error("No readable text found in that file.");
  }

  const chunks = chunkText(text);
  if (!chunks.length) throw new Error("Document produced no chunks.");

  const vectors = await getTextProvider().embed(chunks);

  const doc: SourceDocument = {
    id: nanoid(),
    name: filename,
    type,
    size: bytes.byteLength,
    chunkCount: chunks.length,
    createdAt: Date.now(),
  };

  await addDocument(
    doc,
    chunks.map((t, i) => ({ text: t, vector: vectors[i] })),
  );

  return doc;
}

/** Embed a query and retrieve the most relevant chunks. */
export async function retrieveContext(
  query: string,
  opts: { topK?: number; docIds?: string[] } = {},
): Promise<RetrievedChunk[]> {
  if (!query.trim()) return [];
  if ((await listDocuments()).length === 0) return [];
  const [vector] = await getTextProvider().embed([query]);
  return searchChunks(vector, opts.topK ?? config.rag.topK, opts.docIds);
}

export { listDocuments, deleteDocument };
