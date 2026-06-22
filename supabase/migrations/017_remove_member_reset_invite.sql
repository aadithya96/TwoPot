-- 017_remove_member_reset_invite.sql
-- Extends remove_member (016) so that removing a member also clears the
-- household's invite code. Two reasons:
--   1. Security: a removed partner must not be able to rejoin with an invite
--      code that was still within its 48h validity window.
--   2. UX: with the stored code cleared, the Household page treats it as stale
--      and auto-generates a fresh code, so the owner is immediately offered a
--      new code to invite someone else.
-- The signature is unchanged, so the frontend RPC call and types stay the same.

create or replace function public.remove_member(
  p_household_id uuid,
  p_member_id uuid,
  p_keep_expenses boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Caller must be the owner of this household.
  if not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = uid
      and hm.role = 'owner'
  ) then
    raise exception 'Only the household owner can remove members';
  end if;

  if p_member_id = uid then
    raise exception 'You cannot remove yourself';
  end if;

  -- The target must be an existing, non-owner member of this household.
  if not exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_member_id
  ) then
    raise exception 'Member not found in this household';
  end if;

  if exists (
    select 1 from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_member_id
      and hm.role = 'owner'
  ) then
    raise exception 'Cannot remove a household owner';
  end if;

  -- When the owner opts to remove everything, delete the member's expenses
  -- (both shared and personal) and any settlements they were party to.
  if not p_keep_expenses then
    delete from public.settlements s
      where s.household_id = p_household_id
        and (s.owed_by = p_member_id or s.owed_to = p_member_id);

    delete from public.expenses e
      where e.household_id = p_household_id
        and (e.paid_by = p_member_id or e.personal_user_id = p_member_id);
  end if;

  delete from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id = p_member_id;

  -- Invalidate any outstanding invite so the removed member can't rejoin with
  -- it; the owner gets a freshly generated code next time they open the page.
  update public.households
    set invite_code = null,
        invite_expires_at = null
    where id = p_household_id;
end;
$$;
