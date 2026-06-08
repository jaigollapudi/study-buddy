-- Hybrid retrieval: add full-text search index alongside pgvector.
-- This enables keyword (BM25-style) search which catches exact term lookups
-- that semantic similarity often misses.

alter table chunks add column if not exists ts_content tsvector
  generated always as (to_tsvector('english', content)) stored;

create index if not exists chunks_ts_idx on chunks using gin(ts_content);

-- RRF (Reciprocal Rank Fusion) merge of vector + keyword results.
-- k=60 is the standard constant that smooths rank differences.
create or replace function hybrid_chunks(
  query_embedding vector(768),
  query_text      text,
  match_count     int  default 8,
  filter_subject  uuid default null,
  rrf_k           int  default 60,
  min_similarity  float default 0.25
)
returns table (
  id          uuid,
  document_id uuid,
  subject_id  uuid,
  content     text,
  page        int,
  chunk_index int,
  score       float   -- final RRF score (higher = better)
)
language sql stable as $$
  with
  -- 1. Vector candidates (top 30, filtered by minimum similarity)
  vec as (
    select
      c.id, c.document_id, c.subject_id, c.content, c.page, c.chunk_index,
      1 - (c.embedding <=> query_embedding) as similarity,
      row_number() over (order by c.embedding <=> query_embedding) as rank
    from chunks c
    where
      (filter_subject is null or c.subject_id = filter_subject)
      and 1 - (c.embedding <=> query_embedding) >= min_similarity
    order by c.embedding <=> query_embedding
    limit 30
  ),

  -- 2. Full-text keyword candidates (top 30)
  kw as (
    select
      c.id, c.document_id, c.subject_id, c.content, c.page, c.chunk_index,
      ts_rank_cd(c.ts_content, websearch_to_tsquery('english', query_text)) as kw_score,
      row_number() over (
        order by ts_rank_cd(c.ts_content, websearch_to_tsquery('english', query_text)) desc
      ) as rank
    from chunks c
    where
      (filter_subject is null or c.subject_id = filter_subject)
      and c.ts_content @@ websearch_to_tsquery('english', query_text)
    order by kw_score desc
    limit 30
  ),

  -- 3. Reciprocal Rank Fusion
  rrf as (
    select
      coalesce(v.id, k.id)                       as id,
      coalesce(v.document_id, k.document_id)     as document_id,
      coalesce(v.subject_id, k.subject_id)       as subject_id,
      coalesce(v.content, k.content)             as content,
      coalesce(v.page, k.page)                   as page,
      coalesce(v.chunk_index, k.chunk_index)     as chunk_index,
      coalesce(1.0 / (rrf_k + v.rank), 0.0)
        + coalesce(1.0 / (rrf_k + k.rank), 0.0) as rrf_score
    from vec v
    full outer join kw k on k.id = v.id
  )

  select id, document_id, subject_id, content, page, chunk_index, rrf_score as score
  from rrf
  order by rrf_score desc
  limit match_count;
$$;
