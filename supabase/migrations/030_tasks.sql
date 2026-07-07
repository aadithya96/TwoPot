-- 030_tasks.sql
-- A shared checklist for the household, rendered on one page as two sections: a
-- "Tasks" list and a "Things to buy" shopping list. Both live in a single table
-- and are told apart by the `kind` discriminator, since they share every field
-- (title, done flag, optional due date, optional assignee, priority).
--
-- household_id is denormalised onto every row so the realtime client can filter
-- changes with the same household_id=eq.<id> predicate it uses for every other
-- table (see 024_realtime_publication.sql).

create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  -- Which section the item belongs to on the tasks page.
  kind          text not null default 'task' check (kind in ('task', 'buy')),
  title         text not null,
  done          boolean not null default false,
  completed_at  timestamptz,
  due_date      date,
  -- Household member the item is assigned to; null means unassigned. Set null on
  -- member removal rather than deleting the item.
  assignee_id   uuid references public.profiles(id) on delete set null,
  priority      text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_household_id_idx on public.tasks (household_id);

-- RLS: household members get full CRUD on their own household's rows, matching
-- the shape used by every other household-scoped table (see 009_rls.sql).
alter table public.tasks enable row level security;

create policy "tasks: household members" on public.tasks
  for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Realtime: stream changes to both partners' devices. replica identity full so
-- DELETE/UPDATE events carry household_id for the client-side filter (see
-- 024_realtime_publication.sql for the full rationale).
alter table public.tasks replica identity full;

alter publication supabase_realtime add table public.tasks;

-- Table-level grants for tables created via plain CREATE TABLE (see 023_grants.sql).
grant all on public.tasks to anon, authenticated, service_role;
