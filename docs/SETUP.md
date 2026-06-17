# Setup

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for running Supabase locally) and the Supabase CLI

## Clone and install

```bash
git clone <repo-url> twopot
cd twopot
npm install
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
npm run dev
```

Open http://localhost:5173.

## Useful scripts

- `npm run type-check` — TypeScript strict check, zero errors required
- `npm run lint` — ESLint
- `npm run test` — Vitest
- `npm run build` — production build
