-- 019_audit_skip_deleted_household.sql
-- Fix: leaving (and thereby deleting) a household failed with
--   insert or update on table "audit_log" violates foreign key constraint
--   "audit_log_household_id_fkey"
--
-- When a household is deleted -- e.g. the last member leaves via
-- leave_household (018) -- ON DELETE CASCADE tears down its child rows:
-- categories (seeded defaults always exist), expenses, budgets, savings_goals,
-- settlements and memberships. Each of those tables carries an AFTER DELETE
-- `record_audit` trigger (014) that INSERTs an audit_log row referencing the
-- household. Because the household is being deleted in the same statement, that
-- insert violates audit_log_household_id_fkey and aborts the caller's whole
-- transaction, so the user can never leave a solo household.
--
-- Audit rows for a household that is going away are pointless (they'd be
-- cascade-deleted the instant the household row is gone). So make record_audit
-- tolerate it: if the audit insert hits a foreign-key violation (the parent
-- household no longer exists), skip the row instead of failing the operation.
-- Normal audit logging, where the household still exists, is unchanged.

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

  begin
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
  exception
    when foreign_key_violation then
      -- The parent household is being deleted in this same statement (cascade
      -- teardown); the audit row would be cascade-deleted anyway. Skip it.
      null;
  end;

  return coalesce(new, old);
end;
$$;
