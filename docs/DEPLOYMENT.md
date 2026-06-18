# Deployment

## Overview

TwoPot is deployed as a static frontend bundle served by nginx in a Docker
image, running on k3s, fronted by Cert-Manager for TLS. The backend is a
self-hosted Supabase instance (Postgres + Auth + Realtime + Storage) running
via its own Docker Compose stack on the same cluster/host.

## Supabase

1. Deploy Supabase's `docker-compose.yml` (see https://github.com/supabase/supabase/tree/master/docker)
   on the target host.
2. Apply migrations: `supabase db push` (or run the SQL files in
   `supabase/migrations` in order against the Postgres instance).
3. Deploy Edge Functions: `supabase functions deploy recurring-expenses`,
   `supabase functions deploy send-push`, and `supabase functions deploy scan-receipt`.
4. Schedule `recurring-expenses` via `pg_cron` or an external scheduler to run daily.
5. Configure the `scan-receipt` secret so receipt OCR can call the vision API:
   `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   (optionally `ANTHROPIC_MODEL` to override the default `claude-haiku-4-5-20251001`).
   Without this secret, receipt photos still upload and attach — only automatic
   field extraction is unavailable.

## Frontend image

`Dockerfile` builds the Vite app and serves `dist/` via nginx (`nginx.conf`).

```bash
docker build -t twopot:latest .
```

## k3s manifests (`k8s/`)

- `namespace.yaml` — dedicated namespace
- `deployment.yaml` — frontend Deployment, references the built image
- `service.yaml` — ClusterIP Service
- `ingress.yaml` — Ingress with TLS via cert-manager annotation
- `cert-issuer.yaml` — Cert-Manager ClusterIssuer (Let's Encrypt)

Apply with:

```bash
kubectl apply -f k8s/
```

## CI/CD (`.github/workflows/deploy.yaml`)

On push to `main`: install deps, type-check, lint, test, build, build & push
the Docker image, then apply the k8s manifests / roll the Deployment.

Required GitHub Actions secrets:

- `KUBE_CONFIG` — base64-encoded kubeconfig for the cluster
- `REGISTRY_USERNAME` / `REGISTRY_PASSWORD` — container registry credentials
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`, `VITE_VAPID_PUBLIC_KEY` — build-time env vars
