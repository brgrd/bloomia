-- Bloomia leaderboard schema (Supabase Postgres)
-- Apply in Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null default 'Anonymous',
  score bigint not null,
  seed bigint not null,
  duration_ms integer not null,
  moves integer not null,
  accuracy double precision not null,
  run_hash text not null
);

alter table public.scores enable row level security;

alter table public.scores
  add constraint scores_name_len check (char_length(name) between 1 and 24),
  add constraint scores_score_range check (score between 0 and 1000000000),
  add constraint scores_seed_range check (seed between 0 and 4294967295),
  add constraint scores_duration_range check (duration_ms between 0 and 86400000),
  add constraint scores_moves_range check (moves between 0 and 200000),
  add constraint scores_accuracy_range check (accuracy between 0 and 1),
  add constraint scores_hash_len check (char_length(run_hash) = 64);

create index if not exists scores_score_desc_idx on public.scores (score desc, created_at asc);
create index if not exists scores_created_at_idx on public.scores (created_at desc);

create or replace view public.leaderboard as
  select
    score,
    name,
    duration_ms,
    accuracy,
    created_at
  from public.scores
  order by score desc, created_at asc;

-- Privileges: allow anyone to read the view, and insert into scores (no updates/deletes).
grant usage on schema public to anon, authenticated;
revoke all on table public.scores from anon, authenticated;
revoke all on view public.leaderboard from anon, authenticated;

grant insert on table public.scores to anon, authenticated;
grant select on view public.leaderboard to anon, authenticated;

-- RLS: allow inserts (constraints + table privileges are the main guardrails).
drop policy if exists "scores_insert" on public.scores;
create policy "scores_insert"
  on public.scores
  for insert
  to anon, authenticated
  with check (true);

-- Note: No select policy on public.scores; clients read from the view only.
