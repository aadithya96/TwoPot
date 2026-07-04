-- 021_balance_trend_running.sql
-- Reworks balance_trend into a true "partner balance over time":
--
-- The 020 version returned each month's net shared-expense flow in isolation,
-- ignoring recorded settlements — so a month the couple had already settled
-- still charted as money owed, and the line was per-month flow rather than a
-- balance. This version returns, per month:
--   * net_amount         — that month's shared-expense flows netted out
--   * outstanding_amount — net_amount minus any settled amount recorded for
--                          the month (0 once the month is marked settled)
--   * running_balance    — cumulative outstanding balance up to and including
--                          the month, i.e. what one partner actually owes the
--                          other at that point in time
--
-- All values are signed from member_a's (the earlier-joined member's)
-- perspective: positive means member_b owes member_a.
--
-- The return signature changes, so the old function must be dropped first
-- (create or replace cannot change out parameters).

drop function if exists public.balance_trend(uuid, integer);

create function public.balance_trend(p_household_id uuid, p_months integer default 12)
returns table (
  period_month       date,
  member_a           uuid, -- earlier-joined member; positive amounts mean they're owed money
  member_b           uuid,
  net_amount         numeric,
  outstanding_amount numeric,
  running_balance    numeric
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
  with flows as (
    select
      ms.period_month as pm,
      sum(case when ms.owed_by = user_b then ms.amount else -ms.amount end) as net
    from public.monthly_settlement ms
    where ms.household_id = p_household_id
    group by ms.period_month
  ),
  settled as (
    select
      s.period_month as pm,
      sum(case when s.owed_by = user_b then s.amount else -s.amount end) as settled_net
    from public.settlements s
    where s.household_id = p_household_id
      and s.settled
    group by s.period_month
  ),
  months as (
    select
      coalesce(f.pm, st.pm) as pm,
      coalesce(f.net, 0) as net,
      coalesce(st.settled_net, 0) as settled_net
    from flows f
    full outer join settled st on st.pm = f.pm
  ),
  -- The running balance is computed over the household's full history so
  -- that limiting the chart window to p_months doesn't shift the baseline.
  running as (
    select
      m.pm,
      m.net,
      m.net - m.settled_net as outstanding,
      sum(m.net - m.settled_net) over (order by m.pm) as balance
    from months m
  ),
  recent as (
    select r.pm, r.net, r.outstanding, r.balance
    from running r
    order by r.pm desc
    limit p_months
  )
  select rec.pm, user_a, user_b, rec.net, rec.outstanding, rec.balance
  from recent rec
  order by rec.pm;
end;
$$;
