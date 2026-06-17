-- Run this once in the Supabase dashboard SQL editor (Database → SQL Editor → New query)
create table if not exists tournament_cache (
  id integer primary key,
  data jsonb not null,
  fetched_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- All access is via the service role key (server-side only), so RLS is not needed.
alter table tournament_cache disable row level security;
