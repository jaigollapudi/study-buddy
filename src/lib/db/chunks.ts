import { config } from "@/lib/config";
import { sql, toVector } from "./client";
import type { RetrievedChunk } from "@/lib/types";

export interface ChunkInput {
  content: string;
  page: number | null;
  chunkIndex: number;
  embedding: number[];
}

/** Bulk-insert embedded chunks for a document inside one transaction. */
export async function insertChunks(
  documentId: string,
  subjectId: string,
  chunks: ChunkInput[],
): Promise<void> {
  if (!chunks.length) return;
  await sql.begin(async (tx) => {
    for (const c of chunks) {
      await tx`
        insert into chunks (document_id, subject_id, content, page, chunk_index, embedding)
        values (
          ${documentId}, ${subjectId}, ${c.content}, ${c.page},
          ${c.chunkIndex}, ${toVector(c.embedding)}::vector
        )
      `;
    }
  });
}

interface MatchRow {
  id: string;
  document_id: string;
  subject_id: string;
  content: string;
  page: number | null;
  chunk_index: number;
  similarity: number;
  document_name: string;
}

/** All chunks from page 1 of each document (up to maxPerDoc), for catalog queries. */
export async function getPageOneChunksPerDocument(
  subjectId: string,
  maxPerDoc = 8,
): Promise<RetrievedChunk[]> {
  const rows = await sql<MatchRow[]>`
    select * from (
      select
        c.id, c.document_id, c.subject_id, c.content, c.page, c.chunk_index,
        d.name as document_name,
        row_number() over (partition by c.document_id order by c.chunk_index) as rn
      from chunks c
      join documents d on d.id = c.document_id
      where c.subject_id = ${subjectId} and c.page = 1
    ) t
    where rn <= ${maxPerDoc}
    order by document_name asc, chunk_index asc
  `;
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    documentName: r.document_name,
    subjectId: r.subject_id,
    content: r.content,
    page: r.page,
    chunkIndex: r.chunk_index,
    score: 1,
  }));
}

/**
 * First N chunks from each document (by chunk_index). Used for chapter-list /
 * structure questions where we need one opening excerpt per uploaded file.
 */
export async function getLeadChunksPerDocument(
  subjectId: string,
  perDoc = 1,
): Promise<RetrievedChunk[]> {
  const rows = await sql<MatchRow[]>`
    select * from (
      select
        c.id, c.document_id, c.subject_id, c.content, c.page, c.chunk_index,
        d.name as document_name,
        row_number() over (partition by c.document_id order by c.chunk_index) as rn
      from chunks c
      join documents d on d.id = c.document_id
      where c.subject_id = ${subjectId}
    ) t
    where rn <= ${perDoc}
    order by document_name asc, chunk_index asc
  `;
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    documentName: r.document_name,
    subjectId: r.subject_id,
    content: r.content,
    page: r.page,
    chunkIndex: r.chunk_index,
    score: 1,
  }));
}

/**
 * Top-N most similar chunks **per document** — ensures broad questions reach
 * every uploaded file, not just the globally closest passages.
 */
export async function matchChunksPerDocument(
  embedding: number[],
  subjectId: string,
  perDoc: number,
): Promise<RetrievedChunk[]> {
  const rows = await sql<MatchRow[]>`
    select * from (
      select
        c.id, c.document_id, c.subject_id, c.content, c.page, c.chunk_index,
        d.name as document_name,
        1 - (c.embedding <=> ${toVector(embedding)}::vector) as similarity,
        row_number() over (
          partition by c.document_id
          order by c.embedding <=> ${toVector(embedding)}::vector
        ) as rn
      from chunks c
      join documents d on d.id = c.document_id
      where c.subject_id = ${subjectId}
    ) t
    where rn <= ${perDoc}
    order by similarity desc
  `;
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    documentName: r.document_name,
    subjectId: r.subject_id,
    content: r.content,
    page: r.page,
    chunkIndex: r.chunk_index,
    score: Number(r.similarity),
  }));
}

interface HybridRow {
  id: string;
  document_id: string;
  subject_id: string;
  content: string;
  page: number | null;
  chunk_index: number;
  score: number;
}

/**
 * Hybrid BM25 + vector search via Reciprocal Rank Fusion.
 * Falls back to pure vector if the query has no indexable keywords.
 */
export async function hybridSearch(
  embedding: number[],
  queryText: string,
  topK: number,
  subjectId?: string | null,
): Promise<RetrievedChunk[]> {
  const minSim = config.rag.minSimilarity;
  const rows = await sql<HybridRow[]>`
    select h.*, d.name as document_name
    from hybrid_chunks(
      ${toVector(embedding)}::vector,
      ${queryText},
      ${topK},
      ${subjectId ?? null},
      60,
      ${minSim}
    ) h
    join documents d on d.id = h.document_id
    order by h.score desc
  `;
  if (rows.length) {
    return rows.map((r) => ({
      id: r.id,
      documentId: r.document_id,
      documentName: (r as unknown as { document_name: string }).document_name,
      subjectId: r.subject_id,
      content: r.content,
      page: r.page,
      chunkIndex: r.chunk_index,
      score: Number(r.score),
    }));
  }
  // Keyword query returned nothing — fall back to pure vector.
  return matchChunks(embedding, topK, subjectId);
}

/** Vector similarity search, optionally scoped to a subject. */
export async function matchChunks(
  embedding: number[],
  topK: number,
  subjectId?: string | null,
): Promise<RetrievedChunk[]> {
  const minSim = config.rag.minSimilarity;
  const rows = await sql<MatchRow[]>`
    select m.*, d.name as document_name
    from match_chunks(${toVector(embedding)}::vector, ${topK}, ${subjectId ?? null}) m
    join documents d on d.id = m.document_id
    where m.similarity >= ${minSim}
    order by m.similarity desc
  `;
  return rows.map((r) => ({
    id: r.id,
    documentId: r.document_id,
    documentName: r.document_name,
    subjectId: r.subject_id,
    content: r.content,
    page: r.page,
    chunkIndex: r.chunk_index,
    score: Number(r.similarity),
  }));
}
