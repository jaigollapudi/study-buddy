-- Generated study artifacts shown in the sidebar beside chat sessions.
-- Stores flashcards, quizzes, and podcast scripts so switching tabs does not
-- lose generated work.
create table if not exists study_artifacts (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  mode       text not null check (mode in ('flashcards', 'quiz', 'podcast')),
  title      text not null,
  topic      text,
  payload    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_artifacts_subject_idx
  on study_artifacts(subject_id, updated_at desc);
