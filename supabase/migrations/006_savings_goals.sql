-- 006_savings_goals.sql
-- Household savings goals + a contribution ledger, and wires up the
-- expenses.goal_id FK that was left dangling in 004_expenses.sql.

create table public.savings_goals (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  icon            text not null default 'Flag',
  color           text not null default '#6366f1',
  target_amount   numeric(12, 2) not null check (target_amount > 0),
  current_amount  numeric(12, 2) not null default 0,
  deadline        date,
  completed_at    timestamptz,
  created_at      timestamptz not null default now()
);

create table public.goal_contributions (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid not null references public.savings_goals(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  amount      numeric(12, 2) not null check (amount > 0),
  note        text,
  created_at  timestamptz not null default now()
);

-- Atomically increment a goal's current_amount, marking it completed when
-- the target is reached.
create or replace function public.increment_goal_amount(goal_id uuid, delta numeric)
returns void
language plpgsql
as $$
begin
  update public.savings_goals
    set current_amount = current_amount + delta,
        completed_at = case
          when current_amount + delta >= target_amount and completed_at is null then now()
          when current_amount + delta < target_amount then null
          else completed_at
        end
    where id = increment_goal_amount.goal_id;
end;
$$;

-- Now that savings_goals exists, wire up the expenses.goal_id FK.
alter table public.expenses
  add constraint expenses_goal_id_fkey
  foreign key (goal_id) references public.savings_goals(id) on delete set null;
