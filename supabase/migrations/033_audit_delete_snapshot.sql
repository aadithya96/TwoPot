-- 033_audit_delete_snapshot.sql
-- Make deleted expenses restorable from the activity log.
--
-- Deleting an expense is a hard DELETE (see useDeleteExpense) -- the row is gone
-- and, until now, unrecoverable. The activity log recorded that a delete
-- happened but kept only the amount in metadata, which isn't enough to rebuild
-- the row. This teaches record_audit to stash the full pre-delete row snapshot
-- in the audit entry's metadata (`metadata.snapshot`) for expense deletions, so
-- the UI can show the deleted expense's details and offer a one-tap restore
-- that simply re-inserts the captured row.
--
-- Only expense deletions carry a snapshot: they're the sole entity the UI knows
-- how to restore, and limiting it keeps other audit rows lean. Everything else
-- about the trigger -- the recurring date-advance skip and payer-actor fallback
-- (032) and the cascade foreign-key guard (019) -- is preserved unchanged.

create or replace function public.record_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new      jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_old      jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_row      jsonb := coalesce(v_new, v_old);
  v_action   text;
  v_summary  text;
  v_actor    uuid;
  v_metadata jsonb;
begin
  -- Don't audit the recurring generator's monthly date-advance -- a
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

  -- Attribute to the acting user, or the row's payer when a background job
  -- (no auth.uid()) made the change, so the feed names a person.
  v_actor := coalesce(auth.uid(), (v_row->>'paid_by')::uuid);

  v_metadata := jsonb_strip_nulls(jsonb_build_object('amount', v_row->'amount'));

  -- Capture the full pre-delete row so an expense deletion can be undone: the
  -- restore path re-inserts this snapshot verbatim.
  if tg_op = 'DELETE' and tg_table_name = 'expenses' then
    v_metadata := v_metadata || jsonb_build_object('snapshot', v_old);
  end if;

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
      v_metadata
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
