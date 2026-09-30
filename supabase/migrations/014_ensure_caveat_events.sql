-- caveat_events was added in 006 but never applied on production (PostgREST
-- PGRST205: table missing from the schema cache). Creating it is what makes
-- "Save caveat" succeed. Safe to re-run.
create table if not exists public.caveat_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  item_id uuid,
  log_date date not null,
  created_at timestamptz default now()
);

alter table public.caveat_events enable row level security;

drop policy if exists "Users manage own caveat_events" on public.caveat_events;
create policy "Users manage own caveat_events" on public.caveat_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists caveat_events_user_date_idx
  on public.caveat_events (user_id, log_date);

grant select, insert, update, delete on table public.caveat_events to anon, authenticated;
grant all on table public.caveat_events to service_role;

notify pgrst, 'reload schema';
