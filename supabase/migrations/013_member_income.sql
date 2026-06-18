-- 013_member_income.sql
-- Income-based fair splitting. Stores each household member's (monthly) income
-- so shared expenses can default to a split proportional to income instead of
-- 50/50. Amounts are stored in paise, matching the rest of the app.

alter table public.household_members
  add column if not exists income numeric;

-- Household-level toggle: when on, new shared expenses default to a custom
-- split derived from member incomes (computed client-side).
alter table public.households
  add column if not exists income_split_enabled boolean not null default false;

-- household_members previously had no UPDATE policy, so members could not edit
-- income. Allow members to update rows within their own household (consistent
-- with the read/insert/delete policies already in 009_rls.sql).
create policy "household_members: members update" on public.household_members
  for update
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
