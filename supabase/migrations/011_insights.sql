-- 011_insights.sql
-- RPCs backing the insights dashboard: per-category spend for a month,
-- a multi-month spend trend, and per-member monthly contribution totals.
-- All three are SECURITY INVOKER (the default) so they run with the
-- caller's privileges and are subject to the existing RLS policies on
-- expenses/profiles/household_members — no household-membership check is
-- duplicated here.

create or replace function public.monthly_by_category(p_household_id uuid, p_month text)
returns table (
  category_id    uuid,
  category_name  text,
  category_color text,
  total_amount   numeric
)
language sql
stable
as $$
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
  having coalesce(sum(e.amount), 0) > 0
  order by total_amount desc;
$$;

create or replace function public.monthly_trend(p_household_id uuid)
returns table (
  month        text,
  total_amount numeric
)
language sql
stable
as $$
  select
    to_char(month_start, 'YYYY-MM') as month,
    coalesce(sum(e.amount), 0) as total_amount
  from generate_series(
    date_trunc('month', current_date) - interval '5 months',
    date_trunc('month', current_date),
    interval '1 month'
  ) as month_start
  left join public.expenses e
    on e.household_id = p_household_id
    and e.owner = 'shared'
    and e.date >= month_start
    and e.date < month_start + interval '1 month'
  group by month_start
  order by month_start;
$$;

create or replace function public.person_contributions(p_household_id uuid)
returns table (
  month        text,
  user_id      uuid,
  display_name text,
  total_amount numeric
)
language sql
stable
as $$
  select
    to_char(month_start, 'YYYY-MM') as month,
    p.id as user_id,
    p.display_name,
    coalesce(sum(e.amount), 0) as total_amount
  from generate_series(
    date_trunc('month', current_date) - interval '5 months',
    date_trunc('month', current_date),
    interval '1 month'
  ) as month_start
  cross join (
    select pr.id, pr.display_name
    from public.household_members hm
    join public.profiles pr on pr.id = hm.user_id
    where hm.household_id = p_household_id
  ) as p
  left join public.expenses e
    on e.paid_by = p.id
    and e.household_id = p_household_id
    and e.owner = 'shared'
    and e.date >= month_start
    and e.date < month_start + interval '1 month'
  group by month_start, p.id, p.display_name
  order by month_start, p.display_name;
$$;
