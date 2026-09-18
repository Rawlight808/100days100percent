-- Guided setup: 100-day destinations per life area, plus area/kind on items.
-- Safe to re-run if a previous attempt timed out.

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  area text not null,
  destination text,
  updated_at timestamptz default now(),
  unique (user_id, area)
);

alter table goals enable row level security;

drop policy if exists "Users manage own goals" on goals;
create policy "Users manage own goals" on goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists goals_user_idx on goals (user_id);

alter table items
  add column if not exists area text;

alter table items
  add column if not exists kind text;

-- kind is informational: 'do' | 'stop' (nullable for legacy lists)
