# E2E tests

Playwright specs that exercise real flows against a local Supabase stack and
a running `pnpm dev` server — no mocking. Covers onboarding (create/join a
household), adding an expense, the settle-up card, and realtime sync between
two signed-in browser contexts.

## Setup (one-time)

```bash
supabase start
supabase db push
cp .env.example .env.local   # if you haven't already for local dev
```

Fill `.env.local` with the local `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
from `supabase status` (see [docs/SETUP.md](../docs/SETUP.md)). The Playwright
config and test helpers read the same file.

```bash
pnpm exec playwright install --with-deps chromium
```

## Run

```bash
pnpm test:e2e
```

Playwright starts `pnpm dev` for you (`webServer` in `playwright.config.ts`)
unless one is already running on `localhost:5173`, in which case it reuses it.

## How auth works in tests

The app's only sign-in entry point is Google OAuth, which can't be driven
headlessly. Tests instead sign up disposable users directly against the local
Supabase auth API (`e2e/helpers/supabase.ts`, email/password — enabled in
`supabase/config.toml` for local dev only) and inject the resulting session
into `localStorage` before the page loads, under the same `twopot-auth` key
`src/lib/supabase.ts` uses. The UI itself is never touched for sign-in; full
onboarding (household create/join) *is* driven through the UI in
`onboarding.spec.ts`.

Each test creates its own fresh user(s)/household via unique emails, so tests
don't share state and can be run in any order.
