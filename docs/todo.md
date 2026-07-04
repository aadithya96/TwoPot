# TwoPot — Feature Backlog (todo)

Working backlog of UI/UX and feature work. Items move from **Up next** →
**In progress** → **Done**. Themes below capture the wider idea pool.

---

## ✅ Done

- [x] Adaptive desktop layout — side navigation rail on desktop, centered
      content column, responsive dashboard grid (mobile unchanged)
- [x] Render custom MD3 typography variants as block elements (fixes
      "No expenses yet" / dashboard text running together)
- [x] Expense search & filters — search box + category/payer/type filters
- [x] First-run "Get started" setup checklist on Home
- [x] Receipt photos + server-side OCR autofill (`scan-receipt` edge function)
- [x] Income-based fair splitting — incomes in Settings; shared expenses
      default to the income ratio when enabled (migration `013_member_income`)
- [x] Natural-language quick-add — `parse-expense` edge function + a "type it
      naturally" field in the add sheet that prefills the form
- [x] Custom category management — add/edit/delete categories (name, emoji
      icon, colour) from Settings
- [x] "Two pots" income model — shared pot + two personal pots, auto-allocation
      rules (`migration 015_two_pots`)
- [x] Partner balance over time — running "who owes whom" trend chart on
      Insights (`migration 020_balance_trend`, `BalanceTrend.tsx`); reworked
      into a cumulative outstanding balance net of recorded settlements
      (`migration 027_balance_trend_running`), so settling up returns the
      line to zero
- [x] Partner activity feed — "Aadi added ₹500 groceries" feed on Home
      (realtime `audit_log` subscription) + push on large shared expenses
- [x] UPI settle-up deep links (`migration 021_upi_vpa`, `src/lib/upi.ts`) +
      `settlement-reminders` edge function
- [x] Lighthouse pass — PWA icons, SEO meta, a11y landmarks
- [x] Smart auto-categorization — suggests a category from the description,
      preferring the household's own history over a merchant-keyword
      fallback, as a tap-to-apply chip in the add-expense sheet
- [x] Anomaly nudges — flags categories running 1.5×+ their trailing
      3-month average on Insights (`migration 022_category_anomalies`)
- [x] Movies — shared watchlist with TMDB search (`tmdb` edge function),
      per-person 1–5 star ratings and a to-watch/watched flow, plus a hybrid
      TMDB + Claude recommendation engine (`recommend-movies` edge function)
      that ranks a TMDB candidate pool for both partners' tastes
      (`migration 025_movies`)
- [x] Settle-up period picker on Home — settle this month, any past month, or
      all months combined (`SettlementSection.tsx`, `useMarkMonthsSettled`)
- [x] Web Push actually displays — custom `src/sw.ts` service worker
      (vite-plugin-pwa `injectManifest`) with `push`/`notificationclick`
      handlers; subscribe errors surfaced in settings with iOS guidance
- [x] "Add to Home Screen" entry in Settings — native install prompt where
      available, manual iOS/desktop instructions otherwise
      (`AddToHomeScreenItem`, `src/lib/installPrompt.ts`)
- [x] Mobile polish batch — numeric keyboard on amount fields
      (`inputMode` moved to the real `<input>`), FABs cleared above the
      bottom nav's safe-area inset, and horizontal scrollers (Home goals
      row) contained so the page never pans sideways

---

## ▶️ Up next (recommended order)

1. Safe-to-spend / daily allowance (high-visibility Home widget)
2. Fix `useSettlement`/`useBalanceTrend` not invalidating on `useAddExpense` /
   `useUpdateExpense` (found while writing settlement E2E coverage — the
   settle-up card and balance trend only refresh after a reload or an
   unrelated realtime event, not immediately after adding/editing an
   expense)

---

## 🍯 Signature two-person features

- [ ] Expense approval/flag — partner gets notified and can comment/dispute
      before a large shared expense is finalized
- [ ] Shared wishlist / "things to buy together" list that converts to an
      expense in one tap
- [ ] Per-category "who pays" defaults (e.g. rent always 60/40, groceries
      always income-ratio) instead of picking a split every time
- [ ] Anniversary / relationship stats — total spent together, biggest
      shared purchase, longest settled streak

## 🤖 Smart input (reuses Anthropic edge-function infra)

- [ ] Bank/UPI SMS import — parse a transaction SMS (share-to-app or paste)
      into a draft expense
- [ ] Voice quick-add — speech-to-text into the existing `parse-expense` flow
- [ ] Conversational "ask your data" — natural-language Q&A over insights
      ("how much did we spend on dining last month?")

## 💸 Budgeting depth

- [ ] Safe-to-spend / daily allowance ("₹340/day left this month")
- [ ] Budget rollover — carry unused budget into next month
- [ ] Copy last month's budgets / budget templates
- [ ] Bill calendar — recurring expenses on a month view with due reminders
- [ ] Sub-budgets / envelopes within a category (e.g. split "Food" into
      groceries vs. eating out)

## 📊 Insights upgrades

- [ ] Month-over-month comparison + spending calendar heatmap
- [ ] "Your month in review" shareable recap card
- [ ] Net worth / savings rate trend across pots + goals combined
- [ ] Per-category drill-down (tap a slice → filtered expense list)

## 🎯 Goals depth

- [ ] On-track indicator using `projection.ts` ("you'll hit this goal by Oct")
- [ ] Round-up contributions — round expenses up and auto-fund a goal
- [ ] Joint vs. personal goals with separate progress bars
- [ ] Goal celebration moment (confetti/share card on completion)

## 🔧 Plumbing / trust

- [ ] CSV / PDF monthly statement export
- [ ] Full household data export (JSON backup) + "right to be forgotten"
      account/household deletion flow
- [ ] Multi-currency + travel mode (currently INR-only)
- [ ] PWA home-screen shortcut → "Add expense"
- [ ] Import from Splitwise/other trackers (CSV mapping wizard)

## 🧪 Reliability & testing

- [x] Playwright end-to-end suite covering onboarding (create/join), adding
      an expense, the settle-up card, and realtime sync between two sessions
      (`e2e/`, `pnpm test:e2e`, `.github/workflows/e2e.yaml`)
- [ ] Expand Vitest coverage on edge functions (`parse-expense`,
      `scan-receipt`, `settlement-reminders`) with MSW-mocked Anthropic calls
- [ ] Error tracking (Sentry or similar) wired into both the SPA and edge
      functions, with source maps
- [ ] Synthetic uptime/health check hitting a `/health` edge function on a
      schedule, alerting on failure

## ⚡ Performance

- [ ] Bundle-size budget in CI (fail the build if a route chunk regresses)
- [ ] Receipt image compression/resizing client-side before upload to Storage
- [ ] Audit React Query cache times / stale times now that realtime
      invalidation exists, to cut redundant refetches
- [ ] Lighthouse CI gate (regression guard now that the one-off audit is fixed)

## 🔒 Security & privacy

- [ ] RLS policy audit + automated test suite asserting cross-household
      isolation (member A can never read member B's household data)
- [ ] Rate limiting / abuse guard on `parse-expense` and `scan-receipt`
      (both call paid Anthropic APIs)
- [ ] Secrets/dependency scanning in CI (e.g. `pnpm audit`, gitleaks)
- [ ] Session/device management screen — see and revoke active logins

## ♿ Accessibility & i18n

- [ ] Screen-reader pass on bottom sheets, swipe-to-delete, and charts
      (Recharts needs explicit ARIA labels/data tables as fallback)
- [ ] Reduced-motion and high-contrast theme variants
- [ ] String externalization (i18next or similar) ahead of any multi-currency
      / multi-locale push

## 📱 Platform expansion

- [ ] Background Sync API for the offline expense queue (currently relies on
      app being foregrounded to flush)
- [ ] iOS/Android share-sheet target — share a receipt photo or SMS directly
      into TwoPot's quick-add
- [ ] Capacitor wrapper for native app-store presence if push/biometrics
      reach PWA limits
- [ ] Widget/shortcut for "today's safe-to-spend" on home screen (once that
      feature ships)

## 🛠️ DevOps / observability

- [ ] Staging environment (separate Supabase project + k3s namespace) so
      schema migrations and edge function changes get a dry run
- [ ] Structured logging from edge functions (request id, household id) for
      easier incident debugging
- [ ] Automated nightly DB backup verification (restore-test, not just backup)
- [ ] Cost/usage dashboard for Anthropic API spend per household (guard
      against runaway smart-input usage)
