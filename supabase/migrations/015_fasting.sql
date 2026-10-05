-- Fasting day: the fast stands in for the daily list. Any open day.
-- The day still counts toward the 100 and advances the streak.
alter table daily_logs
  add column if not exists is_fasting boolean not null default false;
