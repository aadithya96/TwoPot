# TwoPot — Implementation Guide

> Expense tracking & budgeting PWA for two people. React + Vite + Supabase (self-hosted) on k3s.

---

## Table of Contents

1. [Project Setup](#1-project-setup)
2. [Database Schema](#2-database-schema)
3. [Settlement Logic](#3-settlement-logic)
4. [Authentication](#4-authentication)
5. [Core Features](#5-core-features)
6. [Budget Engine](#6-budget-engine)
7. [Savings Goals](#7-savings-goals)
8. [Receipt Uploads](#8-receipt-uploads)
9. [Real-time Sync](#9-real-time-sync)
10. [Insights & Charts](#10-insights--charts)
11. [PWA Setup](#11-pwa-setup)
12. [Offline Support](#12-offline-support)
13. [Push Notifications](#13-push-notifications)
14. [Mobile UX — Android & iOS](#14-mobile-ux--android--ios)
15. [k3s Deployment](#15-k3s-deployment)
16. [CI/CD Pipeline](#16-cicd-pipeline)
17. [Phase Checklist](#17-phase-checklist)

---

## 1. Project Setup

### 1.1 Scaffold the frontend

```bash
npm create vite@latest twopot -- --template react-ts
cd twopot
npm install
```

### 1.2 Install dependencies

```bash
# UI & styling
npm install tailwindcss @tailwindcss/vite
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-progress
npm install lucide-react class-variance-authority clsx tailwind-merge

# Data fetching & state
npm install @supabase/supabase-js
npm install @tanstack/react-query
npm install zustand

# Charts
npm install recharts

# Forms
npm install react-hook-form @hookform/resolvers zod

# PWA
npm install -D vite-plugin-pwa workbox-window
```

### 1.3 Configure Tailwind

```js
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({ /* see PWA section */ }),
  ],
})
```

### 1.4 Environment variables

```bash
# .env.local
VITE_SUPABASE_URL=https://supabase.yourdomain.com
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://twopot.yourdomain.com
```

### Todo — Project Setup

- [ ] Scaffold Vite + React + TypeScript project
- [ ] Install all dependencies listed above
- [ ] Configure Tailwind CSS v4 with Vite plugin
- [ ] Set up path aliases (`@/` → `src/`) in `tsconfig.json` and `vite.config.ts`
- [ ] Set up ESLint + Prettier with TypeScript rules
- [ ] Create `.env.local` and `.env.example`
- [ ] Initialise Git repo, add `.gitignore` (node_modules, .env.local, dist)
- [ ] Create folder structure:
  ```
  src/
    components/    # shared UI components
    features/      # feature modules (expenses, budgets, goals, insights)
    hooks/         # custom React hooks
    lib/           # supabase client, utils, constants
    stores/        # zustand stores
    types/         # TypeScript types mirroring DB schema
    pages/         # route-level components
  ```

---

## 2. Database Schema

Run all migrations in Supabase SQL editor or via `supabase db push`.

### 2.1 Users (managed by Supabase Auth)

Supabase Auth handles the `auth.users` table. We extend it with a public profile.

```sql
-- profiles: one row per auth user
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### 2.2 Household

A household links two users together as a unit.

```sql
create table public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our Home',
  created_at  timestamptz default now()
);

create table public.household_members (
  household_id uuid references public.households(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete cascade,
  role         text not null default 'member', -- 'owner' | 'member'
  joined_at    timestamptz default now(),
  primary key (household_id, user_id)
);
```

### 2.3 Categories

```sql
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  name         text not null,
  icon         text not null default 'circle',   -- lucide icon name
  color        text not null default '#6366f1',   -- hex color for UI
  is_default   boolean default false,
  created_at   timestamptz default now()
);

-- Seed default categories for a household
create or replace function public.seed_default_categories(hid uuid)
returns void language sql as $$
  insert into public.categories (household_id, name, icon, color, is_default) values
    (hid, 'Food & Dining',   'utensils',       '#f59e0b', true),
    (hid, 'Transport',       'car',            '#3b82f6', true),
    (hid, 'Utilities',       'zap',            '#8b5cf6', true),
    (hid, 'Health',          'heart-pulse',    '#ef4444', true),
    (hid, 'Entertainment',   'tv',             '#ec4899', true),
    (hid, 'Groceries',       'shopping-cart',  '#10b981', true),
    (hid, 'Home',            'home',           '#f97316', true),
    (hid, 'Personal',        'user',           '#6b7280', true),
    (hid, 'Travel',          'plane',          '#14b8a6', true),
    (hid, 'Miscellaneous',   'more-horizontal','#9ca3af', true);
$$;
```

### 2.4 Expenses

The core table. Every expense belongs to a household and has an owner type (shared/personal) and a paid_by user.

```sql
create type expense_owner as enum ('shared', 'personal');

create table public.expenses (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete set null,
  paid_by         uuid not null references public.profiles(id),
  owner           expense_owner not null default 'shared',
  -- if owner = 'personal', this is the person whose personal expense it is
  personal_user_id uuid references public.profiles(id),

  amount          numeric(12, 2) not null check (amount > 0),
  currency        text not null default 'INR',
  description     text,
  notes           text,
  receipt_url     text,             -- Supabase Storage URL

  -- split config (only meaningful when owner = 'shared')
  split_type      text not null default '50_50', -- '50_50' | 'custom' | 'solo'
  -- custom split: percentage owed by member[0] (the other gets 100 - split_pct)
  split_pct_a     numeric(5,2),
  -- split_pct_b = 100 - split_pct_a (computed at query time)

  -- recurrence
  is_recurring    boolean default false,
  recurrence_rule text,            -- rrule string e.g. 'FREQ=MONTHLY'
  next_due_date   date,

  expense_date    date not null default current_date,
  created_by      uuid not null references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute procedure update_updated_at();

-- Indexes
create index expenses_household_date on public.expenses(household_id, expense_date desc);
create index expenses_paid_by on public.expenses(paid_by);
create index expenses_category on public.expenses(category_id);
create index expenses_recurring on public.expenses(is_recurring, next_due_date)
  where is_recurring = true;
```

### 2.5 Budgets

```sql
create type budget_period as enum ('monthly', 'yearly');

create table public.budgets (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  category_id     uuid references public.categories(id) on delete cascade,
  -- null category_id = overall budget
  period          budget_period not null default 'monthly',
  amount          numeric(12, 2) not null check (amount > 0),
  rollover        boolean default false,
  rollover_balance numeric(12,2) default 0,
  valid_from      date not null default date_trunc('month', current_date)::date,
  valid_until     date,             -- null = indefinite
  created_at      timestamptz default now()
);

create unique index budgets_unique_overall
  on public.budgets(household_id, period, valid_from)
  where category_id is null;

create unique index budgets_unique_category
  on public.budgets(household_id, category_id, period, valid_from)
  where category_id is not null;
```

### 2.6 Savings Goals

```sql
create table public.savings_goals (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  description     text,
  target_amount   numeric(12, 2) not null check (target_amount > 0),
  current_amount  numeric(12, 2) not null default 0,
  deadline        date,
  icon            text default 'piggy-bank',
  color           text default '#10b981',
  is_completed    boolean default false,
  completed_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create trigger goals_updated_at
  before update on public.savings_goals
  for each row execute procedure update_updated_at();

-- Contributions ledger
create table public.goal_contributions (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.savings_goals(id) on delete cascade,
  contributed_by uuid not null references public.profiles(id),
  amount       numeric(12, 2) not null check (amount > 0),
  note         text,
  contributed_at timestamptz default now()
);
```

### 2.7 Settlements

Monthly settlement records — tracks who owes whom after each month closes.

```sql
create table public.settlements (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  period_month    date not null,            -- first day of the month e.g. 2025-06-01
  from_user_id    uuid not null references public.profiles(id),
  to_user_id      uuid not null references public.profiles(id),
  amount          numeric(12, 2) not null,  -- amount from_user owes to_user
  is_settled      boolean default false,
  settled_at      timestamptz,
  note            text,
  created_at      timestamptz default now()
);

create unique index settlements_period
  on public.settlements(household_id, period_month);
```

### 2.8 Push Subscriptions

```sql
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz default now()
);
```

### 2.9 Row-Level Security (RLS)

```sql
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.settlements enable row level security;
alter table public.push_subscriptions enable row level security;

-- Helper: is user a member of household?
create or replace function public.is_household_member(hid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.household_members
    where household_id = hid and user_id = auth.uid()
  );
$$;

-- Profiles: see own profile only
create policy "profiles: read own" on public.profiles for select
  using (id = auth.uid());
create policy "profiles: update own" on public.profiles for update
  using (id = auth.uid());

-- Households: members can read their household
create policy "households: members read" on public.households for select
  using (public.is_household_member(id));

-- Expenses: household members can CRUD
create policy "expenses: household members" on public.expenses for all
  using (public.is_household_member(household_id));

-- Budgets: household members can CRUD
create policy "budgets: household members" on public.budgets for all
  using (public.is_household_member(household_id));

-- Categories, Goals, Settlements: same pattern
create policy "categories: household members" on public.categories for all
  using (public.is_household_member(household_id));
create policy "goals: household members" on public.savings_goals for all
  using (public.is_household_member(household_id));
create policy "settlements: household members" on public.settlements for all
  using (public.is_household_member(household_id));

-- Push subs: own only
create policy "push: own" on public.push_subscriptions for all
  using (user_id = auth.uid());
```

### Todo — Database Schema

- [x] Create all migrations as numbered SQL files: `supabase/migrations/001_init.sql` etc.
- [x] Implement `profiles` table + `handle_new_user` trigger
- [x] Implement `households` + `household_members` tables
- [x] Implement `categories` table + `seed_default_categories` function
- [x] Implement `expenses` table with all columns, constraints, indexes
- [x] Implement `budgets` table with unique indexes
- [x] Implement `savings_goals` + `goal_contributions` tables
- [x] Implement `settlements` table
- [x] Implement `push_subscriptions` table
- [x] Enable RLS and write policies for all tables
- [x] Write `is_household_member` helper function
- [ ] Test all policies with two separate auth users in Supabase Studio
- [x] Add `updated_at` trigger to `expenses`, `savings_goals`
- [ ] Seed default categories when a new household is created (trigger or function call) — `seed_default_categories(hid)` exists but is not yet wired to a household-creation trigger; call it from the onboarding flow when Phase 1 implements household creation
- [x] Write TypeScript types matching every table (`src/types/db.ts`) — hand-written stub kept in sync with migrations; regenerate with `supabase gen types typescript` once a local instance exists

### Deviations

The implementation differs from the schema sketched above in this section:

- `expenses`: no `currency` or `next_due_date` column; `expense_date` renamed to `date`; `created_by` column dropped (use `paid_by`); `owner` is a `text` check constraint, not a Postgres `enum`, for simpler migrations/rollbacks; `split_type` values are `'equal' | 'custom' | 'payer_covers'` (not `'50_50' | 'custom' | 'solo'`); `goal_id` added (uuid, FK added in `006_savings_goals.sql` once `savings_goals` exists).
- `budgets`: no `valid_from`/`valid_until`/`rollover_balance` columns — one persistent row per `(household_id, category_id, period)`. Unique index reflects this. `process_budget_rollover` (see §6.1 deviation) folds unused amount directly into the row's `amount` instead of into a separate `rollover_balance`.
- `savings_goals`: no `description` column; `is_completed` dropped in favor of `completed_at is not null`; default `icon`/`color` are `'Flag'` / `'#6366f1'` (MUI icon name, matching categories' convention) rather than `'piggy-bank'` / `'#10b981'`.
- `goal_contributions`: column is `user_id` (FK `profiles`), not `contributed_by`; `created_at`, not `contributed_at`.
- `settlements`: columns are `owed_by`/`owed_to`/`settled`/`created_at`, not `from_user_id`/`to_user_id`/`is_settled`; no `note` column.
- `push_subscriptions`: no `user_agent` column.
- `categories.icon` stores `@mui/icons-material` export names (e.g. `'RestaurantOutlined'`), not lucide-react names — the app uses MUI, not Tailwind/lucide, despite what earlier sections of this guide say.

---

## 3. Settlement Logic

### 3.1 How it works

At the end of each month (or on demand), calculate the net balance between the two users based on all shared expenses for that month.

**Rules:**
- Personal expenses do not affect the settlement — they belong entirely to that person.
- Shared expenses are split per the `split_type` on each expense.
- The person who paid a shared expense is owed their counterpart's share.
- Net the flows: if User A owes User B ₹2000 and User B owes User A ₹800, the settlement is A pays B ₹1200.

### 3.2 Settlement calculation (SQL view)

```sql
-- Monthly settlement view — computes balance for each month
create or replace view public.monthly_settlement as
with shared_expenses as (
  select
    e.household_id,
    date_trunc('month', e.expense_date)::date as period_month,
    e.paid_by,
    -- amount the OTHER person owes the payer for this expense
    case
      when e.split_type = '50_50' then round(e.amount / 2, 2)
      when e.split_type = 'custom' then
        -- split_pct_a is the fraction owed by member A
        -- if payer is member A, the other owes (100 - split_pct_a)% of amount
        -- we resolve per-query by joining household_members
        round(e.amount * (100 - coalesce(e.split_pct_a, 50)) / 100, 2)
      when e.split_type = 'solo'   then 0  -- payer bears full cost
      else round(e.amount / 2, 2)
    end as counterpart_owes
  from public.expenses e
  where e.owner = 'shared'
),
flows as (
  select
    se.household_id,
    se.period_month,
    se.paid_by as creditor,
    -- the other member of the household is the debtor
    hm.user_id as debtor,
    se.counterpart_owes as amount
  from shared_expenses se
  join public.household_members hm
    on hm.household_id = se.household_id
   and hm.user_id != se.paid_by
)
select
  household_id,
  period_month,
  creditor,
  debtor,
  sum(amount) as gross_owed
from flows
group by household_id, period_month, creditor, debtor;
```

### 3.3 Net settlement function

```sql
-- Returns final settlement for a household and month
-- Returns: { from_user_id, to_user_id, amount }
create or replace function public.compute_settlement(
  p_household_id uuid,
  p_period_month date
)
returns table (
  from_user_id  uuid,
  to_user_id    uuid,
  net_amount    numeric
) language plpgsql as $$
declare
  user_a uuid;
  user_b uuid;
  a_owes_b numeric;
  b_owes_a numeric;
  net      numeric;
begin
  -- Get the two members
  select user_id into user_a from public.household_members
    where household_id = p_household_id order by joined_at limit 1;
  select user_id into user_b from public.household_members
    where household_id = p_household_id and user_id != user_a order by joined_at limit 1;

  -- What A owes B
  select coalesce(gross_owed, 0) into a_owes_b
    from public.monthly_settlement
    where household_id = p_household_id
      and period_month = date_trunc('month', p_period_month)::date
      and creditor = user_b and debtor = user_a;

  -- What B owes A
  select coalesce(gross_owed, 0) into b_owes_a
    from public.monthly_settlement
    where household_id = p_household_id
      and period_month = date_trunc('month', p_period_month)::date
      and creditor = user_a and debtor = user_b;

  net := a_owes_b - b_owes_a;

  if net > 0 then
    -- A owes B (net)
    return query select user_a, user_b, abs(net);
  elsif net < 0 then
    -- B owes A (net)
    return query select user_b, user_a, abs(net);
  else
    -- All square
    return query select user_a, user_b, 0::numeric;
  end if;
end;
$$;
```

### 3.4 TypeScript settlement hook

```ts
// src/features/settlement/useSettlement.ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useSettlement(householdId: string, periodMonth: string) {
  return useQuery({
    queryKey: ['settlement', householdId, periodMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('compute_settlement', {
          p_household_id: householdId,
          p_period_month: periodMonth,
        })
      if (error) throw error
      return data[0] // { from_user_id, to_user_id, net_amount }
    },
  })
}

export function useMarkSettled(householdId: string) {
  return useMutation({
    mutationFn: async (periodMonth: string) => {
      const settlement = await supabase
        .rpc('compute_settlement', {
          p_household_id: householdId,
          p_period_month: periodMonth,
        })
        .single()

      const { error } = await supabase
        .from('settlements')
        .upsert({
          household_id: householdId,
          period_month: periodMonth,
          from_user_id: settlement.data.from_user_id,
          to_user_id: settlement.data.to_user_id,
          amount: settlement.data.net_amount,
          is_settled: true,
          settled_at: new Date().toISOString(),
        })
      if (error) throw error
    },
  })
}
```

### Todo — Settlement Logic

- [x] Create `monthly_settlement` view in Supabase
- [x] Create `compute_settlement` RPC function
- [x] Handle edge case: only one member has paid expenses that month (the other member's `owed_amount` is simply 0 — nets out correctly)
- [x] Handle edge case: `payer_covers` split type (renamed from `solo`) — payer owes nothing, counterpart owes nothing
- [x] Handle edge case: net_amount = 0 (all square — `compute_settlement` returns `amount = 0`; UI celebratory state still to build)
- [ ] Write TypeScript hook `useSettlement`
- [ ] Write TypeScript hook `useMarkSettled`
- [ ] Build `SettlementCard` component — shows who owes whom, net amount, "Mark as Settled" button
- [ ] Build `SettlementHistory` component — past months with settled/unsettled status
- [ ] Unit test the SQL function with known fixture data (psql or pgTAP)
- [ ] Handle rollover budgets in settlement (exclude from person-to-person flow) — rollover budgets are category-level only and never feed `monthly_settlement`, so no special-casing was needed

---

## 4. Authentication

### 4.1 Supabase client

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/db'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'twopot-auth',
    },
  }
)
```

### 4.2 Google OAuth flow

```ts
// src/features/auth/useAuth.ts
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${import.meta.env.VITE_APP_URL}/auth/callback`,
      scopes: 'openid email profile',
    },
  })
  if (error) throw error
}
```

Configure in Supabase Dashboard: Authentication → Providers → Google.  
Set Authorised redirect URI: `https://supabase.yourdomain.com/auth/v1/callback`

### 4.3 Household invite flow

Since there are exactly two users, keep invites simple: share a 6-digit invite code.

```sql
-- Add to households table
alter table public.households add column invite_code text unique;
alter table public.households add column invite_expires_at timestamptz;

-- Generate invite code (called as RPC)
create or replace function public.generate_invite(p_household_id uuid)
returns text language plpgsql security definer as $$
declare
  code text;
begin
  code := upper(substring(md5(random()::text) from 1 for 6));
  update public.households
    set invite_code = code,
        invite_expires_at = now() + interval '48 hours'
    where id = p_household_id
      and exists (
        select 1 from public.household_members
        where household_id = p_household_id and user_id = auth.uid()
      );
  return code;
end;
$$;

-- Accept invite
create or replace function public.accept_invite(p_code text)
returns uuid language plpgsql security definer as $$
declare
  hid uuid;
begin
  select id into hid from public.households
    where invite_code = p_code
      and invite_expires_at > now();
  if hid is null then raise exception 'Invalid or expired invite code'; end if;

  insert into public.household_members (household_id, user_id)
    values (hid, auth.uid())
    on conflict do nothing;

  -- Invalidate code after use
  update public.households
    set invite_code = null, invite_expires_at = null
    where id = hid;

  return hid;
end;
$$;
```

### Todo — Authentication

- [ ] Configure Google OAuth in Supabase Dashboard (Client ID + Secret)
- [ ] Set allowed redirect URIs in Google Cloud Console
- [ ] Build `LoginPage` — single "Sign in with Google" button, app logo
- [ ] Build `/auth/callback` route that handles the OAuth redirect
- [ ] Build `AuthGuard` wrapper component — redirects unauthenticated users
- [ ] Build household onboarding flow:
  - [ ] First user: create household, seed categories, generate invite code
  - [ ] Second user: enter invite code → `accept_invite` RPC → join household
- [ ] Persist household ID in Zustand store after login
- [ ] Handle session expiry gracefully (refresh token → re-login)
- [ ] Build `UserMenu` component (avatar, name, sign out)
- [ ] Test both users can see each other's data after joining household

---

## 5. Core Features

### 5.1 Add expense form

Fields: amount, category, date, paid by, owner (shared/personal), split type, description, notes, recurring flag.

```ts
// src/features/expenses/expenseSchema.ts
import { z } from 'zod'

export const expenseSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().uuid('Select a category'),
  expense_date: z.string(), // ISO date string
  paid_by: z.string().uuid(),
  owner: z.enum(['shared', 'personal']),
  personal_user_id: z.string().uuid().optional(),
  split_type: z.enum(['50_50', 'custom', 'solo']).default('50_50'),
  split_pct_a: z.number().min(0).max(100).optional(),
  description: z.string().min(1, 'Description required').max(100),
  notes: z.string().max(500).optional(),
  is_recurring: z.boolean().default(false),
  recurrence_rule: z.string().optional(),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>
```

### 5.2 Expense list

- Paginated by month (default: current month)
- Group by date within month
- Each row: category icon + color, description, amount, paid-by avatar, owner badge
- Swipe left on mobile to delete (long-press on desktop)
- Tap to expand and see notes + receipt thumbnail

### 5.3 Expense CRUD hooks

```ts
// src/features/expenses/useExpenses.ts
export function useExpenses(householdId: string, month: string) {
  return useQuery({
    queryKey: ['expenses', householdId, month],
    queryFn: async () => {
      const start = `${month}-01`
      const end = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1))
        .toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('expenses')
        .select(`*, category:categories(*), payer:profiles!paid_by(*)`)
        .eq('household_id', householdId)
        .gte('expense_date', start)
        .lt('expense_date', end)
        .order('expense_date', { ascending: false })

      if (error) throw error
      return data
    },
  })
}
```

### 5.4 Recurring expenses worker

A lightweight background job (Supabase Edge Function or cron) that creates the next month's entry for recurring expenses.

```ts
// supabase/functions/recurring-expenses/index.ts
// Trigger: cron job on 1st of each month at 00:05
Deno.serve(async () => {
  const today = new Date().toISOString().slice(0, 10)

  const { data: due } = await supabaseAdmin
    .from('expenses')
    .select('*')
    .eq('is_recurring', true)
    .lte('next_due_date', today)

  for (const expense of due ?? []) {
    // Insert new expense for this period
    await supabaseAdmin.from('expenses').insert({
      ...expense,
      id: undefined,
      expense_date: expense.next_due_date,
      created_at: undefined,
      updated_at: undefined,
    })

    // Advance next_due_date by one recurrence interval
    await supabaseAdmin.from('expenses')
      .update({ next_due_date: advanceDate(expense.next_due_date, expense.recurrence_rule) })
      .eq('id', expense.id)
  }

  return new Response('ok')
})
```

### Todo — Core Features

- [ ] Build `AddExpenseSheet` — bottom sheet on mobile, modal on desktop
- [ ] Wire up `expenseSchema` with `react-hook-form` + `zod`
- [ ] Build `CategoryPicker` — grid of category icons + names
- [ ] Build `SplitSelector` — toggle between 50/50, custom (slider), solo
- [ ] Build custom split: percentage slider that shows "You: X% / Partner: Y%"
- [ ] Build `ExpenseList` page — month navigation, grouped by date, paginated
- [ ] Build `ExpenseRow` component with swipe-to-delete
- [ ] Build `ExpenseDetail` drawer — all fields + receipt image preview
- [ ] Implement `useExpenses` (list), `useAddExpense`, `useUpdateExpense`, `useDeleteExpense` hooks
- [ ] Invalidate React Query cache on mutate so list updates instantly
- [ ] Build `QuickAddFAB` — floating button, opens `AddExpenseSheet`
- [ ] Add keyboard shortcut `N` to open add expense on desktop
- [ ] Implement recurring expense toggle + recurrence rule selector (daily/weekly/monthly)
- [ ] Build `RecurringExpensesList` — shows all active recurring entries with next due date
- [x] Build Supabase Edge Function for recurring expense cron job (`supabase/functions/recurring-expenses` — monthly recurrence only for now; `recurrence_rule` must be the literal string `'monthly'`)
- [ ] Set up pg_cron in self-hosted Supabase to trigger the Edge Function monthly
- [ ] Write integration tests for CRUD operations

---

## 6. Budget Engine

### 6.1 Budget progress query

```sql
-- View: budget usage per category per month
create or replace view public.budget_usage as
select
  b.id as budget_id,
  b.household_id,
  b.category_id,
  b.period,
  b.amount as budget_amount,
  b.rollover,
  b.rollover_balance,
  date_trunc('month', current_date)::date as current_month,
  coalesce(sum(e.amount), 0) as spent,
  b.amount + coalesce(b.rollover_balance, 0) - coalesce(sum(e.amount), 0) as remaining,
  round(coalesce(sum(e.amount), 0) / nullif(b.amount, 0) * 100, 1) as pct_used
from public.budgets b
left join public.expenses e
  on e.household_id = b.household_id
  and (b.category_id is null or e.category_id = b.category_id)
  and e.expense_date >= date_trunc('month', current_date)
  and e.expense_date < date_trunc('month', current_date) + interval '1 month'
  and e.owner = 'shared'
where b.valid_from <= current_date
  and (b.valid_until is null or b.valid_until >= current_date)
group by b.id, b.household_id, b.category_id, b.period, b.amount, b.rollover, b.rollover_balance;
```

### 6.2 Alert thresholds

When a budget hits 80% or 100%, trigger a push notification and surface an in-app alert.

```ts
// src/features/budgets/useBudgetAlerts.ts
export function useBudgetAlerts(householdId: string) {
  const { data: budgets } = useBudgetUsage(householdId)

  return useMemo(() => ({
    warning: budgets?.filter(b => b.pct_used >= 80 && b.pct_used < 100) ?? [],
    exceeded: budgets?.filter(b => b.pct_used >= 100) ?? [],
  }), [budgets])
}
```

### 6.3 Rollover logic

At month end, if `rollover = true`, carry the unspent balance into `rollover_balance` for next month's budget.

```sql
-- Edge Function: runs on last day of month at 23:55
create or replace function public.process_budget_rollover(p_household_id uuid)
returns void language plpgsql as $$
begin
  update public.budgets
    set rollover_balance = greatest(0,
      amount + rollover_balance - (
        select coalesce(sum(e.amount), 0)
        from public.expenses e
        where e.household_id = p_household_id
          and (budgets.category_id is null or e.category_id = budgets.category_id)
          and e.expense_date >= date_trunc('month', current_date)
          and e.expense_date < date_trunc('month', current_date) + interval '1 month'
      )
    )
  where household_id = p_household_id and rollover = true;
end;
$$;
```

### Todo — Budget Engine

- [ ] Build `BudgetPage` — overall progress ring at top, per-category rows below
- [ ] Build `BudgetProgressBar` component — color-coded (green → amber at 80% → red at 100%)
- [ ] Build `OverallBudgetRing` — donut chart showing total spend vs budget
- [ ] Build `SetBudgetDialog` — set overall budget and per-category limits
- [ ] Implement `useBudgetUsage` hook (queries `budget_usage` view)
- [ ] Implement `useBudgetAlerts` hook
- [ ] Show inline alert banner in `BudgetPage` when any budget ≥ 80%
- [ ] Build `RolloverToggle` in budget settings
- [x] Create `budget_usage` view in Supabase
- [x] Create `process_budget_rollover` function
- [ ] Set up pg_cron to call rollover function at month-end

### Deviations (§6.1 / §6.3)

`budgets` has no per-month history rows (see §2 deviations), so `budget_usage` and `process_budget_rollover` were adapted accordingly:
- `budget_usage` joins `budgets` + `categories` + `expenses`, filtering expenses to the current calendar month, and exposes `spent_amount` (not `spent`/`remaining`/`pct_used` — compute those client-side from `budget_amount` and `spent_amount`).
- `process_budget_rollover()` takes no arguments (operates over all households' rollover-enabled budgets in one pass, since it's meant to run once globally via a scheduler) and adds last month's unused amount directly onto the budget row's `amount` column, rather than maintaining a separate `rollover_balance`.
- [ ] Handle "no budget set" state — prompt to set one
- [ ] Add budget context to `AddExpenseSheet` — show remaining when user selects a category

---

## 7. Savings Goals

### 7.1 Goals list

Each goal shows: name, icon, target, current amount, progress bar, projected completion date.

```ts
// Projected completion date calculation
function projectCompletion(
  current: number,
  target: number,
  contributions: { amount: number; contributed_at: string }[]
): Date | null {
  if (contributions.length < 2) return null

  // Average monthly contribution over last 3 months
  const sorted = contributions.sort(
    (a, b) => new Date(b.contributed_at).getTime() - new Date(a.contributed_at).getTime()
  )
  const recent = sorted.slice(0, 3)
  const avgMonthly = recent.reduce((s, c) => s + c.amount, 0) / 3

  if (avgMonthly <= 0) return null

  const monthsLeft = Math.ceil((target - current) / avgMonthly)
  const result = new Date()
  result.setMonth(result.getMonth() + monthsLeft)
  return result
}
```

### 7.2 Contribute flow

Contributing to a goal deducts from the budget as an expense (category: savings) and adds to `goal_contributions`.

```ts
// src/features/goals/useContribute.ts
export function useContribute() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      goalId,
      householdId,
      amount,
      paidBy,
      note,
    }: ContributeArgs) => {
      // 1. Log as a shared expense (category: savings)
      const { data: expense, error: expErr } = await supabase
        .from('expenses')
        .insert({
          household_id: householdId,
          amount,
          paid_by: paidBy,
          owner: 'shared',
          split_type: '50_50',
          description: `Savings: ${note ?? 'goal contribution'}`,
          expense_date: new Date().toISOString().slice(0, 10),
          created_by: paidBy,
        })
        .select()
        .single()
      if (expErr) throw expErr

      // 2. Record contribution
      const { error: contErr } = await supabase
        .from('goal_contributions')
        .insert({ goal_id: goalId, contributed_by: paidBy, amount, note })
      if (contErr) throw contErr

      // 3. Update goal current_amount
      const { error: goalErr } = await supabase.rpc('increment_goal_amount', {
        p_goal_id: goalId,
        p_amount: amount,
      })
      if (goalErr) throw goalErr
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
```

```sql
-- Atomic increment to avoid race conditions
create or replace function public.increment_goal_amount(p_goal_id uuid, p_amount numeric)
returns void language plpgsql as $$
begin
  update public.savings_goals
    set current_amount = current_amount + p_amount,
        is_completed = (current_amount + p_amount >= target_amount),
        completed_at = case
          when current_amount + p_amount >= target_amount then now()
          else null
        end
    where id = p_goal_id;
end;
$$;
```

### Todo — Savings Goals

- [ ] Build `GoalsPage` — card grid of all active goals
- [ ] Build `GoalCard` component — progress bar, amount, deadline, projected date
- [ ] Build `CreateGoalDialog` — name, target amount, deadline (optional), icon, color picker
- [ ] Build `ContributeDialog` — amount input, who is contributing, optional note
- [ ] Implement `useGoals`, `useCreateGoal`, `useContribute` hooks
- [x] Create `increment_goal_amount` RPC function
- [ ] Add "goal completed" confetti animation when target is reached
- [ ] Build `GoalContributionHistory` — timeline of contributions per goal
- [ ] Show projected completion date on each goal card
- [ ] Handle goal editing (name, target, deadline changes)
- [ ] Handle goal archiving (completed or abandoned)
- [ ] Add "Savings" as a default category for goal contributions

---

## 8. Receipt Uploads

### 8.1 Supabase Storage bucket

```sql
-- In Supabase Dashboard: Storage → Create bucket
-- Name: receipts
-- Public: false (private bucket, serve via signed URLs)
```

```ts
// Storage policy (via Supabase Dashboard or SQL)
-- Allow household members to upload/read receipts
insert into storage.policies (name, bucket_id, operation, definition)
values
  ('household upload', 'receipts', 'INSERT',
   'auth.uid() is not null'),
  ('household read', 'receipts', 'SELECT',
   'auth.uid() is not null');
```

### 8.2 Upload hook

```ts
// src/features/expenses/useReceiptUpload.ts
export function useReceiptUpload() {
  return useMutation({
    mutationFn: async ({ file, expenseId }: { file: File; expenseId: string }) => {
      // Resize/compress before upload (max 1MB)
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 1920 })

      const ext = file.name.split('.').pop()
      const path = `receipts/${expenseId}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('receipts')
        .upload(path, compressed, { upsert: true })
      if (upErr) throw upErr

      // Get signed URL (valid 1 year)
      const { data: { signedUrl }, error: urlErr } = await supabase.storage
        .from('receipts')
        .createSignedUrl(path, 365 * 24 * 60 * 60)
      if (urlErr) throw urlErr

      // Update expense with receipt URL
      await supabase.from('expenses')
        .update({ receipt_url: signedUrl })
        .eq('id', expenseId)

      return signedUrl
    },
  })
}
```

### Todo — Receipt Uploads

- [ ] Create `receipts` bucket in Supabase Storage (private)
- [ ] Set storage RLS policies
- [ ] Install `browser-image-compression` npm package
- [ ] Build `ReceiptUploader` component — tap to camera or file picker
- [ ] Show upload progress indicator
- [ ] Implement `useReceiptUpload` hook
- [ ] Show receipt thumbnail in `ExpenseRow` and `ExpenseDetail`
- [ ] Build `ReceiptViewer` — full-screen image lightbox on tap
- [ ] Handle upload errors (network, file too large)
- [ ] Add receipt deletion when expense is deleted (cascade via Edge Function or trigger)
- [ ] Test on mobile: camera capture via `<input accept="image/*" capture="environment">`

---

## 9. Real-time Sync

Supabase Realtime broadcasts Postgres changes to connected clients over WebSockets.

### 9.1 Subscribe to expense changes

```ts
// src/hooks/useRealtimeExpenses.ts
export function useRealtimeExpenses(householdId: string, month: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`expenses:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          // Invalidate and refetch for the current month
          queryClient.invalidateQueries({ queryKey: ['expenses', householdId, month] })
          queryClient.invalidateQueries({ queryKey: ['budget-usage', householdId] })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [householdId, month, queryClient])
}
```

Subscribe similarly for: `budgets`, `savings_goals`, `settlements`.

### 9.2 Presence (optional v2 feature)

Show a small indicator when partner is online or actively adding an expense.

```ts
const channel = supabase.channel('presence:household')
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setOnlineUsers(Object.values(state).flat())
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ user_id: currentUser.id, online_at: new Date() })
    }
  })
```

### Todo — Real-time Sync

- [ ] Enable Realtime on `expenses`, `budgets`, `savings_goals`, `settlements` tables in Supabase Dashboard
- [ ] Implement `useRealtimeExpenses` hook
- [ ] Implement `useRealtimeBudgets` hook
- [ ] Implement `useRealtimeGoals` hook
- [ ] Mount all realtime hooks in a top-level `RealtimeProvider` component
- [ ] Test: add expense on one device → see it appear on partner's device within ~1s
- [ ] Add subtle "updated" toast when partner makes a change
- [ ] Handle WebSocket disconnect/reconnect gracefully (Supabase client does this automatically)
- [ ] (v2) Implement presence — "Sony is online" indicator in header

---

## 10. Insights & Charts

### 10.1 Charts to build

All charts use Recharts. Data is fetched from the DB grouped/aggregated server-side.

**Monthly spend by category (donut chart):**
```sql
-- RPC: monthly_by_category
select c.name, c.color, c.icon, sum(e.amount) as total
from public.expenses e
join public.categories c on c.id = e.category_id
where e.household_id = $1
  and e.expense_date >= $2 and e.expense_date < $3
group by c.id, c.name, c.color, c.icon
order by total desc;
```

**Month-over-month trend (line chart):**
```sql
-- RPC: monthly_trend
select date_trunc('month', expense_date)::date as month, sum(amount) as total
from public.expenses
where household_id = $1
  and expense_date >= current_date - interval '6 months'
group by 1 order by 1;
```

**Per-person contribution (bar chart):**
```sql
-- RPC: person_contributions
select
  p.display_name,
  sum(case when e.owner = 'shared' then e.amount else 0 end) as shared_paid,
  sum(case when e.owner = 'personal' then e.amount else 0 end) as personal_paid
from public.expenses e
join public.profiles p on p.id = e.paid_by
where e.household_id = $1
  and e.expense_date >= $2 and e.expense_date < $3
group by p.id, p.display_name;
```

### Todo — Insights & Charts

- [ ] Build `InsightsPage` with month selector
- [ ] Build `SpendByCategory` donut chart (Recharts `PieChart`)
- [ ] Build `MonthlyTrend` line chart (Recharts `LineChart`) — last 6 months
- [ ] Build `PersonContributions` grouped bar chart
- [ ] Build `TopCategories` list — ranked by spend with delta vs last month
- [ ] Create all three SQL RPC functions
- [ ] Implement React Query hooks for each chart dataset
- [ ] Build `StatCard` components — total spend, largest category, avg daily spend
- [ ] Add empty state illustrations for months with no data
- [ ] Make all charts responsive (recharts `ResponsiveContainer`)
- [ ] (v2) Add YTD summary view

---

## 11. PWA Setup

### 11.1 Vite PWA plugin config

```ts
// vite.config.ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
  manifest: {
    name: 'TwoPot',
    short_name: 'TwoPot',
    description: 'Household expense tracker',
    theme_color: '#6366f1',
    background_color: '#ffffff',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
    shortcuts: [
      {
        name: 'Add expense',
        short_name: 'Add',
        description: 'Quickly add an expense',
        url: '/?action=add',
        icons: [{ src: 'icons/shortcut-add.png', sizes: '96x96' }],
      },
    ],
    screenshots: [],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => url.origin === import.meta.env.VITE_SUPABASE_URL,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
})
```

### 11.2 App icons

Generate icon sizes from a single 512×512 source:
```bash
npx pwa-asset-generator logo.svg public/icons \
  --icon-only --favicon --type png \
  --background "#ffffff" --padding "10%"
```

### 11.3 iOS-specific meta tags

```html
<!-- index.html -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="TwoPot">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
<link rel="mask-icon" href="/icons/masked-icon.svg" color="#6366f1">
```

### 11.4 Install prompt

```ts
// src/hooks/useInstallPrompt.ts
export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!prompt) return
    const { outcome } = await prompt.prompt()
    if (outcome === 'accepted') setPrompt(null)
  }, [prompt])

  return { canInstall: !!prompt, install }
}
```

### Todo — PWA Setup

- [ ] Configure `vite-plugin-pwa` with full manifest
- [ ] Design and export app icon (512×512 SVG/PNG source)
- [ ] Generate all icon sizes with `pwa-asset-generator`
- [ ] Add iOS meta tags to `index.html`
- [ ] Add `theme-color` meta tag (matches manifest)
- [ ] Implement `useInstallPrompt` hook
- [ ] Build `InstallBanner` component — shows when `canInstall` is true, dismissible
- [ ] Test installation on Android Chrome
- [ ] Test installation on iOS Safari (Add to Home Screen)
- [ ] Test `start_url` and app shortcut on Android
- [ ] Verify manifest in Chrome DevTools → Application → Manifest
- [ ] Run Lighthouse PWA audit and fix any issues (target score > 90)
- [ ] Test `autoUpdate` behaviour — app reloads silently on new deploy

---

## 12. Offline Support

### 12.1 Strategy

- API calls: NetworkFirst with 10s timeout → fall back to cache
- Static assets: CacheFirst (they're content-hashed by Vite)
- Add expense while offline: queue in IndexedDB, sync when back online

### 12.2 Offline queue

```ts
// src/lib/offlineQueue.ts
import { openDB } from 'idb'

const db = await openDB('twopot-offline', 1, {
  upgrade(db) {
    db.createObjectStore('pending_expenses', { keyPath: 'localId', autoIncrement: true })
  },
})

export async function queueExpense(expense: ExpenseFormValues) {
  await db.add('pending_expenses', { ...expense, queuedAt: new Date().toISOString() })
}

export async function flushQueue(householdId: string, userId: string) {
  const all = await db.getAll('pending_expenses')
  for (const item of all) {
    try {
      await supabase.from('expenses').insert({ ...item, household_id: householdId, created_by: userId })
      await db.delete('pending_expenses', item.localId)
    } catch {
      // leave in queue, retry next time
    }
  }
}
```

```ts
// Listen for online event to flush queue
window.addEventListener('online', () => flushQueue(householdId, userId))
```

### Todo — Offline Support

- [ ] Install `idb` package: `npm install idb`
- [ ] Implement `offlineQueue.ts` with IndexedDB store
- [ ] Wrap `useAddExpense` to detect offline and queue instead of posting
- [ ] Show "offline" indicator in the app header when `navigator.onLine === false`
- [ ] Show pending-count badge on FAB when there are queued expenses
- [ ] Flush queue on `online` event and on app focus
- [ ] Show "synced X expenses" toast after successful flush
- [ ] Workbox `NetworkFirst` runtime caching for Supabase API routes
- [ ] Test: airplane mode → add expense → go online → verify it appears for partner
- [ ] Handle conflicts (same expense added by both users while offline) — last-write-wins by `created_at`

---

## 13. Push Notifications

### 13.1 VAPID keys

```bash
npx web-push generate-vapid-keys
# Store in Supabase secrets:
# VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
```

### 13.2 Subscribe on client

```ts
// src/hooks/usePushNotifications.ts
export async function subscribeToPush(userId: string) {
  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  })

  const { endpoint, keys: { p256dh, auth } } = sub.toJSON() as PushSubscriptionJSON

  await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
  }, { onConflict: 'endpoint' })

  return sub
}
```

### 13.3 Send notification (Edge Function)

```ts
// supabase/functions/send-push/index.ts
import webpush from 'npm:web-push'

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!
)

Deno.serve(async (req) => {
  const { user_id, title, body, url } = await req.json()

  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user_id)

  for (const sub of subs ?? []) {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ title, body, url })
    )
  }
  return new Response('ok')
})
```

### 13.4 Notification triggers

Call `send-push` Edge Function when:
- Budget reaches 80% of limit
- Budget is exceeded (100%+)
- Partner adds an expense > ₹5000 (configurable threshold)
- Monthly settlement is ready
- Savings goal is completed

### 13.5 Service worker push handler

```js
// public/sw-push.js (injected by Vite PWA)
self.addEventListener('push', (event) => {
  const { title, body, url } = event.data.json()
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/pwa-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: { url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data.url))
})
```

### Todo — Push Notifications

- [ ] Generate VAPID keys and store in Supabase secrets
- [ ] Add `VITE_VAPID_PUBLIC_KEY` to frontend env
- [ ] Implement `subscribeToPush` and `unsubscribeFromPush` functions
- [ ] Build `NotificationSettings` page — toggle per notification type
- [ ] Request notification permission on first login (after user interaction)
- [x] Implement `send-push` Edge Function
- [ ] Trigger push on budget 80% threshold (via Postgres function + Edge Function)
- [ ] Trigger push on budget exceeded
- [ ] Trigger push on partner large expense (configurable ₹ threshold)
- [ ] Trigger push on settlement ready (monthly)
- [ ] Trigger push on goal completion
- [ ] Add push handler to service worker
- [ ] Test on Android Chrome (push works)
- [ ] Test on iOS Safari 17+ (push works for installed PWAs)
- [x] Handle expired/invalid push subscriptions (remove from DB on 410 response) — also handles 404

---

## 14. Mobile UX — Android & iOS

### 14.1 Viewport & layout units

The single most impactful mobile fix. `100vh` on iOS Safari includes the browser chrome — content gets clipped behind the address bar and home indicator. Use dynamic viewport units everywhere.

```css
/* src/index.css */

/* Full-height app shell — use dvh, not vh */
.app-shell {
  height: 100dvh;          /* dynamic viewport height — shrinks when keyboard opens */
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Scrollable content area between fixed header and bottom nav */
.scroll-area {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;  /* momentum scrolling on iOS */
  overscroll-behavior-y: contain;     /* prevent scroll chaining to body */
}

/* Safe area insets — critical for iPhone notch and home indicator */
.bottom-nav {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

.top-header {
  padding-top: env(safe-area-inset-top);
}

/* Bottom sheets and FAB must also respect the home indicator */
.bottom-sheet {
  padding-bottom: max(env(safe-area-inset-bottom), 16px);
}

.fab {
  bottom: calc(env(safe-area-inset-bottom) + 72px); /* 72px = bottom nav height */
}
```

Add to `index.html`:
```html
<meta name="viewport"
  content="width=device-width, initial-scale=1, viewport-fit=cover">
```

`viewport-fit=cover` is required for `env(safe-area-inset-*)` to work on iOS. Without it the safe area values are always 0.

### 14.2 Virtual keyboard handling

On iOS, the keyboard doesn't resize the viewport — it overlaps it. On Android it does resize (in most browsers). Handle both.

```ts
// src/hooks/useVisualViewport.ts
// Tracks the visible area that isn't covered by the keyboard
export function useVisualViewport() {
  const [height, setHeight] = useState(
    window.visualViewport?.height ?? window.innerHeight
  )

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const handler = () => setHeight(vv.height)
    vv.addEventListener('resize', handler)
    return () => vv.removeEventListener('resize', handler)
  }, [])

  return height
}
```

Use this in the `AddExpenseSheet` so it repositions itself when the keyboard opens:

```tsx
// src/features/expenses/AddExpenseSheet.tsx
export function AddExpenseSheet({ open, onClose }: Props) {
  const vpHeight = useVisualViewport()

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        // Sheet height is capped to visible viewport above the keyboard
        maxHeight: `${vpHeight * 0.92}px`,
        transition: 'max-height 0.2s ease',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowY: 'auto', height: '100%' }}>
        {/* form content */}
      </div>
    </div>
  )
}
```

### 14.3 Bottom navigation

Mobile users expect navigation at the bottom. Four tabs cover everything:

```tsx
// src/components/BottomNav.tsx
const tabs = [
  { path: '/',          icon: Home,        label: 'Home'     },
  { path: '/expenses',  icon: Receipt,     label: 'Expenses' },
  { path: '/budgets',   icon: PieChart,    label: 'Budgets'  },
  { path: '/goals',     icon: Target,      label: 'Goals'    },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: `calc(56px + env(safe-area-inset-bottom))`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'var(--color-background-primary)',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        zIndex: 50,
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location.pathname === path
        return (
          <Link
            key={path}
            to={path}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              color: active
                ? 'var(--color-text-info)'
                : 'var(--color-text-tertiary)',
              fontSize: 11,
              textDecoration: 'none',
              // Minimum 44×44px tap target (Apple HIG requirement)
              minHeight: 44,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2 : 1.5} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

The main content area needs bottom padding to avoid being hidden behind the nav:

```tsx
// src/components/AppShell.tsx
<div style={{ paddingBottom: `calc(56px + env(safe-area-inset-bottom))` }}>
  <Outlet />
</div>
```

### 14.4 Android back button

Android users press the hardware/gesture back button to dismiss sheets and modals. Without handling this, the back button navigates away from the page instead.

```ts
// src/hooks/useBackButton.ts
// Pushes a history entry when a sheet opens, intercepts popstate to close it
export function useBackButton(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (isOpen) {
      // Push a "modal" history entry
      window.history.pushState({ modal: true }, '')
    }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: PopStateEvent) => {
      if (isOpen) {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [isOpen, onClose])
}
```

Use it in every sheet and dialog:

```tsx
// In AddExpenseSheet, SettlementCard, GoalDetail, etc.
useBackButton(open, onClose)
```

### 14.5 iOS PWA install detection & prompt

iOS Safari never fires `beforeinstallprompt`. Detect the installed state yourself and show platform-appropriate instructions.

```ts
// src/hooks/useInstallPrompt.ts
type InstallState = 'installed' | 'ios-prompt' | 'android-prompt' | 'unsupported'

export function useInstallState(): InstallState {
  // Already installed as standalone PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installed'
  if ((window.navigator as any).standalone === true) return 'installed'

  const ua = window.navigator.userAgent
  const isIOS = /iphone|ipad|ipod/i.test(ua)
  const isAndroidChrome =
    /android/i.test(ua) && /chrome/i.test(ua) && !/edg/i.test(ua)

  if (isIOS) return 'ios-prompt'
  if (isAndroidChrome) return 'android-prompt'
  return 'unsupported'
}
```

```tsx
// src/components/InstallBanner.tsx
export function InstallBanner() {
  const state = useInstallState()
  const { canInstall, install } = useAndroidInstallPrompt()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem('install-dismissed') === '1'
  )

  if (dismissed || state === 'installed') return null

  return (
    <div style={{
      background: 'var(--color-background-info)',
      borderBottom: '0.5px solid var(--color-border-info)',
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: 13,
    }}>
      <span style={{ flex: 1, color: 'var(--color-text-info)' }}>
        {state === 'ios-prompt' && (
          <>Tap <strong>Share</strong> → <strong>Add to Home Screen</strong> to install TwoPot</>
        )}
        {state === 'android-prompt' && 'Install TwoPot for a better experience'}
      </span>

      {state === 'android-prompt' && canInstall && (
        <button onClick={install} style={{ fontSize: 13, fontWeight: 500 }}>
          Install
        </button>
      )}
      <button
        onClick={() => {
          setDismissed(true)
          sessionStorage.setItem('install-dismissed', '1')
        }}
        aria-label="Dismiss"
        style={{ padding: 4 }}
      >
        ✕
      </button>
    </div>
  )
}
```

### 14.6 iOS push notifications — installation gate

Push notifications on iOS only work when the app is installed as a PWA (not in the Safari browser tab). Gate the notification permission request behind install state.

```ts
// src/features/notifications/usePushSetup.ts
export function usePushSetup(userId: string) {
  const installState = useInstallState()

  const requestPermission = useCallback(async () => {
    // Hard gate on iOS — push won't work in browser tab
    if (installState === 'ios-prompt') {
      toast.info('Install TwoPot to your home screen to enable notifications')
      return
    }

    if (!('Notification' in window) || !('PushManager' in window)) {
      toast.error('Push notifications not supported on this browser')
      return
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return

    await subscribeToPush(userId)
    toast.success('Notifications enabled')
  }, [installState, userId])

  return { requestPermission }
}
```

### 14.7 Tap targets & touch UX

Apple HIG and Android Material both require **minimum 44×44px tap targets**. Apply this globally:

```css
/* src/index.css */

/* All interactive elements get minimum tap target size */
button, a, [role="button"], input[type="checkbox"], input[type="radio"] {
  min-height: 44px;
  min-width: 44px;
}

/* Remove default tap highlight on iOS — we provide our own focus styles */
* {
  -webkit-tap-highlight-color: transparent;
}

/* Prevent double-tap zoom on buttons (iOS) */
button, a {
  touch-action: manipulation;
}

/* Prevent text selection on long-press for interactive elements */
button, .expense-row, .category-chip {
  -webkit-user-select: none;
  user-select: none;
}
```

### 14.8 Swipe to delete

Use pointer events (works on both touch and mouse) rather than touch events alone.

```ts
// src/hooks/useSwipeToDelete.ts
interface SwipeOptions {
  threshold?: number    // px before action triggers, default 80
  onDelete: () => void
}

export function useSwipeToDelete({ threshold = 80, onDelete }: SwipeOptions) {
  const ref = useRef<HTMLDivElement>(null)
  const startX = useRef(0)
  const [offset, setOffset] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onPointerDown = (e: PointerEvent) => {
      startX.current = e.clientX
      el.setPointerCapture(e.pointerId)
    }

    const onPointerMove = (e: PointerEvent) => {
      const dx = e.clientX - startX.current
      // Only allow left-swipe
      if (dx < 0) setOffset(Math.max(dx, -threshold * 1.5))
    }

    const onPointerUp = () => {
      if (offset < -threshold) {
        setDeleting(true)
        // Animate out then call delete
        setTimeout(() => onDelete(), 200)
      } else {
        setOffset(0)
      }
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', () => setOffset(0))

    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
    }
  }, [offset, threshold, onDelete])

  return { ref, offset, deleting }
}
```

```tsx
// src/features/expenses/ExpenseRow.tsx
export function ExpenseRow({ expense, onDelete }: Props) {
  const { ref, offset, deleting } = useSwipeToDelete({
    threshold: 80,
    onDelete: () => onDelete(expense.id),
  })

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Delete hint revealed behind the row */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-background-danger)',
        color: 'var(--color-text-danger)',
      }}>
        <Trash2 size={20} />
      </div>

      {/* The actual row slides left */}
      <div
        ref={ref}
        style={{
          transform: `translateX(${offset}px)`,
          transition: deleting ? 'transform 0.2s ease, opacity 0.2s ease' : 'transform 0.1s ease',
          opacity: deleting ? 0 : 1,
          background: 'var(--color-background-primary)',
          touchAction: 'pan-y',   // allow vertical scroll, capture horizontal
        }}
      >
        {/* expense content */}
      </div>
    </div>
  )
}
```

### 14.9 Input types for mobile keyboards

Wrong input types summon the wrong keyboard on mobile. Use these consistently:

```tsx
// Amount — decimal keyboard, no spinner arrows
<input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*\.?[0-9]*"
  placeholder="0.00"
/>

// Percentage split
<input
  type="text"
  inputMode="numeric"
  pattern="[0-9]*"
/>

// Description / notes — text keyboard with autocorrect
<input
  type="text"
  autoComplete="off"
  autoCorrect="on"
  autoCapitalize="sentences"
  spellCheck={true}
/>

// Date — native date picker (acceptable on mobile, consistent enough)
<input
  type="date"
  // Set max to today to prevent future dates
  max={new Date().toISOString().split('T')[0]}
/>
```

### 14.10 Bottom sheet date picker

The native `<input type="date">` looks reasonable on Android but is awkward on iOS. For a consistent experience, use a custom bottom sheet wheel picker for dates.

```tsx
// src/components/DatePickerSheet.tsx
// Uses a bottom sheet with three scroll wheels: Day | Month | Year
// Library option: use @rehookify/datepicker for the logic,
// render a custom mobile-friendly UI.

// Simpler option for v1: use the native input but style it to be less jarring:
export function DateInput({ value, onChange }: DateInputProps) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        max={new Date().toISOString().split('T')[0]}
        style={{
          // Make it look like your design system, not the browser default
          width: '100%',
          height: 44,
          padding: '0 12px',
          fontSize: 16,             // 16px prevents iOS auto-zoom on focus
          border: '0.5px solid var(--color-border-tertiary)',
          borderRadius: 'var(--border-radius-md)',
          background: 'var(--color-background-primary)',
          color: 'var(--color-text-primary)',
          appearance: 'none',
          WebkitAppearance: 'none',
        }}
      />
    </div>
  )
}
```

**Critical:** `font-size: 16px` on all inputs. iOS Safari auto-zooms the page when an input with `font-size < 16px` receives focus. This is one of the most common mobile bugs in PWAs.

```css
/* src/index.css — global rule to prevent iOS zoom */
input, textarea, select {
  font-size: 16px;
}
```

### 14.11 Receipt camera capture

On mobile, tapping the receipt upload should open the camera directly (not the file picker).

```tsx
// src/features/expenses/ReceiptUploader.tsx
export function ReceiptUploader({ onUpload }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <>
      {/* Hidden input — camera on mobile, file picker on desktop */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"   // rear camera by default
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          // Compress before upload
          const compressed = await compressImage(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          })
          onUpload(compressed)
          // Reset so the same file can be re-selected
          e.target.value = ''
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        style={{ minHeight: 44, minWidth: 44 }}
      >
        <Camera size={20} />
        Add receipt
      </button>
    </>
  )
}
```

On desktop, `capture="environment"` is ignored and it falls back to the normal file picker — no separate handling needed.

### 14.12 Performance — lazy load heavy pages

Recharts and the Insights page are heavy. Lazy load anything that isn't the first render.

```tsx
// src/App.tsx
import { lazy, Suspense } from 'react'

const InsightsPage   = lazy(() => import('@/pages/InsightsPage'))
const SettlementPage = lazy(() => import('@/pages/SettlementPage'))
const GoalsPage      = lazy(() => import('@/pages/GoalsPage'))

// Wrap routes in Suspense with a skeleton fallback
<Route
  path="/insights"
  element={
    <Suspense fallback={<PageSkeleton />}>
      <InsightsPage />
    </Suspense>
  }
/>
```

Also defer chart rendering until the element is in viewport:

```tsx
// src/hooks/useInView.ts
export function useInView(ref: RefObject<Element>) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])
  return inView
}

// In chart components:
const chartRef = useRef<HTMLDivElement>(null)
const inView = useInView(chartRef)

return (
  <div ref={chartRef}>
    {inView ? <SpendByCategory data={data} /> : <ChartSkeleton />}
  </div>
)
```

### 14.13 Scroll restoration

React Router doesn't restore scroll position by default. On mobile this means navigating back takes you to the top of the list, not where you were.

```tsx
// src/components/ScrollRestoration.tsx
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const positions = new Map<string, number>()

export function ScrollRestoration() {
  const location = useLocation()

  useEffect(() => {
    // Save position when leaving
    return () => {
      positions.set(location.key, window.scrollY)
    }
  }, [location.key])

  useEffect(() => {
    // Restore position when arriving
    const saved = positions.get(location.key)
    if (saved !== undefined) {
      window.scrollTo(0, saved)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.key])

  return null
}

// Mount once in App.tsx inside <Router>
<ScrollRestoration />
```

### 14.14 Pull to refresh

On mobile, users expect pull-to-refresh on list pages.

```ts
// src/hooks/usePullToRefresh.ts
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const startY = useRef(0)
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const THRESHOLD = 60

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only activate when already at the top of the scroll area
      if (window.scrollY === 0) startY.current = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!startY.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0) {
        setPulling(true)
        setPullDistance(Math.min(dy, THRESHOLD * 1.5))
      }
    }

    const onTouchEnd = async () => {
      if (pullDistance >= THRESHOLD) await onRefresh()
      setPulling(false)
      setPullDistance(0)
      startY.current = 0
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [pullDistance, onRefresh])

  return { pulling, pullDistance }
}
```

### 14.15 Dark mode

Respect system preference and allow manual override. Store preference in Supabase profiles (syncs across devices).

```ts
// src/hooks/useDarkMode.ts
export function useDarkMode() {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const [dark, setDark] = useState<boolean | null>(null) // null = system

  const effective = dark ?? systemDark

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      effective ? 'dark' : 'light'
    )
  }, [effective])

  return { dark: effective, setDark }
}
```

```css
/* src/index.css — Tailwind dark mode via data-theme attribute */
:root[data-theme="dark"] {
  color-scheme: dark;
}
```

Configure Tailwind to use the `data-theme` attribute:

```ts
// tailwind.config.ts
export default {
  darkMode: ['attribute', '[data-theme="dark"]'],
}
```

### 14.16 Animations — respecting reduced motion

```css
/* src/index.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 14.17 Testing checklist — physical devices

Always test on a real device, not just browser DevTools mobile emulation. DevTools doesn't emulate the iOS keyboard, safe areas, or Android back gesture.

**Android (Chrome):**
- [ ] Install via "Add to Home Screen" prompt
- [ ] App shortcut on home screen opens to correct start_url
- [ ] Hardware back button closes sheets before navigating
- [ ] Keyboard opens → sheet repositions above keyboard
- [ ] Swipe-to-delete works with horizontal pointer events
- [ ] Pull-to-refresh works on expense list
- [ ] Camera opens when tapping "Add receipt"
- [ ] Push notification received when app is backgrounded

**iOS (Safari 17+):**
- [ ] "Add to Home Screen" banner appears in Safari
- [ ] After install: runs in standalone mode (no browser chrome)
- [ ] Safe area insets applied (no content behind notch or home indicator)
- [ ] Keyboard does not clip the add expense sheet
- [ ] No iOS auto-zoom on input focus (all inputs ≥ 16px font)
- [ ] Bottom nav respects home indicator
- [ ] Push notification permission prompt appears (only when installed)
- [ ] Push notification received when app is backgrounded
- [ ] `position: fixed` elements don't jump on keyboard open

### Todo — Mobile UX

- [ ] Replace all `vh`/`vw` units with `dvh`/`dvw` in layout components
- [ ] Add `viewport-fit=cover` to viewport meta tag
- [ ] Add `env(safe-area-inset-*)` padding to `BottomNav`, `AddExpenseSheet`, FAB, top header
- [ ] Implement `useVisualViewport` hook
- [ ] Wire `useVisualViewport` into `AddExpenseSheet` to reposition above keyboard
- [ ] Build `BottomNav` component with 4 tabs, active state, 44px tap targets
- [ ] Set `paddingBottom` on main content area to clear the bottom nav
- [ ] Implement `useBackButton` hook
- [ ] Add `useBackButton` to all sheets and dialogs
- [ ] Implement `useInstallState` to detect iOS vs Android vs installed
- [ ] Build `InstallBanner` with platform-specific copy
- [ ] Show iOS-specific "Tap Share → Add to Home Screen" instruction (with screenshot or icon)
- [ ] Gate push notification request behind `installState === 'installed'` on iOS
- [ ] Add global `touch-action: manipulation` to buttons and links
- [ ] Add `-webkit-tap-highlight-color: transparent` globally
- [ ] Enforce `font-size: 16px` minimum on all inputs (prevents iOS zoom)
- [ ] Change all amount inputs to `inputMode="decimal"` + `type="text"`
- [ ] Change all numeric inputs to `inputMode="numeric"` + `type="text"`
- [ ] Implement `useSwipeToDelete` hook
- [ ] Wire `useSwipeToDelete` into `ExpenseRow` with delete hint revealed behind
- [ ] Build `ReceiptUploader` with `capture="environment"` for camera
- [ ] Install `browser-image-compression` and wire into receipt upload
- [ ] Lazy load `InsightsPage`, `SettlementPage`, `GoalsPage` with `React.lazy`
- [ ] Implement `useInView` hook and defer chart rendering until in viewport
- [ ] Add `<PageSkeleton />` fallback for lazy-loaded routes
- [ ] Implement `ScrollRestoration` component and mount in `App.tsx`
- [ ] Implement `usePullToRefresh` hook and wire into `ExpenseList`
- [ ] Implement `useDarkMode` hook with system preference + manual override
- [ ] Configure Tailwind dark mode via `data-theme` attribute
- [ ] Persist dark mode preference to `profiles` table (syncs across devices)
- [ ] Add `@media (prefers-reduced-motion: reduce)` global rule
- [ ] Test on physical Android device (Chrome) — full checklist above
- [ ] Test on physical iOS device (Safari 17+) — full checklist above
- [ ] Run Lighthouse mobile audit (throttled) — target Performance ≥ 85, PWA ≥ 90

---

## 15. k3s Deployment

### 14.1 Supabase on k3s

Deploy Supabase using the official Docker Compose, running it as a system-level service alongside k3s. Or use the community Helm chart.

```bash
# Clone Supabase self-hosted repo
git clone https://github.com/supabase/supabase
cd supabase/docker

# Copy and configure .env
cp .env.example .env
# Edit .env: POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY,
#            SUPABASE_PUBLIC_URL, SMTP_*, SITE_URL

# Start Supabase
docker compose up -d
```

**Supabase services exposed on cluster:**
- API / PostgREST: `supabase-kong:8000`
- Postgres: `supabase-db:5432`
- Storage: `supabase-storage:5000`
- Realtime: `supabase-realtime:4000`

### 14.2 Frontend Deployment (k3s)

```yaml
# k8s/twopot-frontend.yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: twopot-frontend
  namespace: twopot
spec:
  replicas: 1
  selector:
    matchLabels:
      app: twopot-frontend
  template:
    metadata:
      labels:
        app: twopot-frontend
    spec:
      containers:
        - name: twopot-frontend
          image: ghcr.io/yourusername/twopot-frontend:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 80
          env:
            - name: VITE_SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: twopot-secrets
                  key: supabase-url
            - name: VITE_SUPABASE_ANON_KEY
              valueFrom:
                secretKeyRef:
                  name: twopot-secrets
                  key: supabase-anon-key
          resources:
            requests:
              memory: "64Mi"
              cpu: "50m"
            limits:
              memory: "128Mi"
              cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: twopot-frontend
  namespace: twopot
spec:
  selector:
    app: twopot-frontend
  ports:
    - port: 80
      targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: twopot-frontend
  namespace: twopot
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"   # for receipt uploads
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - twopot.yourdomain.com
      secretName: twopot-tls
  rules:
    - host: twopot.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: twopot-frontend
                port:
                  number: 80
```

### 14.3 Dockerfile

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```nginx
# nginx.conf — SPA routing + PWA headers
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  # Aggressive caching for hashed assets
  location ~* \.(js|css|png|jpg|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # No cache for service worker and manifest
  location ~* \.(html|json)$ {
    expires -1;
    add_header Cache-Control "no-store";
  }

  # SPA fallback
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### 14.4 Cert-Manager + Let's Encrypt

```yaml
# k8s/cert-manager-issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your@email.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

### 14.5 Secrets

```bash
kubectl create namespace twopot

kubectl create secret generic twopot-secrets \
  --namespace twopot \
  --from-literal=supabase-url="https://supabase.yourdomain.com" \
  --from-literal=supabase-anon-key="your-anon-key"
```

### 14.6 Resource summary (ODROID-H4+)

| Service | RAM | CPU | Storage |
|---|---|---|---|
| Supabase (Docker Compose) | ~1.5 GB | ~0.5 core | ~10 GB |
| Postgres (bundled) | ~256 MB | ~0.2 core | ~5 GB data |
| TwoPot frontend (k3s) | 64 MB | 50m | — |
| **Total** | ~2 GB | ~0.8 core | ~15 GB |

Well within ODROID-H4+ capacity (16–32 GB RAM, 4–8 core N97/N100).

### Todo — k3s Deployment

- [ ] Set up Supabase self-hosted with Docker Compose on ODROID
- [ ] Configure `.env` for Supabase: passwords, JWT secret, SMTP (for auth emails)
- [ ] Point `supabase.yourdomain.com` DNS to ODROID's public/local IP
- [ ] Set up Nginx reverse proxy or Traefik in front of Supabase services
- [ ] Install Cert-Manager in k3s cluster
- [ ] Create `ClusterIssuer` for Let's Encrypt
- [ ] Create `twopot` namespace in k3s
- [ ] Create `twopot-secrets` Kubernetes secret
- [ ] Write `Dockerfile` for frontend
- [ ] Write `nginx.conf` with SPA routing and correct cache headers
- [ ] Write k8s manifests: `Deployment`, `Service`, `Ingress`
- [ ] Apply manifests: `kubectl apply -f k8s/`
- [ ] Verify TLS certificate is issued: `kubectl describe certificate -n twopot`
- [ ] Set up PersistentVolume for Supabase Postgres data (ZFS volume on ODROID)
- [ ] Configure automated Postgres backups (pg_dump to local NAS or Backblaze B2)
- [ ] Set up monitoring: Prometheus + Grafana (already on homelab?) for pod health
- [ ] Set resource limits on frontend pod
- [ ] Test receipt upload file size limit (nginx proxy_body_size)
- [ ] Document how to update Supabase: `docker compose pull && docker compose up -d`

---

## 16. CI/CD Pipeline

### 15.1 GitHub Actions workflow

```yaml
# .github/workflows/deploy.yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/twopot-frontend

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test

  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/twopot-frontend:latest
            ghcr.io/${{ github.repository }}/twopot-frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}
            VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}
            VITE_VAPID_PUBLIC_KEY=${{ secrets.VITE_VAPID_PUBLIC_KEY }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBECONFIG }}" > ~/.kube/config

      - name: Update deployment image
        run: |
          kubectl set image deployment/twopot-frontend \
            twopot-frontend=ghcr.io/${{ github.repository }}/twopot-frontend:${{ github.sha }} \
            --namespace twopot

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/twopot-frontend --namespace twopot --timeout=120s

      - name: Run smoke test
        run: |
          curl -f https://twopot.yourdomain.com/health || exit 1
```

### 15.2 Database migrations in CI

```yaml
  migrate:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase db push --db-url ${{ secrets.DATABASE_URL }}
```

### 15.3 Branch strategy

```
main          → production (auto-deploy)
develop       → staging (deploy to twopot-staging.yourdomain.com)
feature/*     → PR only (lint + test)
```

### 15.4 Secrets required in GitHub

| Secret | Description |
|---|---|
| `KUBECONFIG` | Base64-encoded kubeconfig for ODROID k3s cluster |
| `DATABASE_URL` | Postgres connection string for migrations |
| `VITE_SUPABASE_URL` | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push |

### Todo — CI/CD

- [ ] Create GitHub repo (private)
- [ ] Set all required secrets in GitHub repo settings
- [ ] Write `.github/workflows/deploy.yaml`
- [ ] Add `npm run lint` script (ESLint)
- [ ] Add `npm run type-check` script (`tsc --noEmit`)
- [ ] Add `npm run test` script (Vitest)
- [ ] Write at least a few unit tests (settlement logic, split calculation)
- [ ] Set up kubeconfig secret: `base64 ~/.kube/config | pbcopy`
- [ ] Configure ODROID to allow `kubectl` from GitHub Actions runner (firewall rule or VPN)
- [ ] OR use `kubectl rollout` via SSH + self-hosted runner on ODROID
- [ ] Set up self-hosted GitHub Actions runner on ODROID if not exposing kubectl externally
- [ ] Test full pipeline end-to-end: push to main → test → build → deploy
- [ ] Add Supabase CLI migration step
- [ ] Set up staging environment on separate namespace `twopot-staging`
- [ ] Add Lighthouse CI check on PRs (PWA score regression detection)
- [ ] Set up Dependabot for npm and Docker base image updates
- [ ] Add Docker layer caching to reduce build time

---

## 17. Phase Checklist

### Phase 1 — Core (target: 2 weeks)

- [ ] Project scaffold + tooling
- [x] Database schema (all tables, RLS, triggers)
- [ ] Google OAuth + household invite flow
- [ ] Add / edit / delete expenses (CRUD)
- [ ] Expense list by month
- [ ] Category picker
- [ ] 50/50 shared split
- [ ] Basic monthly summary (total spend, per-category totals)
- [ ] Real-time sync between devices
- [ ] k3s deployment + TLS
- [ ] CI/CD pipeline (build + deploy)
- [ ] Bottom nav component (4 tabs, 44px tap targets)
- [ ] `dvh` viewport units + safe area insets on all layout components
- [ ] `viewport-fit=cover` meta tag
- [ ] `font-size: 16px` on all inputs (prevents iOS auto-zoom)
- [ ] `inputMode="decimal"` on amount inputs, `inputMode="numeric"` on percentage inputs
- [ ] `useBackButton` hook wired into all sheets and dialogs
- [ ] `useInstallState` + `InstallBanner` component

### Phase 2 — Budgets & Goals (target: 1.5 weeks)

- [ ] Budget creation (overall + per-category)
- [ ] Budget progress UI with alerts
- [ ] Budget rollover
- [ ] Savings goals (create, contribute, complete)
- [ ] Custom split (slider)
- [ ] Personal expense tracking
- [ ] Receipt photo upload (with `capture="environment"` + `browser-image-compression`)
- [ ] Recurring expenses
- [ ] PWA install prompt + service worker
- [ ] Offline expense queue
- [ ] `useSwipeToDelete` wired into `ExpenseRow`
- [ ] `useVisualViewport` wired into `AddExpenseSheet` (keyboard repositioning)
- [ ] `usePullToRefresh` on expense list
- [ ] iOS install instructions (Share → Add to Home Screen) with visual guide
- [ ] Push notification iOS gate (only when installed as PWA)

### Phase 3 — Polish & Insights (target: 1.5 weeks)

- [ ] Insights page (3 charts + stat cards)
- [ ] Settlement view + "mark as settled" flow
- [ ] Push notifications (budget alerts, goal complete, partner expense)
- [ ] Dark mode (system preference + manual override, synced via profiles table)
- [ ] Notification settings page
- [ ] Empty states + loading skeletons
- [ ] Lazy load InsightsPage, SettlementPage, GoalsPage via `React.lazy`
- [ ] `useInView` deferred chart rendering
- [ ] `ScrollRestoration` component
- [ ] `@media (prefers-reduced-motion: reduce)` global CSS rule
- [ ] Lighthouse mobile audit (throttled): Performance ≥ 85, PWA ≥ 90
- [ ] Physical device test — Android Chrome (full checklist in §14.17)
- [ ] Physical device test — iOS Safari 17+ (full checklist in §14.17)
- [ ] End-to-end testing (Playwright) for core flows

### Later

- [ ] CSV / PDF export of monthly expenses
- [ ] Yearly budget view
- [ ] Per-person budget envelopes
- [ ] Partner presence indicator (online/typing)
- [ ] Telegram / WhatsApp settlement reminder bot
- [ ] UPI deep-link in settlement card ("Pay via UPI")
- [ ] YTD insights + year comparison
