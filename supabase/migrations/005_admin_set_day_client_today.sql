-- Fix: admin_set_user_day must compute "yesterday" relative to the admin's
-- local day, not the database's UTC current_date. Otherwise users on
-- timezones west of UTC see an off-by-one (e.g. asked for Day 5, see Day 4).
--
-- The admin's client passes its own "today" string; the function defaults to
-- the DB's current_date if not supplied (preserves the old behavior).

create or replace function admin_set_user_day(
  target_user uuid,
  new_day int,
  client_today date default current_date
)
returns table (
  user_id uuid,
  current_day int,
  streak_start_date date,
  last_perfect_date date
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
  start_date date;
  perfect_date date;
  stored_current int;
  stored_start date;
  stored_perfect date;
begin
  select au.email::text into caller_email from auth.users au where au.id = auth.uid();
  if caller_email is null or lower(caller_email) <> 'rawlight@gmail.com' then
    raise exception 'forbidden: admin only';
  end if;

  if new_day < 1 or new_day > 100 then
    raise exception 'invalid day: must be between 1 and 100';
  end if;

  start_date := client_today - (new_day - 1);
  perfect_date := client_today - 1;
  stored_current := new_day - 1;

  if new_day = 1 then
    stored_perfect := null;
    stored_start := client_today;
  else
    stored_perfect := perfect_date;
    stored_start := start_date;
  end if;

  update streaks s
    set current_day = stored_current,
        streak_start_date = stored_start,
        last_perfect_date = stored_perfect,
        updated_at = now()
    where s.user_id = target_user;

  if not found then
    insert into streaks (user_id, current_day, streak_start_date, last_perfect_date)
    values (target_user, stored_current, stored_start, stored_perfect);
  end if;

  return query
  select s.user_id, s.current_day, s.streak_start_date, s.last_perfect_date
  from streaks s
  where s.user_id = target_user;
end;
$$;

revoke all on function admin_set_user_day(uuid, int, date) from public;
grant execute on function admin_set_user_day(uuid, int, date) to authenticated;
