# Study Buddy

**A local-first AI study partner for students** — grounded in prescribed textbook PDFs, with page citations, multi-turn chat history, and study tools (flashcards, quizzes, cross-check, podcast).

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Ollama](https://img.shields.io/badge/AI-Ollama-green)](https://ollama.com/)
[![Supabase](https://img.shields.io/badge/DB-Supabase%20%2B%20pgvector-3ecf8e)](https://supabase.com/)

Repository: [github.com/jaigollapudi/study-buddy](https://github.com/jaigollapudi/study-buddy)

---

## Overview

Study Buddy lets teachers/admins upload textbook PDFs per subject (e.g. CBSE Class 9 Science, one file per chapter). Students pick a subject, start or resume chats, and get answers **retrieved from those books** — not hallucinated from thin air. Every grounded reply can cite the source file and page.

Inference runs **locally via Ollama** (free). Vectors and chat history live in **Postgres + pgvector** via Supabase — fully browsable in Studio.

This project is a ground-up rebuild of [Dhim-123/Study-Buddy](https://github.com/Dhim-123/Study-Buddy), with modern architecture, real RAG, and a Calendly-inspired UI.

---

## Features

| Area | Capability |
|------|------------|
| **Subjects** | Sidebar accordion — expand a subject → past chats + New chat |
| **Chat** | Streaming, multi-turn, subject-scoped RAG with citations |
| **Admin** | Create subjects, upload textbooks, toggle student visibility |
| **Flashcards** | Auto-generated from textbook context |
| **Quiz** | Multiple-choice with explanations |
| **Cross-check** | Grade a student answer against the textbook |
| **Podcast** | Spoken summary (browser TTS free; Gemini optional) |
| **Database** | Visual inspection via Supabase Studio |

---

## Architecture

```mermaid
flowchart LR
  subgraph client [Browser]
    UI[Student / Admin UI]
  end
  subgraph next [Next.js API]
    Chat[/api/chat]
    RAG[lib/rag]
    DB[lib/db]
    AI[lib/ai — Ollama]
  end
  subgraph data [Local services]
    PG[(Postgres + pgvector)]
    Ollama[Ollama llama3.1 + nomic-embed]
    Studio[Supabase Studio :54323]
  end
  UI --> Chat
  Chat --> RAG
  RAG --> AI
  RAG --> DB
  DB --> PG
  AI --> Ollama
  PG --> Studio
```

### RAG pipeline

1. **Parse** — PDF/DOCX/TXT → text per page (`unpdf`, `mammoth`)
2. **Chunk** — ~1200 chars, 200 overlap, sentence-aware splits
3. **Embed** — `nomic-embed-text` (768-dim) via Ollama
4. **Store** — chunks + vectors in `chunks` table (`pgvector` HNSW index)
5. **Retrieve** — query embedding → cosine similarity, scoped to active subject
6. **Answer** — relevant excerpts injected into the system prompt → Ollama streams the reply

**Intent-aware retrieval:** questions like *"what are the chapters called"* use a catalog path (document index + first page per chapter) instead of generic vector search. Chapter lists are built deterministically when possible — instant, no duplicate lists.

---

## System prompts

All LLM instructions live in **`src/lib/ai/prompts.ts`**.

| Export | Used by | Purpose |
|--------|---------|---------|
| `BASE` | All modes | Core tutor persona + grounding rules |
| `prompts.chat()` | `/api/chat` | Chat style (tutor vs. catalog/list) + injected RAG context |
| `prompts.flashcards()` | `/api/flashcards` | JSON flashcard generation |
| `prompts.quiz()` | `/api/quiz` | JSON quiz generation |
| `prompts.crosscheck()` | `/api/crosscheck` | JSON answer grading |
| `prompts.podcast()` | `/api/podcast` | Spoken monologue script |
| `buildContextBlock()` | All RAG routes | Formats retrieved chunks into the system prompt |

The chat route (`src/app/api/chat/route.ts`) assembles the final prompt as:

```
prompts.chat(ragContextBlock, intent)  →  Ollama system message
+ conversation history (trimmed)
+ latest user message
```

To change how the tutor behaves globally, edit `BASE` in `prompts.ts`. To change step-by-step vs. direct-answer style, edit the `intent` branches in `prompts.chat()`.

---

## Quick start

### Prerequisites

- Node.js 20+ (22 LTS recommended)
- [Docker](https://www.docker.com/) (for local Supabase)
- [Ollama](https://ollama.com/download)

### 1. Database

```bash
npx supabase start
npx supabase db reset    # applies migrations + seed subjects
```

Studio (visual DB): **http://127.0.0.1:54323**

### 2. Ollama models

```bash
ollama pull llama3.1:8b
ollama pull nomic-embed-text
ollama serve   # if not already running
```

### 3. App

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open **http://localhost:3000** → upload textbooks at **/admin** → chat from the home page.

---

## Project structure

```
src/
├── app/
│   ├── admin/                 # Textbook & subject management
│   ├── api/                   # REST + streaming chat routes
│   └── page.tsx               # Student app entry
├── components/
│   ├── app/                   # Subject sidebar, student shell
│   ├── admin/                 # Admin UI
│   └── chat/                  # Chat panel, citations
└── lib/
    ├── ai/                    # Ollama provider, prompts, JSON parsing
    ├── db/                    # Postgres repositories
    ├── rag/                   # Parse, chunk, embed, retrieve, catalog
    ├── client.ts              # Browser API client
    └── config.ts              # Environment-driven settings

supabase/
├── migrations/                # Schema (subjects, documents, chunks, sessions, messages)
└── seed.sql                   # Example subjects
```

---

## Configuration

See `.env.example`. Key variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | local Supabase | Postgres connection string |
| `OLLAMA_CHAT_MODEL` | `llama3.1:8b` | Generation model |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Embedding model (768-dim) |
| `RAG_TOP_K` | `10` | Chunks retrieved per content question |
| `CHAT_HISTORY_LIMIT` | `12` | Messages sent to the model (latency) |
| `MAX_UPLOAD_BYTES` | `104857600` | Max upload size (100 MB) |

---

## Changelog

### v0.2.1 — 2026-06-08

- **Editable chapter titles** in Admin (`documents.title`) — authoritative source for catalog answers
- Removed deterministic LLM bypass; all answers go through the model with **structured catalog context**
- Catalog retrieval: chapter index + cleaned opening excerpts per file (not raw body text as titles)
- Auto-suggested titles on upload; citations use admin title when set

### v0.2.0 — 2026-06-08

- Migrated from LanceDB to **Supabase Postgres + pgvector**
- **Multi-turn chat sessions** grouped by subject in sidebar
- **Admin area** for subjects and textbook uploads
- **Calendly-inspired UI** (Poppins, light/dark themes)
- **Intent-aware RAG** — catalog queries use per-chapter opening excerpts
- **Deterministic chapter lists** — fast, deduplicated, supplementary files excluded (`iesc1ps`, preface, etc.)
- Page-level citations on assistant messages
- Chunk content prefixed with textbook name at ingest time

### v0.1.0 — Initial rebuild

- Next.js 16 + Ollama + LanceDB prototype
- Chat, flashcards, quiz, cross-check, podcast features
- Basic RAG over uploaded notes

> **Maintainers:** add a dated entry here whenever you ship a significant change.

---

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
npx tsc --noEmit # Type-check
```

---

## License

MIT — original prototype by [Dhim-123](https://github.com/Dhim-123).
