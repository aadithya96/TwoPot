-- 005_budgets.sql
-- Per-household, per-category budget limits.

create table public.budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete cascade,
  amount        numeric(12, 2) not null check (amount > 0),
  period        text not null default 'monthly' check (period in ('monthly', 'yearly')),
  rollover      boolean not null default false,
  created_at    timestamptz not null default now()
);

create unique index budgets_household_category_period_idx
  on public.budgets(household_id, category_id, period);
