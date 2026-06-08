/**
 * Central runtime configuration.
 *
 * Everything is driven by environment variables with sensible local-first
 * defaults so the app runs fully offline against a local Ollama instance at
 * zero cost. See `.env.example` for the full list.
 */

function env(key: string, fallback: string): string {
  const value = process.env[key];
  return value && value.trim() ? value.trim() : fallback;
}

function envNum(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  /** Postgres connection string (local Supabase by default). */
  databaseUrl: env(
    "DATABASE_URL",
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
  ),

  /** Which text-generation provider to use. Local Ollama by default. */
  textProvider: env("AI_TEXT_PROVIDER", "ollama") as "ollama",

  ollama: {
    /** Base URL of the local Ollama server. */
    baseUrl: env("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
    /** Default chat / generation model. Pull with `ollama pull <model>`. */
    chatModel: env("OLLAMA_CHAT_MODEL", "llama3.1:8b"),
    /** Embedding model used for RAG. `nomic-embed-text` -> 768 dims. */
    embedModel: env("OLLAMA_EMBED_MODEL", "nomic-embed-text"),
  },

  rag: {
    /** Approximate characters per chunk. ~600 keeps one concept per chunk. */
    chunkSize: envNum("RAG_CHUNK_SIZE", 600),
    /** Overlap preserves context at chunk boundaries. */
    chunkOverlap: envNum("RAG_CHUNK_OVERLAP", 120),
    /** Smaller chunks for opening pages — keeps headings separate. */
    openingChunkSize: envNum("RAG_OPENING_CHUNK_SIZE", 300),
    /** Hybrid candidates fetched before final cap. */
    topK: envNum("RAG_TOP_K", 20),
    /** Per-document hits for broad queries. */
    perDocTopK: envNum("RAG_PER_DOC_TOP_K", 2),
    /** Final chunks sent to the LLM. Smaller = more focused answers. */
    maxContextChunks: envNum("RAG_MAX_CONTEXT_CHUNKS", 8),
    /** Reject chunks with cosine similarity below this threshold. */
    minSimilarity: envNum("RAG_MIN_SIMILARITY", 25) / 100, // stored as int % for env readability
    /** Max prior messages sent to the chat model (keeps local inference fast). */
    chatHistoryLimit: envNum("CHAT_HISTORY_LIMIT", 12),
    /** Max upload size in bytes — textbooks can be large. */
    maxUploadBytes: envNum("MAX_UPLOAD_BYTES", 100 * 1024 * 1024),
    /** Embedding requests are batched to avoid overloading Ollama. */
    embedBatchSize: envNum("RAG_EMBED_BATCH", 32),
  },

  tts: {
    /**
     * Audio provider for the podcast feature.
     *  - "browser": free, uses the Web Speech API on the client (default).
     *  - "gemini":  higher quality, requires GEMINI_API_KEY (paid, optional).
     */
    provider: env("TTS_PROVIDER", "browser") as "browser" | "gemini",
    geminiApiKey: env("GEMINI_API_KEY", ""),
    geminiModel: env("GEMINI_TTS_MODEL", "gemini-2.5-flash-preview-tts"),
    geminiVoice: env("GEMINI_TTS_VOICE", "Kore"),
  },
} as const;

export type AppConfig = typeof config;
