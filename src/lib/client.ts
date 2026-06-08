import type {
  ChatMessage,
  ChatSession,
  Citation,
  CrosscheckResult,
  Flashcard,
  QuizQuestion,
  SourceDocument,
  StoredMessage,
  Subject,
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

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) await asError(res);
  return res.json();
}

async function sendJson<T>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) await asError(res);
  return res.json();
}

/* ── Health ─────────────────────────────────────────────────────────────── */

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

export const fetchHealth = () => getJson<HealthResponse>("/api/health");

/* ── Subjects ───────────────────────────────────────────────────────────── */

export const listSubjects = (all = false) =>
  getJson<{ subjects: Subject[] }>(`/api/subjects${all ? "?all=1" : ""}`).then((d) => d.subjects);

export const createSubject = (input: {
  name: string;
  description?: string | null;
  color?: string;
  grade?: string | null;
  board?: string | null;
}) => sendJson<{ subject: Subject }>("/api/subjects", "POST", input).then((d) => d.subject);

export const updateSubject = (id: string, patch: Partial<Subject>) =>
  sendJson<{ subject: Subject }>(`/api/subjects/${id}`, "PATCH", patch).then((d) => d.subject);

export const deleteSubject = (id: string) =>
  sendJson<{ ok: true }>(`/api/subjects/${id}`, "DELETE");

/* ── Documents ──────────────────────────────────────────────────────────── */

export const listDocuments = (subjectId: string) =>
  getJson<{ documents: SourceDocument[] }>(`/api/subjects/${subjectId}/documents`).then(
    (d) => d.documents,
  );

export async function uploadDocument(subjectId: string, file: File): Promise<SourceDocument> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`/api/subjects/${subjectId}/documents`, { method: "POST", body: form });
  if (!res.ok) await asError(res);
  return (await res.json()).document;
}

export const deleteDocument = (id: string) =>
  sendJson<{ ok: true }>(`/api/documents/${id}`, "DELETE");

export const reprocessDocuments = (subjectId: string) =>
  sendJson<{ ok: true; message: string; resetCount: number }>(
    `/api/subjects/${subjectId}/reprocess`,
    "POST",
  );

/* ── Sessions ───────────────────────────────────────────────────────────── */

export const listSessions = (subjectId: string) =>
  getJson<{ sessions: ChatSession[] }>(`/api/subjects/${subjectId}/sessions`).then(
    (d) => d.sessions,
  );

export const createSession = (subjectId: string) =>
  sendJson<{ session: ChatSession }>(`/api/subjects/${subjectId}/sessions`, "POST").then(
    (d) => d.session,
  );

export const renameSession = (id: string, title: string) =>
  sendJson<{ ok: true }>(`/api/sessions/${id}`, "PATCH", { title });

export const deleteSession = (id: string) =>
  sendJson<{ ok: true }>(`/api/sessions/${id}`, "DELETE");

export const listMessages = (sessionId: string) =>
  getJson<{ messages: StoredMessage[] }>(`/api/sessions/${sessionId}/messages`).then(
    (d) => d.messages,
  );

/* ── Chat (NDJSON stream) ───────────────────────────────────────────────── */

interface StreamHandlers {
  onMeta?: (citations: Citation[]) => void;
  onDelta: (text: string) => void;
  onError?: (message: string) => void;
}

export async function streamChat(
  input: { sessionId: string; content: string; signal?: AbortSignal },
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: input.sessionId, content: input.content }),
    signal: input.signal,
  });
  if (!res.ok || !res.body) await asError(res);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const evt = JSON.parse(trimmed) as
      | { type: "meta"; citations: Citation[] }
      | { type: "delta"; text: string }
      | { type: "done" }
      | { type: "error"; message: string };
    if (evt.type === "meta") handlers.onMeta?.(evt.citations);
    else if (evt.type === "delta") handlers.onDelta(evt.text);
    else if (evt.type === "error") handlers.onError?.(evt.message);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      handleLine(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
    }
  }
  if (buffer.trim()) handleLine(buffer);
}

/* ── Study tools ────────────────────────────────────────────────────────── */

interface ToolInput {
  messages: ChatMessage[];
  subjectId?: string | null;
}

export const generateFlashcards = (input: ToolInput) =>
  sendJson<{ cards: Flashcard[] }>("/api/flashcards", "POST", input).then((d) => d.cards);

export const generateQuiz = (input: ToolInput) =>
  sendJson<{ questions: QuizQuestion[] }>("/api/quiz", "POST", input).then((d) => d.questions);

export const generatePodcast = (input: ToolInput) =>
  sendJson<{ script: string; ttsProvider: "browser" | "gemini" }>("/api/podcast", "POST", input);

export const crosscheck = (input: {
  question: string;
  answer: string;
  subjectId?: string | null;
}) => sendJson<CrosscheckResult>("/api/crosscheck", "POST", input);

export async function synthesizeServerTts(
  text: string,
): Promise<{ audioBase64: string; mimeType: string }> {
  return sendJson("/api/tts", "POST", { text });
}
