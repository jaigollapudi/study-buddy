import { z } from "zod";
import { buildContextBlock } from "@/lib/ai/prompts";
import { retrieveContext } from "@/lib/rag";
import { detectQueryIntent, type QueryIntent } from "@/lib/rag/intent";
import type { Citation, ChatMessage, RetrievedChunk } from "@/lib/types";

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

/** Body for study-tool routes that work off conversation context. */
export const toolBodySchema = z.object({
  messages: z.array(messageSchema).min(1),
  subjectId: z.string().uuid().nullable().optional(),
});

export const crosscheckBodySchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  subjectId: z.string().uuid().nullable().optional(),
});

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function latestUserQuery(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return messages[messages.length - 1]?.content ?? "";
}

/** Retrieve RAG context and render it into a prompt block. */
export async function getContextBlock(
  query: string,
  subjectId?: string | null,
): Promise<{ block: string; chunks: RetrievedChunk[]; intent: QueryIntent }> {
  const chunks = await retrieveContext(query, { subjectId });
  const intent = detectQueryIntent(query);
  return { block: buildContextBlock(chunks, { intent }), chunks, intent };
}

/** Convert retrieved chunks into compact, de-duplicated citations. */
export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const c of chunks) {
    const key = `${c.documentId}:${c.page ?? c.chunkIndex}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      documentId: c.documentId,
      documentName: c.documentName,
      page: c.page,
      chunkIndex: c.chunkIndex,
      score: c.score,
    });
  }
  return out;
}

export function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ECONNREFUSED|Cannot reach Ollama/i.test(msg)) {
    return "Cannot reach the local AI server. Is Ollama running? (`ollama serve`)";
  }
  if (/ECONNREFUSED .*54322|connect ECONNREFUSED 127\.0\.0\.1:54322|terminating connection/i.test(msg)) {
    return "Cannot reach the database. Is local Supabase running? (`npx supabase start`)";
  }
  return msg;
}
