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
    /** Approximate characters per chunk before splitting. */
    chunkSize: envNum("RAG_CHUNK_SIZE", 1200),
    /** Character overlap between consecutive chunks to preserve context. */
    chunkOverlap: envNum("RAG_CHUNK_OVERLAP", 200),
    /** How many chunks to retrieve and inject as context per query. */
    topK: envNum("RAG_TOP_K", 6),
    /** Where the embedded LanceDB lives on disk. */
    dbPath: env("LANCEDB_PATH", ".studybuddy/lancedb"),
    /** Max upload size in bytes (default 10MB — the original claimed 2MB). */
    maxUploadBytes: envNum("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
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
