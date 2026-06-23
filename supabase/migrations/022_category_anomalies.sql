-- 022_category_anomalies.sql
-- "Anomaly nudges": flags categories whose shared spend this month is running
-- well above that category's recent average, e.g. "Dining is 2.1x your usual
-- this month". SECURITY INVOKER (the default), same RLS posture as the other
-- insights RPCs in 011_insights.sql.

create or replace function public.category_anomalies(p_household_id uuid, p_month text)
returns table (
  category_id    uuid,
  category_name  text,
  category_color text,
  current_amount numeric,
  avg_amount     numeric,
  ratio          numeric
)
language sql
stable
as $$
  with current_month as (
    select
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      coalesce(sum(e.amount), 0) as total_amount
    from public.categories c
    left join public.expenses e
      on e.category_id = c.id
      and e.household_id = p_household_id
      and e.owner = 'shared'
      and e.date >= (p_month || '-01')::date
      and e.date < ((p_month || '-01')::date + interval '1 month')
    where c.household_id = p_household_id
    group by c.id, c.name, c.color
  ),
  history as (
    select
      e.category_id,
      avg(month_total) as avg_amount
    from (
      select
        e.category_id,
        date_trunc('month', e.date) as month_start,
        sum(e.amount) as month_total
      from public.expenses e
      where e.household_id = p_household_id
        and e.owner = 'shared'
        and e.category_id is not null
        and e.date >= (p_month || '-01')::date - interval '3 months'
        and e.date < (p_month || '-01')::date
      group by e.category_id, date_trunc('month', e.date)
    ) e
    group by e.category_id
  )
  select
    cm.category_id,
    cm.category_name,
    cm.category_color,
    cm.total_amount as current_amount,
    h.avg_amount,
    round(cm.total_amount / h.avg_amount, 2) as ratio
  from current_month cm
  join history h on h.category_id = cm.category_id
  where h.avg_amount > 0
    and cm.total_amount >= h.avg_amount * 1.5
  order by ratio desc
  limit 4;
$$;
