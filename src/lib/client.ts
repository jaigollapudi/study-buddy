import type {
  ChatMessage,
  CrosscheckResult,
  Flashcard,
  QuizQuestion,
  SourceDocument,
} from "@/lib/types";

async function asError(res: Response): Promise<never> {
  let message = `Request failed (${res.status}).`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    /* ignore */
  }
  throw new Error(message);
}

export interface HealthResponse {
  ok: boolean;
  provider: string;
  baseUrl?: string;
  models?: string[];
  error?: string;
  expected: { chatModel: string; embedModel: string };
  chatReady: boolean;
  embedReady: boolean;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health", { cache: "no-store" });
  if (!res.ok) await asError(res);
  return res.json();
}

export async function listDocuments(): Promise<SourceDocument[]> {
  const res = await fetch("/api/documents", { cache: "no-store" });
  if (!res.ok) await asError(res);
  return (await res.json()).documents;
}

export async function uploadDocument(file: File): Promise<SourceDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/documents", { method: "POST", body: form });
  if (!res.ok) await asError(res);
  return (await res.json()).document;
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
  if (!res.ok) await asError(res);
}

interface GenerateInput {
  messages: ChatMessage[];
  docIds?: string[];
}

/** Streams the chat reply, invoking `onDelta` for each text chunk. */
export async function streamChat(
  input: GenerateInput & { signal?: AbortSignal },
  onDelta: (text: string) => void,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: input.messages, docIds: input.docIds }),
    signal: input.signal,
  });
  if (!res.ok || !res.body) await asError(res);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onDelta(decoder.decode(value, { stream: true }));
  }
}

export async function generateFlashcards(input: GenerateInput): Promise<Flashcard[]> {
  const res = await fetch("/api/flashcards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await asError(res);
  return (await res.json()).cards;
}

export async function generateQuiz(input: GenerateInput): Promise<QuizQuestion[]> {
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await asError(res);
  return (await res.json()).questions;
}

export async function generatePodcast(
  input: GenerateInput,
): Promise<{ script: string; ttsProvider: "browser" | "gemini" }> {
  const res = await fetch("/api/podcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await asError(res);
  return res.json();
}

export async function crosscheck(input: {
  question: string;
  answer: string;
  docIds?: string[];
}): Promise<CrosscheckResult> {
  const res = await fetch("/api/crosscheck", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) await asError(res);
  return res.json();
}

export async function synthesizeServerTts(
  text: string,
): Promise<{ audioBase64: string; mimeType: string }> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) await asError(res);
  return res.json();
}
