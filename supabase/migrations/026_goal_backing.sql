-- 026_goal_backing.sql
-- Optional "backing" for a savings goal: the real-world place the money
-- actually lives.
--
--   * manual        — plain ledger goal, exactly as before (default).
--   * bank_account  — a bank account (e.g. a joint account) reachable via a
--                     UPI VPA; contributing deep-links into the user's UPI
--                     app to move the money there, like settle-up does.
--   * mutual_fund   — an AMFI mutual fund scheme (the same schemes sold on
--                     Groww / Zerodha Coin); the goal's current_amount tracks
--                     the holding's market value (units x latest NAV) and is
--                     refreshed hourly by the refresh-mf-nav edge function.
--
-- NAV is stored in rupees (AMFI publishes 4-decimal NAVs); all *_amount
-- columns stay in paise, so market value = round(units * nav * 100).

alter table public.savings_goals
  add column backing_type text not null default 'manual'
    check (backing_type in ('manual', 'bank_account', 'mutual_fund')),
  -- bank_account backing
  add column backing_bank_label text,
  add column backing_upi_vpa text,
  -- mutual_fund backing (scheme code is the AMFI scheme code)
  add column backing_mf_scheme_code integer,
  add column backing_mf_scheme_name text,
  add column backing_mf_units numeric(16, 4) not null default 0
    check (backing_mf_units >= 0),
  add column backing_mf_nav numeric(12, 4),
  add column backing_mf_nav_date date,
  add column backing_mf_refreshed_at timestamptz;

-- Atomically add purchased units to a mutual-fund-backed goal and restate
-- current_amount as the holding's market value at the last known NAV,
-- keeping the completed_at semantics of increment_goal_amount.
create or replace function public.increment_goal_mf_units(goal_id uuid, delta_units numeric)
returns void
language plpgsql
as $$
begin
  update public.savings_goals
    set backing_mf_units = backing_mf_units + delta_units,
        current_amount = round((backing_mf_units + delta_units) * coalesce(backing_mf_nav, 0) * 100),
        completed_at = case
          when round((backing_mf_units + delta_units) * coalesce(backing_mf_nav, 0) * 100) >= target_amount
            and completed_at is null then now()
          when round((backing_mf_units + delta_units) * coalesce(backing_mf_nav, 0) * 100) < target_amount then null
          else completed_at
        end
    where id = increment_goal_mf_units.goal_id
      and backing_type = 'mutual_fund';
end;
$$;

-- Record a fresh NAV for a mutual-fund-backed goal and restate its
-- current_amount as the new market value. Called hourly per goal by the
-- refresh-mf-nav edge function (service role).
create or replace function public.refresh_goal_mf_value(goal_id uuid, new_nav numeric, new_nav_date date)
returns void
language plpgsql
as $$
begin
  update public.savings_goals
    set backing_mf_nav = new_nav,
        backing_mf_nav_date = new_nav_date,
        backing_mf_refreshed_at = now(),
        current_amount = round(backing_mf_units * new_nav * 100),
        completed_at = case
          when round(backing_mf_units * new_nav * 100) >= target_amount
            and completed_at is null then now()
          when round(backing_mf_units * new_nav * 100) < target_amount then null
          else completed_at
        end
    where id = refresh_goal_mf_value.goal_id
      and backing_type = 'mutual_fund';
end;
$$;
