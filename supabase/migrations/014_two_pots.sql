-- 014_two_pots.sql
-- "Two pots" income model: a couple funds a shared pot for joint expenses while
-- keeping the remainder of their income in personal pots. An allocation rule
-- decides how the shared-pot target is funded by each partner:
--   * 'equal'        — both contribute half the target
--   * 'proportional' — each contributes in proportion to their income
--   * 'custom'       — each partner's contribution is set explicitly
-- All amounts are stored in paise, matching the rest of the app. Income is
-- already tracked on household_members (migration 013).

alter table public.households
  add column if not exists pot_enabled boolean not null default false,
  add column if not exists pot_allocation_rule text not null default 'proportional',
  add column if not exists shared_pot_target numeric;

-- Constrain the rule to the supported values. Added separately so re-running the
-- column add (if not exists) stays a no-op without duplicating the constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'households_pot_allocation_rule_check'
  ) then
    alter table public.households
      add constraint households_pot_allocation_rule_check
      check (pot_allocation_rule in ('equal', 'proportional', 'custom'));
  end if;
end $$;

-- Explicit per-member contribution to the shared pot, used by the 'custom' rule.
alter table public.household_members
  add column if not exists pot_contribution numeric;

-- No new RLS policies are needed: households already has a members-update policy
-- (009_rls.sql) and household_members gained one in 013_member_income.sql.
