-- Hyper Drive: a counted day spent in deep, goal-aligned work instead of
-- checking the daily list. Unlike an Exception, the day DOES count toward
-- the 100. Limited to 2 per calendar week (Sunday–Saturday).
alter table daily_logs
  add column if not exists is_hyperdrive boolean default false;

create table if not exists hyperdrive_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null,
  note text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

alter table hyperdrive_events enable row level security;

create policy "Users manage own hyperdrive_events" on hyperdrive_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists hyperdrive_events_user_date_idx
  on hyperdrive_events (user_id, log_date);

create index if not exists daily_logs_user_hyperdrive_idx
  on daily_logs (user_id, log_date)
  where is_hyperdrive = true;
