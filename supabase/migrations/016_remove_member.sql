-- 016_remove_member.sql
-- Owner-initiated member removal. The household owner can remove another
-- member, choosing whether to keep that member's expenses in the shared
-- ledger (`p_keep_expenses = true`) or delete everything they contributed.
--
-- Runs as security definer so the deletes aren't blocked by the removed
-- member's row-level access. The function enforces that the caller is the
-- household's owner and is not removing themselves or another owner. The
-- removed member keeps their global profile/account; only their membership
-- (and, optionally, their expenses) in this household is affected.

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
  -- Settlements are netted monthly records that would otherwise be stale once
  -- the underlying expenses are gone.
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
end;
$$;
