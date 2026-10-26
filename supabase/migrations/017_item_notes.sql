-- A personal note on a rule. Unlike a caveat, it does not expire and does
-- not spend the weekly caveat allowance.
alter table items
  add column if not exists note text;

-- Coach view includes the note. Return type changes, so replace the function.
drop function if exists admin_get_user_items(uuid);

create or replace function admin_get_user_items(target_user uuid)
returns table (
  id uuid,
  text text,
  "position" int,
  caveat text,
  note text
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
  select i.id, i.text, i.position, i.caveat, i.note
  from items i
  where i.user_id = target_user and i.is_top_twelve = true
  order by i.position;
end;
$$;

revoke all on function admin_get_user_items(uuid) from public;
grant execute on function admin_get_user_items(uuid) to authenticated;
