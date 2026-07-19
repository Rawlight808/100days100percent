-- Exceptions: a rare, whole-day exemption for circumstances outside the
-- user's control (illness, all-day travel, extreme work day, family
-- emergency). Unlike a Sabbath, an exception FREEZES the streak: the day
-- does not count toward the 100, but the streak survives. Limited to
-- 5 per run (counted from streak_start_date).
create table if not exists exception_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null,
  category text not null,
  note text,
  created_at timestamptz default now(),
  unique (user_id, log_date)
);

alter table exception_events enable row level security;

create policy "Users manage own exception_events" on exception_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists exception_events_user_date_idx
  on exception_events (user_id, log_date);

-- Mark which daily logs were exception days (for history / calendar display).
alter table daily_logs
  add column if not exists is_exception boolean default false;
