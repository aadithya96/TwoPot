-- 020_balance_trend.sql
-- "Partner balance over time": nets the monthly_settlement view (introduced
-- in 007_settlements.sql) into a single running balance per month, signed
-- from the perspective of the earlier-joined member, so the frontend can
-- chart a continuous who-owes-whom trend instead of just the current month.

create or replace function public.balance_trend(p_household_id uuid, p_months integer default 12)
returns table (
  period_month date,
  member_a     uuid, -- earlier-joined member; positive net_amount means they're owed money
  member_b     uuid,
  net_amount   numeric
)
language plpgsql
as $$
declare
  user_a uuid;
  user_b uuid;
begin
  select hm.user_id into user_a
    from public.household_members hm
    where hm.household_id = p_household_id
    order by hm.joined_at
    limit 1;

  select hm.user_id into user_b
    from public.household_members hm
    where hm.household_id = p_household_id
      and hm.user_id != user_a
    order by hm.joined_at
    limit 1;

  if user_a is null or user_b is null then
    return;
  end if;

  return query
  select
    months.period_month,
    user_a,
    user_b,
    coalesce(b_owes_a.amount, 0) - coalesce(a_owes_b.amount, 0) as net_amount
  from (
    select distinct ms.period_month
    from public.monthly_settlement ms
    where ms.household_id = p_household_id
    order by ms.period_month desc
    limit p_months
  ) months
  left join public.monthly_settlement b_owes_a
    on b_owes_a.household_id = p_household_id
   and b_owes_a.period_month = months.period_month
   and b_owes_a.owed_by = user_b and b_owes_a.owed_to = user_a
  left join public.monthly_settlement a_owes_b
    on a_owes_b.household_id = p_household_id
   and a_owes_b.period_month = months.period_month
   and a_owes_b.owed_by = user_a and a_owes_b.owed_to = user_b
  order by months.period_month;
end;
$$;
