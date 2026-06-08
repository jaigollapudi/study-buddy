import { sql } from "./client";
import type { ArtifactMode, StudyArtifact } from "@/lib/types";

interface ArtifactRow {
  id: string;
  subject_id: string;
  mode: ArtifactMode;
  title: string;
  topic: string | null;
  payload: unknown;
  created_at: string;
  updated_at: string;
}

function parsePayload(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toArtifact(r: ArtifactRow): StudyArtifact {
  return {
    id: r.id,
    subjectId: r.subject_id,
    mode: r.mode,
    title: r.title,
    topic: r.topic,
    payload: parsePayload(r.payload),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listArtifacts(subjectId: string): Promise<StudyArtifact[]> {
  const rows = await sql<ArtifactRow[]>`
    select * from study_artifacts
    where subject_id = ${subjectId}
    order by updated_at desc
  `;
  return rows.map(toArtifact);
}

export async function createArtifact(input: {
  subjectId: string;
  mode: ArtifactMode;
  title: string;
  topic?: string | null;
  payload: unknown;
}): Promise<StudyArtifact> {
  const rows = await sql<ArtifactRow[]>`
    insert into study_artifacts (subject_id, mode, title, topic, payload)
    values (
      ${input.subjectId},
      ${input.mode},
      ${input.title},
      ${input.topic ?? null},
      ${JSON.stringify(input.payload)}::jsonb
    )
    returning *
  `;
  return toArtifact(rows[0]);
}

export async function deleteArtifact(id: string): Promise<void> {
  await sql`delete from study_artifacts where id = ${id}`;
}
