import { sql } from "./client";
import type { Subject } from "@/lib/types";

interface SubjectRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  grade: string | null;
  board: string | null;
  is_allowed: boolean;
  created_at: string;
  document_count?: string;
  chunk_count?: string;
}

function toSubject(r: SubjectRow): Subject {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    color: r.color,
    grade: r.grade,
    board: r.board,
    isAllowed: r.is_allowed,
    createdAt: r.created_at,
    documentCount: r.document_count != null ? Number(r.document_count) : undefined,
    chunkCount: r.chunk_count != null ? Number(r.chunk_count) : undefined,
  };
}

export async function listSubjects(opts: { onlyAllowed?: boolean } = {}): Promise<Subject[]> {
  const rows = await sql<SubjectRow[]>`
    select s.*,
      (select count(*) from documents d where d.subject_id = s.id) as document_count,
      (select count(*) from chunks c where c.subject_id = s.id) as chunk_count
    from subjects s
    ${opts.onlyAllowed ? sql`where s.is_allowed = true` : sql``}
    order by s.name asc
  `;
  return rows.map(toSubject);
}

export async function getSubject(id: string): Promise<Subject | null> {
  const rows = await sql<SubjectRow[]>`select * from subjects where id = ${id}`;
  return rows[0] ? toSubject(rows[0]) : null;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createSubject(input: {
  name: string;
  description?: string | null;
  color?: string;
  grade?: string | null;
  board?: string | null;
}): Promise<Subject> {
  const base = slugify(input.name) || "subject";
  // Ensure unique slug.
  const existing = await sql<{ slug: string }[]>`
    select slug from subjects where slug like ${base + "%"}
  `;
  const taken = new Set(existing.map((e) => e.slug));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) slug = `${base}-${n++}`;

  const rows = await sql<SubjectRow[]>`
    insert into subjects (name, slug, description, color, grade, board)
    values (
      ${input.name}, ${slug}, ${input.description ?? null},
      ${input.color ?? "#006BFF"}, ${input.grade ?? null}, ${input.board ?? null}
    )
    returning *
  `;
  return toSubject(rows[0]);
}

export async function updateSubject(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    color: string;
    grade: string | null;
    board: string | null;
    isAllowed: boolean;
  }>,
): Promise<Subject | null> {
  const rows = await sql<SubjectRow[]>`
    update subjects set
      name        = coalesce(${patch.name ?? null}, name),
      description = ${patch.description !== undefined ? patch.description : sql`description`},
      color       = coalesce(${patch.color ?? null}, color),
      grade       = ${patch.grade !== undefined ? patch.grade : sql`grade`},
      board       = ${patch.board !== undefined ? patch.board : sql`board`},
      is_allowed  = coalesce(${patch.isAllowed ?? null}, is_allowed)
    where id = ${id}
    returning *
  `;
  return rows[0] ? toSubject(rows[0]) : null;
}

export async function deleteSubject(id: string): Promise<void> {
  await sql`delete from subjects where id = ${id}`;
}
