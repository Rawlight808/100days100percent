-- Track each time a new caveat is added so the "2 caveats per rolling 7 days"
-- allowance can sync across devices instead of living in localStorage.
create table if not exists caveat_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  -- Which rule the caveat was attached to (informational only; no FK so this
  -- migration does not depend on the items table existing first).
  item_id uuid,
  log_date date not null,
  created_at timestamptz default now()
);

alter table caveat_events enable row level security;

create policy "Users manage own caveat_events" on caveat_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists caveat_events_user_date_idx
  on caveat_events (user_id, log_date);
