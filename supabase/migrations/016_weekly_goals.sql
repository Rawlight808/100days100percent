-- Weekly goals: as many as the user wants. Each goal's week is a rolling
-- 7 days anchored to started_on (the challenge day it was added), not a
-- Sunday–Saturday calendar week. Completions are unique per window start,
-- so when the window rolls forward the goal is open again.
-- Reminders for an unfinished goal are an app concern on the last 3 days.

create table if not exists weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  text text not null,
  started_on date not null,
  position integer not null default 0,
  created_at timestamptz default now(),
  constraint weekly_goals_text_len check (char_length(text) between 1 and 200)
);

create table if not exists weekly_goal_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  goal_id uuid references weekly_goals(id) on delete cascade not null,
  window_start date not null,
  completed_on date not null,
  created_at timestamptz default now(),
  unique (goal_id, window_start)
);

alter table weekly_goals enable row level security;
alter table weekly_goal_completions enable row level security;

drop policy if exists "Users manage own weekly_goals" on weekly_goals;
create policy "Users manage own weekly_goals" on weekly_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own weekly_goal_completions" on weekly_goal_completions;
create policy "Users manage own weekly_goal_completions" on weekly_goal_completions
  for all using (auth.uid() = user_id) with check (
    auth.uid() = user_id
    and exists (
      select 1 from weekly_goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

create index if not exists weekly_goals_user_idx
  on weekly_goals (user_id, position);

create index if not exists weekly_goal_completions_user_window_idx
  on weekly_goal_completions (user_id, window_start);
