-- 004_expenses.sql
-- The core expense ledger table.
-- `amount` is the actual currency value (e.g. 250.50); the app boundary is
-- responsible for any integer-cents <-> decimal conversion if it chooses one.
-- `goal_id` is a plain uuid here (no FK yet) because savings_goals does not
-- exist until migration 006 — the FK constraint is added there.

create table public.expenses (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references public.households(id) on delete cascade,
  category_id       uuid references public.categories(id) on delete set null,
  paid_by           uuid not null references public.profiles(id),
  owner             text not null default 'shared' check (owner in ('shared', 'personal')),
  personal_user_id  uuid references public.profiles(id),
  amount            numeric(12, 2) not null check (amount > 0),
  description       text not null,
  notes             text,
  date              date not null default current_date,
  split_type        text not null default 'equal' check (split_type in ('equal', 'custom', 'payer_covers')),
  split_pct_a       numeric(5, 2),
  is_recurring      boolean not null default false,
  recurrence_rule   text,
  receipt_url       text,
  goal_id           uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index expenses_household_date_idx on public.expenses(household_id, date);
create index expenses_household_category_idx on public.expenses(household_id, category_id);

-- Shared updated_at trigger helper, reused by later migrations too.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute procedure public.update_updated_at();
