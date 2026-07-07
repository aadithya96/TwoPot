-- 031_tasks_kind_buy.sql
-- Migration 030 originally shipped with a kind check of ('todo', 'task').
-- Databases that applied that version before the app collapsed the "Todos"
-- section into "Tasks" and added the "Things to buy" shopping list still carry
-- the old constraint, so inserting a 'buy' row fails with:
--   new row for relation "tasks" violates check constraint "tasks_kind_check"
-- (an in-place edit to 030 never re-runs against an already-migrated database).
--
-- Fold any legacy 'todo' rows into 'task', then re-point the constraint and the
-- column default to the current ('task', 'buy'). Safe to run on a fresh 030 too:
-- the update is a no-op and the constraint is simply dropped and recreated.

update public.tasks set kind = 'task' where kind = 'todo';

alter table public.tasks drop constraint if exists tasks_kind_check;
alter table public.tasks
  add constraint tasks_kind_check check (kind in ('task', 'buy'));

alter table public.tasks alter column kind set default 'task';
