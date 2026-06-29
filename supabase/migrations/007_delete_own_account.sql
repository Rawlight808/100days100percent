-- Let a signed-in user permanently delete their own account.
-- Deleting the auth.users row cascades to items, daily_logs, streaks, and
-- caveat_events (all declared `on delete cascade` against auth.users).
create or replace function delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function delete_own_account() from public;
grant execute on function delete_own_account() to authenticated;
