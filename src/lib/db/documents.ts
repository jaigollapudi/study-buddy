import { sql } from "./client";
import type { DocumentStatus, SourceDocument } from "@/lib/types";

interface DocRow {
  id: string;
  subject_id: string;
  name: string;
  type: string;
  size: string | number;
  page_count: number | null;
  chunk_count: number;
  status: DocumentStatus;
  error: string | null;
  created_at: string;
}

function toDoc(r: DocRow): SourceDocument {
  return {
    id: r.id,
    subjectId: r.subject_id,
    name: r.name,
    type: r.type,
    size: Number(r.size),
    pageCount: r.page_count,
    chunkCount: Number(r.chunk_count),
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
  };
}

export async function listDocuments(subjectId?: string): Promise<SourceDocument[]> {
  const rows = await sql<DocRow[]>`
    select * from documents
    ${subjectId ? sql`where subject_id = ${subjectId}` : sql``}
    order by created_at desc
  `;
  return rows.map(toDoc);
}

export async function createDocument(input: {
  subjectId: string;
  name: string;
  type: string;
  size: number;
  pageCount?: number | null;
  status?: DocumentStatus;
}): Promise<SourceDocument> {
  const rows = await sql<DocRow[]>`
    insert into documents (subject_id, name, type, size, page_count, status)
    values (
      ${input.subjectId}, ${input.name}, ${input.type}, ${input.size},
      ${input.pageCount ?? null}, ${input.status ?? "processing"}
    )
    returning *
  `;
  return toDoc(rows[0]);
}

export async function finalizeDocument(
  id: string,
  patch: { status: DocumentStatus; chunkCount?: number; pageCount?: number | null; error?: string | null },
): Promise<void> {
  await sql`
    update documents set
      status      = ${patch.status},
      chunk_count = coalesce(${patch.chunkCount ?? null}, chunk_count),
      page_count  = ${patch.pageCount !== undefined ? patch.pageCount : sql`page_count`},
      error       = ${patch.error ?? null}
    where id = ${id}
  `;
}

export async function deleteDocument(id: string): Promise<void> {
  await sql`delete from documents where id = ${id}`;
}
