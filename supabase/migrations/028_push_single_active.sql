-- 028_push_single_active.sql
-- One *active* push subscription per user: the most recently active device.
--
-- The app has always upserted push_subscriptions with ON CONFLICT (user_id),
-- but 008 only made `endpoint` unique — there was never a unique constraint
-- on user_id for that upsert to target, so enabling notifications a second
-- time errored (42P10). Rather than move to multi-device rows, the product
-- choice is a single active subscription per user that follows whichever
-- device used the app last: the client re-asserts its subscription on every
-- app open, so reopening a previously displaced device makes it active again.
--
-- Dedupe any existing rows (keep each user's newest) before adding the
-- constraint the upsert needs.

delete from public.push_subscriptions
where id not in (
  select distinct on (user_id) id
  from public.push_subscriptions
  order by user_id, created_at desc, id desc
);

alter table public.push_subscriptions
  add constraint push_subscriptions_user_id_key unique (user_id);
