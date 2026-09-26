-- Multiple 1-year goals per life area, and items can belong to one goal.
-- Safe to re-run.

alter table goals drop constraint if exists goals_user_id_area_key;

alter table goals
  add column if not exists position integer not null default 0;

create index if not exists goals_user_area_idx on goals (user_id, area, position);

alter table items
  add column if not exists goal_id uuid references goals(id) on delete set null;
