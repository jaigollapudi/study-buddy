# 📚 Study Buddy

> A local-first, privacy-friendly AI study partner. Upload your notes and learn
> smarter with chat, flashcards, quizzes, answer cross-checks, and podcast-style
> summaries — powered by a model running on **your own machine**.

This is a ground-up rebuild of an earlier Study Buddy prototype, re-architected
for a modern stack, real retrieval-augmented generation (RAG), and zero ongoing
cost by defaulting to local models via [Ollama](https://ollama.com).

---

## ✨ Features

| Feature | What it does |
|---|---|
| 💬 **Chat** | Step-by-step tutoring, streamed token-by-token, grounded in your notes |
| 🎯 **Flashcards** | Auto-generated, flippable Q&A cards |
| ❓ **Quiz** | Interactive multiple-choice quizzes with scoring + explanations |
| 🧪 **Cross-check** | Paste a question + your answer; get a graded verdict and corrections |
| 🎧 **Podcast** | A spoken-style summary, read aloud (free browser voice, or Gemini TTS) |
| 📄 **Notes (RAG)** | Upload `.txt` / `.md` / `.pdf` / `.docx`; chunked, embedded, and retrieved |

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **UI**: Tailwind CSS v4 + shadcn/ui, dark/light themes
- **AI (local)**: Ollama — chat (`llama3.1:8b`) + embeddings (`nomic-embed-text`)
- **RAG**: in-process chunking + [LanceDB](https://lancedb.com) embedded vector store
- **Parsing**: `unpdf` (PDF), `mammoth` (DOCX), native text (TXT/MD)
- **State**: Zustand (with `localStorage` persistence)
- **TTS**: Web Speech API (free) with a pluggable server provider (Gemini)

### Why this is "better" than the original

- **Provider-agnostic AI layer** — Ollama today; OpenAI/Gemini drop in behind one interface.
- **Real RAG** instead of stuffing entire notes into every prompt.
- **Structured JSON outputs** for quizzes/flashcards (robustly parsed) rather than fragile string-splitting.
- **Streaming chat**, proper error/loading states, and accessible, responsive UI.
- **Modular architecture** (typed API routes, `lib/ai`, `lib/rag`, `lib/tts`) vs. three monolithic files.
- **Local-first & free** by default; cross-platform (no Windows-only `.bat`).

---

## 🚀 Getting Started

### 1. Install & run Ollama

```bash
# Install from https://ollama.com/download, then pull the models:
ollama pull llama3.1:8b
ollama pull nomic-embed-text
# Ollama usually runs as a background service; otherwise:
ollama serve
```

> Low on RAM? Set smaller models in `.env.local`, e.g. `OLLAMA_CHAT_MODEL=llama3.2:3b`.

### 2. Configure (optional)

```bash
cp .env.example .env.local   # tweak models, RAG, or TTS if you like
```

### 3. Install dependencies & start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The sidebar shows a live status banner that tells
you exactly what to install/pull if anything's missing.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                # typed route handlers (chat, quiz, documents, …)
│   ├── layout.tsx          # root layout + theme/toast providers
│   └── page.tsx
├── components/             # UI (sidebar, chat, flashcards, quiz, …) + shadcn/ui
└── lib/
    ├── ai/                 # provider-agnostic AI: Ollama client, prompts, JSON parse
    ├── rag/                # parse → chunk → embed → LanceDB store → retrieve
    ├── tts/                # text-to-speech providers (browser default, Gemini optional)
    ├── client.ts           # typed browser → API client
    ├── store.ts            # Zustand global state
    └── config.ts           # env-driven configuration
```

---

## ⚙️ Configuration

All settings live in `.env.local` (see `.env.example`). Highlights:

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_CHAT_MODEL` | `llama3.1:8b` | Chat/generation model |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model for RAG |
| `RAG_TOP_K` | `6` | Chunks retrieved per query |
| `MAX_UPLOAD_BYTES` | `10485760` | Upload size cap (10 MB) |
| `TTS_PROVIDER` | `browser` | `browser` (free) or `gemini` (needs `GEMINI_API_KEY`) |

Uploaded notes and their vectors are stored locally under `.studybuddy/` (gitignored).

---

## 📄 License

MIT. The original prototype this rebuild is based on was created by
[Dhim-123](https://github.com/Dhim-123).
