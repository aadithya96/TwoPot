-- 007_settlements.sql
-- Monthly settlement records, a view computing per-month flows between
-- members from shared expenses, and an RPC that nets those flows out into
-- a single "who owes whom" result per household/month.

create table public.settlements (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  period_month  date not null, -- first day of the month, e.g. 2025-06-01
  amount        numeric(12, 2) not null,
  owed_by       uuid not null references public.profiles(id),
  owed_to       uuid not null references public.profiles(id),
  settled       boolean not null default false,
  settled_at    timestamptz,
  created_at    timestamptz not null default now()
);

create unique index settlements_household_period_idx
  on public.settlements(household_id, period_month);

-- View: gross amount each payer is owed by the rest of the household for a
-- given month, based on each shared expense's split configuration.
-- - 'equal' split: counterpart owes half.
-- - 'custom' split: split_pct_a is the percentage owed by the *first*
--   (by joined_at) household member; if the payer is that member, the
--   counterpart owes (100 - split_pct_a)%, otherwise the counterpart owes
--   split_pct_a%.
-- - 'payer_covers': payer bears the full cost, counterpart owes nothing.
create or replace view public.monthly_settlement as
with member_order as (
  select
    household_id,
    user_id,
    row_number() over (partition by household_id order by joined_at) as member_rank
  from public.household_members
),
shared_expenses as (
  select
    e.id,
    e.household_id,
    date_trunc('month', e.date)::date as period_month,
    e.paid_by,
    e.amount,
    e.split_type,
    e.split_pct_a,
    (select user_id from member_order mo
       where mo.household_id = e.household_id and mo.member_rank = 1) as member_a
  from public.expenses e
  where e.owner = 'shared'
),
flows as (
  select
    se.household_id,
    se.period_month,
    se.paid_by as owed_to,
    hm.user_id as owed_by,
    case
      when se.split_type = 'payer_covers' then 0
      when se.split_type = 'custom' then
        round(
          se.amount * (
            case
              when se.paid_by = se.member_a then (100 - coalesce(se.split_pct_a, 50))
              else coalesce(se.split_pct_a, 50)
            end
          ) / 100,
          2
        )
      else round(se.amount / 2, 2)
    end as owed_amount
  from shared_expenses se
  join public.household_members hm
    on hm.household_id = se.household_id
   and hm.user_id != se.paid_by
)
select
  household_id,
  period_month,
  owed_by,
  owed_to,
  sum(owed_amount) as amount
from flows
group by household_id, period_month, owed_by, owed_to;

-- Nets the two-way flows for a household/month into a single settlement
-- (owed_by, owed_to, amount). Returns no rows if there are no shared
-- expenses or both members are square.
create or replace function public.compute_settlement(household_id uuid, period_month date)
returns table (
  owed_by  uuid,
  owed_to  uuid,
  amount   numeric
)
language plpgsql
as $$
declare
  user_a uuid;
  user_b uuid;
  a_owes_b numeric;
  b_owes_a numeric;
  net numeric;
  target_month date := date_trunc('month', period_month)::date;
begin
  select hm.user_id into user_a
    from public.household_members hm
    where hm.household_id = compute_settlement.household_id
    order by hm.joined_at
    limit 1;

  select hm.user_id into user_b
    from public.household_members hm
    where hm.household_id = compute_settlement.household_id
      and hm.user_id != user_a
    order by hm.joined_at
    limit 1;

  if user_a is null or user_b is null then
    return;
  end if;

  select coalesce(ms.amount, 0) into a_owes_b
    from public.monthly_settlement ms
    where ms.household_id = compute_settlement.household_id
      and ms.period_month = target_month
      and ms.owed_by = user_a and ms.owed_to = user_b;

  select coalesce(ms.amount, 0) into b_owes_a
    from public.monthly_settlement ms
    where ms.household_id = compute_settlement.household_id
      and ms.period_month = target_month
      and ms.owed_by = user_b and ms.owed_to = user_a;

  net := coalesce(a_owes_b, 0) - coalesce(b_owes_a, 0);

  if net > 0 then
    return query select user_a, user_b, net;
  elsif net < 0 then
    return query select user_b, user_a, abs(net);
  else
    return query select user_a, user_b, 0::numeric;
  end if;
end;
$$;
