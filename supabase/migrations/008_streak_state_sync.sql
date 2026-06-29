-- Move per-user challenge state off localStorage so it syncs across devices.
--   failed_day  : the day number on which the streak broke (drives the
--                 "failed" screen). Null when the challenge is intact.
--   advanced_to : the challenge-day the user manually jumped to via
--                 "Start Day N+1". Null when following the natural day.
alter table streaks
  add column if not exists failed_day int,
  add column if not exists advanced_to date;
