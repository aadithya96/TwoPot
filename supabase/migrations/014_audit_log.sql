-- 014_audit_log.sql
-- Household activity / audit log. Records create / update / delete operations
-- performed by members across the core tables, so the household can review who
-- did what and when from Settings → Activity log.

create table public.audit_log (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  actor_id      uuid references public.profiles(id) on delete set null,
  action        text not null,             -- 'created' | 'updated' | 'deleted'
  entity_type   text not null,             -- source table, e.g. 'expenses'
  entity_id     text,                      -- primary key of the affected row
  summary       text,                      -- human label, e.g. an expense description
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_log_household_created_idx
  on public.audit_log (household_id, created_at desc);

-- Generic trigger: capture a change on any table that has a `household_id`
-- column and a `record_audit` AFTER trigger attached. Runs as security definer
-- so it can insert into audit_log regardless of the caller's row access; the
-- table itself is otherwise insert-locked at the policy level.
create or replace function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row     jsonb := to_jsonb(coalesce(new, old));
  v_action  text;
  v_summary text;
begin
  v_action := case tg_op
    when 'INSERT' then 'created'
    when 'UPDATE' then 'updated'
    when 'DELETE' then 'deleted'
  end;

  -- Pick the most human-friendly label available for the affected row.
  v_summary := coalesce(
    v_row->>'description',
    v_row->>'name',
    v_row->>'display_name'
  );

  insert into public.audit_log (
    household_id, actor_id, action, entity_type, entity_id, summary, metadata
  )
  values (
    (v_row->>'household_id')::uuid,
    auth.uid(),
    v_action,
    tg_table_name,
    coalesce(v_row->>'id', v_row->>'user_id'),
    v_summary,
    jsonb_strip_nulls(jsonb_build_object('amount', v_row->'amount'))
  );

  return coalesce(new, old);
end;
$$;

-- Attach the audit trigger to the core household-scoped tables.
create trigger audit_expenses
  after insert or update or delete on public.expenses
  for each row execute function public.record_audit();

create trigger audit_categories
  after insert or update or delete on public.categories
  for each row execute function public.record_audit();

create trigger audit_budgets
  after insert or update or delete on public.budgets
  for each row execute function public.record_audit();

create trigger audit_savings_goals
  after insert or update or delete on public.savings_goals
  for each row execute function public.record_audit();

create trigger audit_settlements
  after insert or update or delete on public.settlements
  for each row execute function public.record_audit();

create trigger audit_household_members
  after insert or delete on public.household_members
  for each row execute function public.record_audit();

-- RLS: household members may read their own household's log. Inserts happen
-- only through the security-definer trigger above, so no insert policy exists.
alter table public.audit_log enable row level security;

create policy "audit_log: household members read" on public.audit_log
  for select
  using (public.is_household_member(household_id));
