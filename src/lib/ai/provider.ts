import type { ChatMessage } from "@/lib/types";

export interface ChatOptions {
  /** System instruction kept server-side only. */
  system?: string;
  messages: ChatMessage[];
  model?: string;
  /** 0..1, lower = more deterministic. */
  temperature?: number;
  signal?: AbortSignal;
}

export interface HealthStatus {
  ok: boolean;
  provider: string;
  baseUrl?: string;
  models?: string[];
  error?: string;
}

/**
 * Provider-agnostic text generation contract. Any backend (Ollama today,
 * OpenAI/Gemini tomorrow) implements this so features never depend on a vendor.
 */
export interface TextProvider {
  readonly name: string;

  /** Stream the assistant reply as incremental text deltas. */
  chatStream(opts: ChatOptions): AsyncIterable<string>;

  /** Convenience: collect a full (non-streamed) reply. */
  chat(opts: ChatOptions): Promise<string>;

  /** Embed one or more texts into vectors for RAG. */
  embed(texts: string[]): Promise<number[][]>;

  /** Liveness + available models, used for setup diagnostics. */
  health(): Promise<HealthStatus>;
}
