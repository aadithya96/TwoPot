# Architecture

## Folder structure

```
src/
  components/   shared/dumb UI components (layout, feedback, forms)
  features/     feature modules: auth, expenses, budgets, goals, insights, settlement, notifications
  hooks/        cross-cutting hooks (mobile UX, scroll, swipe, dark mode...)
  lib/          supabase client, theme, query keys, currency/date helpers
  stores/       zustand stores (householdStore, uiStore)
  types/        db.ts (generated Supabase types), app.ts (derived app types)
  pages/        thin route-level wrappers around features
supabase/
  migrations/   numbered SQL migrations
  functions/    Deno edge functions (recurring-expenses, send-push, scan-receipt, parse-expense)
k8s/            k3s manifests
```

## Data flow

UI components → feature hooks (`useExpenses`, `useBudgets`, ...) → React Query
→ Supabase JS client → Postgres/RLS. Mutations invalidate the relevant
`queryKeys` entries; Realtime subscriptions (`RealtimeProvider`) also
invalidate on server-side changes from the other household member.

## Auth flow

1. `LoginPage` → `signInWithGoogle()` → Supabase OAuth redirect.
2. `AuthGuard` reads `useSession()`. No session → `/login`. Session but no
   household membership → `/onboarding`.
3. `OnboardingFlow` creates or joins a household via RPCs (`generate_invite`,
   `accept_invite`), then `householdStore` is populated and the guard allows
   access to the main app shell.

## State management

- **Server state** (expenses, budgets, goals, settlements, categories): React
  Query exclusively. No raw `useEffect` fetching.
- **Client-only state**: Zustand — `householdStore` (current household id +
  members, persisted to `sessionStorage`), `uiStore` (dark mode, offline queue
  count).
- **Form state**: React Hook Form + Zod, scoped to the form component.

## Query key conventions

All keys are defined as typed functions in `src/lib/queryKeys.ts`, namespaced
by entity and parameterised by `householdId`/month/id as needed. No inline
array keys anywhere else in the codebase.

## Realtime subscription points

`RealtimeProvider` (mounted once, inside `AuthGuard`) subscribes to Postgres
changes on `expenses`, `budgets`, `savings_goals`, and `settlements`, filtered
by `household_id`, and invalidates the corresponding React Query keys on any
event.

## Mobile-specific patterns

- `dvh` units for full-height layout, `env(safe-area-inset-*)` on bottom nav /
  sheets / FAB / top bar.
- `useBackButton` intercepts Android hardware back for every Drawer/Dialog.
- `useVisualViewport` repositions bottom sheets above the on-screen keyboard.
- `useSwipeToDelete` for expense row swipe gestures.
