-- 024_realtime_publication.sql
-- Supabase Realtime only streams `postgres_changes` for tables that belong to
-- the `supabase_realtime` publication. Every table here was created with a
-- plain `CREATE TABLE` in an earlier migration, so none of them were ever
-- added to that publication -- the client subscriptions in RealtimeProvider
-- connect successfully (status SUBSCRIBED) but never receive a single change
-- event, so an expense added by one partner never appears for the other
-- without a manual refresh.
--
-- Adding the tables to the publication fixes inserts/updates. We also set
-- `replica identity full` so DELETE and UPDATE events carry every column:
-- the client subscribes with a `household_id=eq.<id>` filter, and Realtime can
-- only evaluate that filter against columns present in the WAL record. By
-- default a DELETE only emits the primary key (`id`), so household-scoped
-- DELETE events would never match the filter and would be silently dropped.

alter table public.expenses replica identity full;
alter table public.budgets replica identity full;
alter table public.savings_goals replica identity full;
alter table public.settlements replica identity full;
alter table public.audit_log replica identity full;

alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.budgets;
alter publication supabase_realtime add table public.savings_goals;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.audit_log;
