-- 032_audit_recurring_actor.sql
-- Two fixes to the activity/audit trail for the recurring-expense generator,
-- which runs in the `recurring-expenses` edge function under the service role
-- (so auth.uid() is null). Each month, per due recurring expense, it INSERTs
-- next month's copy and UPDATEs the template row's date. The generic
-- record_audit trigger (014, last redefined in 019) therefore wrote two audit
-- rows with a null actor, surfacing in the feed as:
--   "Someone added expense" and "Someone updated expense"
-- -- untracked, and the date-advance one is pure bookkeeping noise.
--
-- Fix 1: skip auditing the recurring date-advance. It's a service-role update
--   (auth.uid() null) that only rolls a recurring template's `date` forward --
--   not a human edit. Manual date edits (auth.uid() present) are still audited.
-- Fix 2: when there's no authenticated user, attribute the write to the row's
--   payer (`paid_by`) so the activity names a person instead of "Someone".
--   Tables without a paid_by column simply yield null (unchanged behaviour).
--
-- The foreign-key-violation guard from 019 (skip audit rows for a household that
-- is being cascade-deleted) is preserved.

create or replace function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new     jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old     jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row     jsonb := coalesce(v_new, v_old);
  v_action  text;
  v_summary text;
  v_actor   uuid;
begin
  -- Fix 1: don't audit the recurring generator's monthly date-advance -- a
  -- service-role update that only moves a recurring template's date forward.
  if tg_op = 'UPDATE'
     and auth.uid() is null
     and (v_new->>'is_recurring') = 'true'
     and (v_new->>'date') is distinct from (v_old->>'date') then
    return new;
  end if;

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

  -- Fix 2: attribute to the acting user, or the row's payer when a background
  -- job (no auth.uid()) made the change, so the feed names a person.
  v_actor := coalesce(auth.uid(), (v_row->>'paid_by')::uuid);

  begin
    insert into public.audit_log (
      household_id, actor_id, action, entity_type, entity_id, summary, metadata
    )
    values (
      (v_row->>'household_id')::uuid,
      v_actor,
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
