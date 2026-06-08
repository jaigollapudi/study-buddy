-- Study Buddy schema: subjects, textbook documents, embedded chunks (pgvector),
-- chat sessions + messages, and multi-user scaffolding for later.

create extension if not exists vector;

-- ── Subjects ───────────────────────────────────────────────────────────────
-- A subject groups one or more textbooks (e.g. "Class 9 Chemistry").
create table if not exists subjects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  color       text not null default '#006BFF',
  grade       text,
  board       text,
  -- Whether the (single) student may currently access this subject.
  -- Superseded by `enrollments` once real multi-user auth lands.
  is_allowed  boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── Documents (textbooks) ────────────────────────────────────────────────────
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references subjects(id) on delete cascade,
  name        text not null,
  type        text not null,
  size        bigint not null default 0,
  page_count  int,
  chunk_count int not null default 0,
  status      text not null default 'ready', -- processing | ready | error
  error       text,
  created_at  timestamptz not null default now()
);
create index if not exists documents_subject_idx on documents(subject_id);

-- ── Chunks (embedded passages) ────────────────────────────────────────────────
-- 768 dims = Ollama `nomic-embed-text`.
create table if not exists chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  subject_id  uuid not null references subjects(id) on delete cascade,
  content     text not null,
  page        int,
  chunk_index int not null,
  embedding   vector(768),
  created_at  timestamptz not null default now()
);
create index if not exists chunks_subject_idx on chunks(subject_id);
create index if not exists chunks_embedding_idx
  on chunks using hnsw (embedding vector_cosine_ops);

-- ── Chat sessions + messages ──────────────────────────────────────────────────
create table if not exists chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade,
  title      text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chat_sessions_subject_idx
  on chat_sessions(subject_id, updated_at desc);

create table if not exists messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  -- [{ docId, docName, page, chunkIndex, score }]
  citations  jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_session_idx
  on messages(session_id, created_at);

-- ── Multi-user scaffolding (not wired to auth yet) ───────────────────────────
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists enrollments (
  student_id uuid not null references students(id) on delete cascade,
  subject_id uuid not null references subjects(id) on delete cascade,
  primary key (student_id, subject_id)
);

-- Keep chat_sessions.updated_at fresh on new messages.
create or replace function touch_session_updated_at()
returns trigger language plpgsql as $$
begin
  update chat_sessions set updated_at = now() where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists messages_touch_session on messages;
create trigger messages_touch_session
  after insert on messages
  for each row execute function touch_session_updated_at();

-- ── Vector search helper ──────────────────────────────────────────────────────
-- Returns the most similar chunks for a query embedding, optionally scoped to a
-- subject. Similarity = 1 - cosine_distance.
create or replace function match_chunks(
  query_embedding vector(768),
  match_count int default 6,
  filter_subject uuid default null
)
returns table (
  id uuid,
  document_id uuid,
  subject_id uuid,
  content text,
  page int,
  chunk_index int,
  similarity float
)
language sql stable as $$
  select
    c.id,
    c.document_id,
    c.subject_id,
    c.content,
    c.page,
    c.chunk_index,
    1 - (c.embedding <=> query_embedding) as similarity
  from chunks c
  where filter_subject is null or c.subject_id = filter_subject
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
