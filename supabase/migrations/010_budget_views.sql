-- 010_budget_views.sql
-- A view computing per-category spend for the current period, and a
-- function to carry forward unused rollover budgets into the next month.

create or replace view public.budget_usage as
select
  b.household_id,
  b.category_id,
  c.name as category_name,
  c.icon as category_icon,
  c.color as category_color,
  b.amount as budget_amount,
  coalesce(sum(e.amount), 0) as spent_amount,
  date_trunc('month', current_date)::date as period_month
from public.budgets b
join public.categories c on c.id = b.category_id
left join public.expenses e
  on e.household_id = b.household_id
  and e.category_id = b.category_id
  and e.owner = 'shared'
  and e.date >= date_trunc('month', current_date)
  and e.date < date_trunc('month', current_date) + interval '1 month'
where b.period = 'monthly'
group by b.household_id, b.category_id, c.name, c.icon, c.color, b.amount;

-- Budgets are a single persistent row per (household, category, period) —
-- there is no month-scoped budget history table. "Rollover" therefore means:
-- for budgets with rollover = true, fold last month's unused amount into
-- the row's `amount`, so next month's effective limit is base + leftover.
-- Designed to be called once a month (e.g. via pg_cron on the 1st), looking
-- back at the month that just ended; scheduling itself is out of scope here.
create or replace function public.process_budget_rollover()
returns void
language plpgsql
as $$
declare
  b record;
  spent numeric;
  unused numeric;
  prev_month_start date := date_trunc('month', current_date)::date - interval '1 month';
  prev_month_end date := date_trunc('month', current_date)::date;
begin
  for b in
    select * from public.budgets where rollover = true and period = 'monthly'
  loop
    select coalesce(sum(e.amount), 0) into spent
      from public.expenses e
      where e.household_id = b.household_id
        and e.category_id = b.category_id
        and e.owner = 'shared'
        and e.date >= prev_month_start
        and e.date < prev_month_end;

    unused := greatest(b.amount - spent, 0);

    if unused > 0 then
      update public.budgets
        set amount = b.amount + unused
        where id = b.id;
    end if;
  end loop;
end;
$$;
