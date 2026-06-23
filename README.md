# TwoPot

A household expense tracking and budgeting PWA for exactly two people. React +
Vite + TypeScript on the frontend, Supabase (Postgres + Auth + Realtime +
Storage + Edge Functions) on the backend, deployed as a static nginx image on
k3s.

## Features

- **Shared & personal expenses** with equal, income-proportional, or custom
  splits, recurring entries, and receipt photos
- **Two Pots income model** — fund a shared pot for joint expenses and keep the
  rest in personal pots, with equal / proportional / custom allocation rules
- **Income-based fair splitting** — shared expenses default to each partner's
  income ratio when enabled
- **Category budgets** with rollover and 80% / 100% alerts
- **Savings goals** with a contribution ledger and projected completion dates
- **Monthly settlement** between partners, settlement history, UPI settle-up
  deep links, and weekly settlement reminders
- **Insights & charts** — spend by category, monthly trend, per-person
  contributions, stat cards, and a partner balance-over-time trend
- **Smart input** powered by Anthropic edge functions — natural-language
  quick-add ("250 groceries yesterday") and receipt OCR autofill
- **Custom categories** — add / edit / delete categories (name, icon, colour)
- **Household management** — invite codes, member income, remove / leave
  household, and an activity (audit) log of who did what
- **Realtime sync** between the two partners' devices
- **Installable PWA** with auto-update, offline-capable API caching, and Web
  Push notifications
- Material Design 3 UI (MUI v9), mobile-first with adaptive desktop layout

## Screenshots

_Coming soon._

## Docs

- [Setup](docs/SETUP.md) — local development
- [Architecture](docs/ARCHITECTURE.md) — how the app is structured
- [Deployment](docs/DEPLOYMENT.md) — CI/CD, k3s, and Supabase
- [Implementation Guide](docs/implementation-guide.md) — original build plan with
  deviation notes
- [Todo / backlog](docs/todo.md) — shipped work and the idea pool

## Stack

React 19, Vite, TypeScript (strict), MUI v9 (Material Design 3) with Emotion,
Supabase JS v2, TanStack React Query v5, Zustand v5, React Hook Form + Zod v4,
Recharts v3, React Router v7, vite-plugin-pwa. Tested with Vitest + Testing
Library + MSW. Edge functions run on Deno. Amounts are stored as integer paise.

## Development

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm type-check   # tsc strict, zero errors
pnpm lint         # ESLint
pnpm test         # Vitest
pnpm test:e2e     # Playwright (needs local Supabase — see e2e/README.md)
pnpm build        # production build
```

See [docs/SETUP.md](docs/SETUP.md) for prerequisites and Supabase setup.
