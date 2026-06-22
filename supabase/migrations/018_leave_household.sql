-- 018_leave_household.sql
-- Lets a member voluntarily leave their household so they can create or join a
-- different one. There was previously no way out: remove_member (016/017) is
-- owner-initiated and explicitly forbids removing yourself or an owner, so a
-- user who created a household had no way to exit it.
--
-- Behaviour:
--   * Last member leaving (a solo household): the whole household is deleted.
--     ON DELETE CASCADE on household_members / expenses / etc. cleans up the
--     rest of its data.
--   * A non-owner leaving a shared household: only their membership is removed.
--   * The owner leaving a shared household: ownership is handed to the remaining
--     member so the household isn't left ownerless, and any outstanding invite
--     code is cleared.
--
-- The caller's own expenses and settlements are left in the household ledger for
-- whoever remains; leaving disassociates the user, it doesn't scrub their data.
-- Runs as security definer so the membership delete / ownership transfer aren't
-- blocked once the caller's own row-level access to the household is gone.

create or replace function public.leave_household(p_household_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  is_owner boolean;
  remaining int;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Caller must be a member of this household.
  select (role = 'owner') into is_owner
    from public.household_members
    where household_id = p_household_id
      and user_id = uid;

  if not found then
    raise exception 'You are not a member of this household';
  end if;

  delete from public.household_members
    where household_id = p_household_id
      and user_id = uid;

  select count(*) into remaining
    from public.household_members
    where household_id = p_household_id;

  if remaining = 0 then
    -- Nobody left: remove the household entirely (cascades to all its data).
    delete from public.households where id = p_household_id;
  elsif is_owner then
    -- Hand ownership to the longest-standing remaining member so the household
    -- keeps an owner, and void any outstanding invite the leaver had generated.
    update public.household_members
      set role = 'owner'
      where household_id = p_household_id
        and user_id = (
          select user_id from public.household_members
          where household_id = p_household_id
          order by joined_at asc
          limit 1
        );

    update public.households
      set invite_code = null,
          invite_expires_at = null
      where id = p_household_id;
  end if;
end;
$$;
