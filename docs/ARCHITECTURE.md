# Architecture

## Folder structure

```
src/
  components/   shared UI: layout (AppShell, BottomNav, SideNav, TopAppBar),
                feedback (EmptyState, ErrorBoundary, LoadingSkeleton), forms
                (AmountField, CategoryPicker, SplitSelector), CategoryIcon,
                InstallBanner, RealtimeProvider
  features/     feature modules, each with its components + hooks + index.ts:
                auth, expenses, budgets, categories, goals, insights,
                settlement, splitting, pots, household, home, notifications
  hooks/        cross-cutting hooks (back button, dark mode, swipe-to-delete,
                pull-to-refresh, visual viewport, scroll restoration, in-view,
                install state, categories)
  lib/          supabase client, MUI theme, query keys, currency/date helpers,
                errors, layout helpers, storage keys, UPI helpers, lazyWithRetry
  stores/       zustand stores (householdStore, uiStore)
  types/        db.ts (Supabase schema types), app.ts (derived app types)
  pages/        thin route-level wrappers (Home, Expenses, Budgets, Goals,
                Insights, Settings, Notifications, Household)
supabase/
  migrations/   numbered SQL migrations (001–022)
  functions/    Deno edge functions: recurring-expenses, send-push,
                scan-receipt, parse-expense, settlement-reminders
k8s/            k3s manifests
```

## Routing

`src/App.tsx` defines the route tree. `/login` is eager; everything else is
lazy-loaded via `lazyWithRetry`. The authenticated routes (`/`, `/expenses`,
`/budgets`, `/goals`, `/insights`, `/settings`, `/settings/notifications`,
`/settings/household`, `/settings/activity`) are nested under `AuthGuard`.

## Data flow

UI components → feature hooks (`useExpenses`, `useBudgets`, `usePots`, ...) →
React Query → Supabase JS client → Postgres/RLS. Mutations invalidate the
relevant `queryKeys` entries; Realtime subscriptions (`RealtimeProvider`) also
invalidate on server-side changes from the other household member. Aggregations
(insights, budget usage, settlement, balance trend) are computed server-side as
SQL views / RPC functions and read through dedicated hooks.

## Money

All monetary amounts are stored as **integer paise** in Postgres and converted
at the edges (`src/lib/currency.ts`: `formatINR`, `toStorageAmount`,
`fromStorageAmount`). The app is INR-only today.

## Auth flow

1. `LoginPage` → `signInWithGoogle()` → Supabase OAuth redirect.
2. `AuthGuard` reads the session. No session → `/login`. Session but no
   household membership → `/onboarding`.
3. `OnboardingFlow` creates or joins a household via RPCs (`create_household`,
   `generate_invite`, `accept_invite`), then `householdStore` is populated and
   the guard mounts `RealtimeProvider` + `AppShell` for the main app.

## State management

- **Server state** (expenses, budgets, goals, settlements, categories, pots,
  income, audit log): React Query exclusively. No raw `useEffect` fetching.
- **Client-only state**: Zustand — `householdStore` (current household id +
  members, persisted to `sessionStorage`), `uiStore` (dark mode, offline queue
  count).
- **Form state**: React Hook Form + Zod, scoped to the form component.

## Query key conventions

All keys are defined as typed functions in `src/lib/queryKeys.ts`, namespaced
by entity and parameterised by `householdId`/month/id as needed. No inline
array keys anywhere else in the codebase.

## Realtime subscription points

`RealtimeProvider` (`src/components/RealtimeProvider.tsx`, mounted once inside
`AuthGuard`) loops over a `REALTIME_TABLES` array and subscribes to Postgres
changes on `expenses`, `budgets`, `savings_goals`, `settlements`, and
`audit_log`, filtered by `household_id`, invalidating the matching React Query
key on any event. The audit-log subscription also powers the Home activity feed.

## Edge functions

Deno functions in `supabase/functions/`, deployed by the CI workflow:

- `recurring-expenses` — monthly cron; clones due recurring expenses into the
  current month (monthly recurrence only).
- `settlement-reminders` — periodic cron; pushes a reminder to whoever owes on
  an unsettled current-month settlement.
- `refresh-mf-nav` — hourly cron; refreshes mutual-fund-backed savings goals
  with the latest AMFI NAV (via the free MFAPI.in mirror) and restates each
  goal's `current_amount` as units x NAV. There is no single API spanning
  Groww and Zerodha (and no public Groww mutual-fund API at all), but both
  brokers sell the same AMFI schemes, so the scheme code + units held is
  enough to track a holding's market value without broker credentials.
- `send-push` — sends Web Push to a user's subscriptions; prunes expired ones.
- `scan-receipt` — vision OCR of a receipt image (Anthropic) → amount/date/merchant.
- `parse-expense` — natural-language note (Anthropic) → structured expense fields.

`scan-receipt` and `parse-expense` need an `ANTHROPIC_API_KEY`; push functions
need the `VAPID_*` secrets. See [DEPLOYMENT.md](DEPLOYMENT.md).

## Mobile-specific patterns

- `dvh` units for full-height layout, `env(safe-area-inset-*)` on bottom nav /
  sheets / FAB / top bar.
- `useBackButton` intercepts Android hardware back for every Drawer/Dialog.
- `useVisualViewport` repositions bottom sheets above the on-screen keyboard.
- `useSwipeToDelete` for expense row swipe gestures; `usePullToRefresh` on lists.
- Adaptive layout: bottom nav on mobile, side navigation rail on desktop.
