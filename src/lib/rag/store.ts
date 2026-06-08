import path from "node:path";
import * as lancedb from "@lancedb/lancedb";
import { config } from "@/lib/config";
import type { RetrievedChunk, SourceDocument } from "@/lib/types";

const DOCS_TABLE = "documents";
const CHUNKS_TABLE = "chunks";

interface ChunkRow {
  id: string;
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  vector: number[];
}

interface DocRow {
  id: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  createdAt: number;
}

let dbPromise: Promise<lancedb.Connection> | null = null;

function getDb(): Promise<lancedb.Connection> {
  if (!dbPromise) {
    const dir = path.isAbsolute(config.rag.dbPath)
      ? config.rag.dbPath
      : path.join(process.cwd(), config.rag.dbPath);
    dbPromise = lancedb.connect(dir);
  }
  return dbPromise;
}

async function hasTable(name: string): Promise<boolean> {
  const db = await getDb();
  return (await db.tableNames()).includes(name);
}

/** Persist document metadata + its embedded chunks. */
export async function addDocument(
  doc: SourceDocument,
  chunks: { text: string; vector: number[] }[],
): Promise<void> {
  const db = await getDb();

  const chunkRows: ChunkRow[] = chunks.map((c, i) => ({
    id: `${doc.id}:${i}`,
    docId: doc.id,
    docName: doc.name,
    chunkIndex: i,
    text: c.text,
    vector: c.vector,
  }));

  const chunkData = chunkRows as unknown as Record<string, unknown>[];
  if (await hasTable(CHUNKS_TABLE)) {
    await (await db.openTable(CHUNKS_TABLE)).add(chunkData);
  } else if (chunkData.length) {
    await db.createTable(CHUNKS_TABLE, chunkData);
  }

  const docRow: DocRow = {
    id: doc.id,
    name: doc.name,
    type: doc.type,
    size: doc.size,
    chunkCount: doc.chunkCount,
    createdAt: doc.createdAt,
  };

  const docData = [docRow] as unknown as Record<string, unknown>[];
  if (await hasTable(DOCS_TABLE)) {
    await (await db.openTable(DOCS_TABLE)).add(docData);
  } else {
    await db.createTable(DOCS_TABLE, docData);
  }
}

export async function listDocuments(): Promise<SourceDocument[]> {
  if (!(await hasTable(DOCS_TABLE))) return [];
  const db = await getDb();
  const table = await db.openTable(DOCS_TABLE);
  const rows = (await table.query().toArray()) as unknown as DocRow[];
  return rows
    .map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      size: Number(r.size),
      chunkCount: Number(r.chunkCount),
      createdAt: Number(r.createdAt),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDocument(docId: string): Promise<void> {
  const db = await getDb();
  const safe = docId.replace(/'/g, "''");
  if (await hasTable(CHUNKS_TABLE)) {
    await (await db.openTable(CHUNKS_TABLE)).delete(`docId = '${safe}'`);
  }
  if (await hasTable(DOCS_TABLE)) {
    await (await db.openTable(DOCS_TABLE)).delete(`id = '${safe}'`);
  }
}

/** Vector search over chunks, optionally restricted to specific documents. */
export async function searchChunks(
  vector: number[],
  topK: number,
  docIds?: string[],
): Promise<RetrievedChunk[]> {
  if (!(await hasTable(CHUNKS_TABLE))) return [];
  const db = await getDb();
  const table = await db.openTable(CHUNKS_TABLE);

  let q = table.search(vector).limit(topK);
  if (docIds && docIds.length) {
    const list = docIds.map((d) => `'${d.replace(/'/g, "''")}'`).join(", ");
    q = q.where(`docId IN (${list})`);
  }

  const rows = (await q.toArray()) as unknown as (ChunkRow & {
    _distance: number;
  })[];

  return rows.map((r) => ({
    docId: r.docId,
    docName: r.docName,
    chunkIndex: Number(r.chunkIndex),
    text: r.text,
    // Convert L2 distance to a friendly similarity-ish score.
    score: 1 / (1 + Number(r._distance)),
  }));
}
