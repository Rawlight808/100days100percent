-- 1) Per-user settings: whether the user shares their selected habit list
--    with the coach (the admin). Private by default.
create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  share_items_with_coach boolean default false not null,
  updated_at timestamptz default now()
);

alter table user_settings enable row level security;

create policy "Users manage own settings" on user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) Admin: list every user with their streak state and sharing status.
--    Display-day math happens client-side (needs the admin's local "today").
create or replace function admin_list_users()
returns table (
  user_id uuid,
  email text,
  created_at timestamptz,
  current_day int,
  streak_start_date date,
  last_perfect_date date,
  failed_day int,
  items_count int,
  top_twelve_count int,
  share_items_with_coach boolean
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
    u.created_at,
    coalesce(s.current_day, 0) as current_day,
    s.streak_start_date,
    s.last_perfect_date,
    s.failed_day,
    (select count(*)::int from items i where i.user_id = u.id) as items_count,
    (select count(*)::int from items i where i.user_id = u.id and i.is_top_twelve = true) as top_twelve_count,
    coalesce(us.share_items_with_coach, false) as share_items_with_coach
  from auth.users u
  left join streaks s on s.user_id = u.id
  left join user_settings us on us.user_id = u.id
  order by coalesce(s.current_day, 0) desc, u.created_at;
end;
$$;

revoke all on function admin_list_users() from public;
grant execute on function admin_list_users() to authenticated;

-- 3) Admin: view a user's selected habits — only if they've opted in.
create or replace function admin_get_user_items(target_user uuid)
returns table (
  id uuid,
  text text,
  "position" int,
  caveat text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_email text;
  is_shared boolean;
begin
  select au.email::text into caller_email from auth.users au where au.id = auth.uid();
  if caller_email is null or lower(caller_email) <> 'rawlight@gmail.com' then
    raise exception 'forbidden: admin only';
  end if;

  select us.share_items_with_coach into is_shared
  from user_settings us where us.user_id = target_user;

  if coalesce(is_shared, false) = false then
    raise exception 'This user has not shared their list with the coach.';
  end if;

  return query
  select i.id, i.text, i.position, i.caveat
  from items i
  where i.user_id = target_user and i.is_top_twelve = true
  order by i.position;
end;
$$;

revoke all on function admin_get_user_items(uuid) from public;
grant execute on function admin_get_user_items(uuid) to authenticated;
