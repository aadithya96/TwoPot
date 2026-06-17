# TwoPot

A household expense tracking and budgeting PWA for exactly two people. React +
Vite + TypeScript on the frontend, self-hosted Supabase (Postgres + Auth +
Realtime + Storage) on the backend, deployed on k3s.

## Features

- Shared & personal expense tracking with custom splits
- Category budgets with rollover and alerts
- Savings goals with contribution tracking
- Monthly settlement between partners
- Insights & charts (spend by category, monthly trend, per-person contributions)
- Installable PWA with offline queueing and push notifications
- Material Design 3 UI, mobile-first (Android & iOS)

## Screenshots

_Coming soon._

## Docs

- [Setup](docs/SETUP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Implementation Guide](docs/implementation-guide.md)

## Stack

React 19, Vite, TypeScript (strict), MUI v6 (MD3), Supabase JS v2, React Query
v5, Zustand, React Hook Form + Zod, Recharts, React Router v6, vite-plugin-pwa.
