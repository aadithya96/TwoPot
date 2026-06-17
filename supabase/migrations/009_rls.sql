-- 009_rls.sql
-- Enable Row Level Security on every table and define access policies.
-- General shape: a user may see/modify rows belonging to a household they
-- are a member of (via is_household_member). profiles are readable by
-- fellow household members and only self-editable. push_subscriptions are
-- visible/editable only by their owning user.

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.settlements enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper: is the current auth user a member of household `hid`?
-- security definer so it can read household_members regardless of the
-- caller's row-level access (avoids recursive policy evaluation).
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.household_members hm
    where hm.household_id = hid and hm.user_id = auth.uid()
  );
$$;

-- profiles: readable by anyone sharing a household with the row owner,
-- but only the owner can modify their own row.
create policy "profiles: household members read" on public.profiles
  for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.household_members mine
      join public.household_members theirs
        on theirs.household_id = mine.household_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profiles.id
    )
  );

create policy "profiles: self insert" on public.profiles
  for insert
  with check (id = auth.uid());

create policy "profiles: self update" on public.profiles
  for update
  using (id = auth.uid());

create policy "profiles: self delete" on public.profiles
  for delete
  using (id = auth.uid());

-- households: members can read/update their own household.
create policy "households: members read" on public.households
  for select
  using (public.is_household_member(id));

create policy "households: members insert" on public.households
  for insert
  with check (true);

create policy "households: members update" on public.households
  for update
  using (public.is_household_member(id));

-- household_members: visible to/manageable by members of that household.
create policy "household_members: members read" on public.household_members
  for select
  using (public.is_household_member(household_id));

create policy "household_members: self insert" on public.household_members
  for insert
  with check (user_id = auth.uid() or public.is_household_member(household_id));

create policy "household_members: members delete" on public.household_members
  for delete
  using (public.is_household_member(household_id));

-- categories: full CRUD for household members.
create policy "categories: household members" on public.categories
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- expenses: full CRUD for household members.
create policy "expenses: household members" on public.expenses
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- budgets: full CRUD for household members.
create policy "budgets: household members" on public.budgets
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- savings_goals: full CRUD for household members.
create policy "savings_goals: household members" on public.savings_goals
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- goal_contributions: scoped via the parent goal's household.
create policy "goal_contributions: household members" on public.goal_contributions
  for all
  using (
    exists (
      select 1 from public.savings_goals sg
      where sg.id = goal_contributions.goal_id
        and public.is_household_member(sg.household_id)
    )
  )
  with check (
    exists (
      select 1 from public.savings_goals sg
      where sg.id = goal_contributions.goal_id
        and public.is_household_member(sg.household_id)
    )
  );

-- settlements: full CRUD for household members.
create policy "settlements: household members" on public.settlements
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- push_subscriptions: only the owning user.
create policy "push_subscriptions: own" on public.push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
