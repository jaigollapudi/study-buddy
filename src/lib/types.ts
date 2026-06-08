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

export interface SourceDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  chunkCount: number;
  createdAt: number;
}

/** A chunk retrieved from the vector store, returned to the client as a citation. */
export interface RetrievedChunk {
  docId: string;
  docName: string;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index into `options` of the correct answer. */
  answerIndex: number;
  explanation?: string;
}

export interface CrosscheckResult {
  verdict: "correct" | "partially-correct" | "incorrect";
  feedback: string;
  correctAnswer: string;
}
