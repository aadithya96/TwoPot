-- 023_grants.sql
-- Self-managed/CLI-only schemas don't get the table-level GRANTs that the
-- Supabase Studio table editor applies automatically when you create a table
-- through the UI. Every table here was created via plain `CREATE TABLE` in a
-- migration, so anon/authenticated/service_role never received a grant on
-- them -- this surfaced as "permission denied for table X" (Postgres 42501)
-- on any operation that isn't shielded by a `security definer` RPC, e.g.
-- seed_default_categories' direct insert into categories.
--
-- RLS policies (009_rls.sql) remain the actual row-level security boundary;
-- this just opens the table-level door that Studio normally opens silently.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to anon, authenticated, service_role;
