-- Admin functions for managing user challenge state.
-- Gated by email allowlist inside the function so security_definer is safe.

create or replace function admin_get_user_status(target_email text)
returns table (
  user_id uuid,
  email text,
  current_day int,
  streak_start_date date,
  last_perfect_date date,
  items_count int,
  top_twelve_count int
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
begin
  select au.email::text into caller_email from auth.users au where au.id = auth.uid();
  if caller_email is null or lower(caller_email) <> 'rawlight@gmail.com' then
    raise exception 'forbidden: admin only';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    coalesce(s.current_day, 0) as current_day,
    s.streak_start_date,
    s.last_perfect_date,
    (select count(*)::int from items i where i.user_id = u.id) as items_count,
    (select count(*)::int from items i where i.user_id = u.id and i.is_top_twelve = true) as top_twelve_count
  from auth.users u
  left join streaks s on s.user_id = u.id
  where lower(u.email) = lower(target_email);
end;
$$;

revoke all on function admin_get_user_status(text) from public;
grant execute on function admin_get_user_status(text) to authenticated;


create or replace function admin_set_user_day(target_user uuid, new_day int)
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

  -- Today IS day N, nothing checked yet:
  --   current_day stores N-1, last_perfect_date = yesterday, so the
  --   client's displayDay logic returns current_day + 1 = N.
  start_date := current_date - (new_day - 1);
  perfect_date := current_date - 1;
  stored_current := new_day - 1;

  -- Special-case day 1: nothing has happened yet, so leave last_perfect_date null
  -- to match the natural "fresh start" state.
  if new_day = 1 then
    stored_perfect := null;
    stored_start := current_date;
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

revoke all on function admin_set_user_day(uuid, int) from public;
grant execute on function admin_set_user_day(uuid, int) to authenticated;
