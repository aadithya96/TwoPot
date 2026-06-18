# Setup

## Prerequisites

- Node.js 20+
- pnpm 10+ (enable with `corepack enable`, or install via `npm i -g pnpm`)
- Docker (for running Supabase locally) and the Supabase CLI

> This project uses **pnpm**, not npm. pnpm installs platform-specific native
> binaries (e.g. the rolldown/Vite bindings) reliably across Windows, macOS, and
> Linux, avoiding the npm optional-dependency bug
> ([npm/cli#4828](https://github.com/npm/cli/issues/4828)). The pinned version
> lives in the `packageManager` field of `package.json`.

## Clone and install

```bash
git clone <repo-url> twopot
cd twopot
pnpm install
```

## Environment variables

```bash
cp .env.example .env.local
```

Fill in:

- `VITE_SUPABASE_URL` — your self-hosted Supabase URL (local: `http://localhost:54321`)
- `VITE_SUPABASE_ANON_KEY` — anon key from `supabase status` or your Supabase dashboard
- `VITE_APP_URL` — the URL the app is served from
- `VITE_VAPID_PUBLIC_KEY` — VAPID public key for web push (generate with `npx web-push generate-vapid-keys`)

## Start Supabase locally

```bash
supabase start
supabase db push        # applies migrations in supabase/migrations
supabase gen types typescript --local > src/types/db.ts
```

## Run the dev server

```bash
pnpm dev
```

Open http://localhost:5173.

## Useful scripts

- `pnpm type-check` — TypeScript strict check, zero errors required
- `pnpm lint` — ESLint
- `pnpm test` — Vitest
- `pnpm build` — production build
