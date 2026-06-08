/** Shared domain types used across client and server. */

export type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

/** A study mode maps 1:1 to a feature tab / API behaviour. */
export type StudyMode =
  | "chat"
  | "podcast"
  | "flashcards"
  | "quiz"
  | "crosscheck";

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  grade: string | null;
  board: string | null;
  isAllowed: boolean;
  createdAt: string;
  /** Aggregates (optional, when joined). */
  documentCount?: number;
  chunkCount?: number;
}

export type DocumentStatus = "processing" | "ready" | "error";

export interface SourceDocument {
  id: string;
  subjectId: string;
  name: string;
  /** Human-readable chapter title — editable in Admin; used in RAG context. */
  title: string | null;
  type: string;
  size: number;
  pageCount: number | null;
  chunkCount: number;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
}

/** A chunk retrieved from the vector store, surfaced as a citation. */
export interface RetrievedChunk {
  id: string;
  documentId: string;
  documentName: string;
  subjectId: string;
  content: string;
  page: number | null;
  chunkIndex: number;
  score: number;
}

/** Compact citation attached to an assistant message. */
export interface Citation {
  documentId: string;
  documentName: string;
  page: number | null;
  chunkIndex: number;
  score: number;
}

export interface ChatSession {
  id: string;
  subjectId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredMessage {
  id: string;
  sessionId: string;
  role: Role;
  content: string;
  citations: Citation[] | null;
  createdAt: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

export interface CrosscheckResult {
  verdict: "correct" | "partially-correct" | "incorrect";
  feedback: string;
  correctAnswer: string;
}
