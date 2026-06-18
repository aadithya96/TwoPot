-- 012_create_household.sql
-- Atomic household creation.
--
-- Creating a household from the client used to require three separate,
-- RLS-gated writes: insert the household, insert the creator's membership,
-- then read the household back. That flow is fragile:
--   * the INSERT on households needs a permissive insert policy, and
--   * the `return=representation` read-back is filtered by the SELECT policy
--     `is_household_member(id)`, which is false until the membership row
--     exists -- so the creator cannot see the row they just inserted.
--
-- This security-definer function performs the household insert and the
-- creator's owner-membership in a single transaction and returns the new
-- household row, sidestepping the RLS read-back race entirely.

create or replace function public.create_household(name text)
returns public.households
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  rec public.households;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.households (name)
    values (coalesce(nullif(create_household.name, ''), 'Our Home'))
    returning * into rec;

  insert into public.household_members (household_id, user_id, role)
    values (rec.id, uid, 'owner');

  return rec;
end;
$$;
