alter table daily_logs
  add column if not exists is_sabbath boolean not null default false;

create index if not exists daily_logs_user_sabbath_idx
  on daily_logs (user_id, log_date)
  where is_sabbath = true;
