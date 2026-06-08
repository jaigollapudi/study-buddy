import { sql } from "./client";
import type { Citation, ChatSession, StoredMessage } from "@/lib/types";

interface SessionRow {
  id: string;
  subject_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
}

function toSession(r: SessionRow): ChatSession {
  return {
    id: r.id,
    subjectId: r.subject_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function listSessions(subjectId?: string): Promise<ChatSession[]> {
  const rows = await sql<SessionRow[]>`
    select * from chat_sessions
    ${subjectId ? sql`where subject_id = ${subjectId}` : sql``}
    order by updated_at desc
  `;
  return rows.map(toSession);
}

export async function createSession(input: {
  subjectId: string | null;
  title?: string;
}): Promise<ChatSession> {
  const rows = await sql<SessionRow[]>`
    insert into chat_sessions (subject_id, title)
    values (${input.subjectId}, ${input.title ?? "New chat"})
    returning *
  `;
  return toSession(rows[0]);
}

export async function getSession(id: string): Promise<ChatSession | null> {
  const rows = await sql<SessionRow[]>`select * from chat_sessions where id = ${id}`;
  return rows[0] ? toSession(rows[0]) : null;
}

export async function renameSession(id: string, title: string): Promise<void> {
  await sql`update chat_sessions set title = ${title}, updated_at = now() where id = ${id}`;
}

export async function deleteSession(id: string): Promise<void> {
  await sql`delete from chat_sessions where id = ${id}`;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

function parseCitations(raw: unknown): Citation[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as Citation[];
  // postgres.js can return JSONB as a raw string in some edge cases.
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Citation[]) : null;
    } catch {
      return null;
    }
  }
  return null;
}

function toMessage(r: MessageRow): StoredMessage {
  return {
    id: r.id,
    sessionId: r.session_id,
    role: r.role,
    content: r.content,
    citations: parseCitations(r.citations),
    createdAt: r.created_at,
  };
}

export async function listMessages(sessionId: string): Promise<StoredMessage[]> {
  const rows = await sql<MessageRow[]>`
    select * from messages where session_id = ${sessionId} order by created_at asc
  `;
  return rows.map(toMessage);
}

export async function addMessage(input: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
}): Promise<StoredMessage> {
  const rows = await sql<MessageRow[]>`
    insert into messages (session_id, role, content, citations)
    values (
      ${input.sessionId}, ${input.role}, ${input.content},
      ${input.citations ? JSON.stringify(input.citations) : null}::jsonb
    )
    returning *
  `;
  return toMessage(rows[0]);
}

/** First user message becomes the session title (trimmed). */
export async function maybeAutoTitle(sessionId: string, text: string): Promise<void> {
  const clean = text.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!clean) return;
  await sql`
    update chat_sessions
    set title = ${clean}
    where id = ${sessionId} and title = 'New chat'
  `;
}
