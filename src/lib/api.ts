import { z } from "zod";
import { buildContextBlock } from "@/lib/ai/prompts";
import { retrieveContext } from "@/lib/rag";
import type { ChatMessage, RetrievedChunk } from "@/lib/types";

export const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

export const chatBodySchema = z.object({
  messages: z.array(messageSchema).min(1),
  docIds: z.array(z.string()).optional(),
});

export const crosscheckBodySchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  docIds: z.array(z.string()).optional(),
});

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** Picks the most recent user message to use as the retrieval query. */
export function latestUserQuery(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return messages[messages.length - 1]?.content ?? "";
}

/** Retrieve RAG context for a query and render it into a prompt block. */
export async function getContextBlock(
  query: string,
  docIds?: string[],
): Promise<{ block: string; chunks: RetrievedChunk[] }> {
  const chunks = await retrieveContext(query, { docIds });
  return { block: buildContextBlock(chunks), chunks };
}

export function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/fetch failed|ECONNREFUSED|Cannot reach Ollama/i.test(msg)) {
    return "Cannot reach the local AI server. Is Ollama running? (`ollama serve`)";
  }
  return msg;
}
