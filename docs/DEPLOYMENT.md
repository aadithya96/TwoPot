# Deployment

## Overview

TwoPot ships as a static frontend bundle (Vite build) served by nginx in a
Docker image. That image runs on a **k3s cluster on a private VM**, fronted by
Traefik (k3s's built-in ingress) with TLS issued by cert-manager.

The backend is a **hosted Supabase project** (Postgres + Auth + Realtime +
Storage + Edge Functions). The CI pipeline targets it by project ref — it is
not self-hosted on the cluster.

```
GitHub push to main
  └─ migrate            supabase db push        ─────────────▶ Supabase (cloud)
  └─ build-and-deploy
       ├─ checks        type-check / lint / test
       ├─ functions     supabase functions deploy + secrets set ▶ Supabase (cloud)
       ├─ image         docker build + push                  ─▶ ghcr.io
       └─ k8s           Tailscale → kubectl apply / rollout  ─▶ k3s VM
```

### Why Tailscale?

The k3s API server (`https://<vm>:6443`) lives on a private VM behind NAT and is
**not reachable from a GitHub-hosted runner**. The deploy job joins your tailnet
with `tailscale/github-action`, after which `kubectl` reaches the API server over
the VM's Tailscale IP / MagicDNS name. This is why the previous workflow appeared
to "do nothing" on the cluster — the runner could never open a connection.

## One-time VM / cluster setup

1. **Install k3s** on the VM. So the API cert is valid over Tailscale, add the
   tailnet address as a TLS SAN:

   ```bash
   curl -sfL https://get.k3s.io | sh -s - --tls-san <vm-tailscale-ip-or-magicdns>
   # if already installed, add to /etc/systemd/system/k3s.service and restart
   ```

2. **Install cert-manager** (the `letsencrypt-prod` ClusterIssuer in
   `k8s/cert-issuer.yaml` depends on it):

   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml
   ```

3. **Join the VM to Tailscale** (`tailscale up`) and note its Tailscale IP
   (`100.x.y.z`) or MagicDNS name.

4. **Build the `KUBE_CONFIG` secret** from the VM's kubeconfig, with the server
   pointing at the Tailscale address (not `127.0.0.1`):

   ```bash
   sudo sed 's#https://127.0.0.1:6443#https://<vm-tailscale-ip>:6443#' \
     /etc/rancher/k3s/k3s.yaml | base64 -w0
   ```

   Paste the output into the `KUBE_CONFIG` GitHub secret.

5. **Create a Tailscale OAuth client** (Tailscale admin → Settings → OAuth
   clients) with the `devices` scope, tagged `tag:ci`. Add an ACL grant so
   `tag:ci` may reach the VM on port 6443. Store the client id/secret as the
   `TS_OAUTH_CLIENT_ID` / `TS_OAUTH_SECRET` secrets.

Everything else on the cluster (namespace, image-pull secret, Supabase config
secret, manifests) is created/refreshed automatically by the workflow.

## Frontend image

`Dockerfile` builds the Vite app and serves `dist/` via nginx (`nginx.conf`).
`VITE_*` values are inlined at build time, so they are passed as `--build-arg`
during the image build (see the workflow's `build-args`).

```bash
docker build -t twopot:latest \
  --build-arg VITE_SUPABASE_URL=... \
  --build-arg VITE_SUPABASE_ANON_KEY=... \
  --build-arg VITE_APP_URL=... \
  --build-arg VITE_VAPID_PUBLIC_KEY=... .
```

## k3s manifests (`k8s/`)

- `namespace.yaml` — dedicated `twopot` namespace
- `deployment.yaml` — frontend Deployment (uses the `ghcr-creds` image-pull secret)
- `service.yaml` — ClusterIP Service
- `ingress.yaml` — Traefik Ingress with TLS via cert-manager annotation
- `cert-issuer.yaml` — cert-manager `letsencrypt-prod` ClusterIssuer

Manual apply (the CI does this for you):

```bash
kubectl apply -f k8s/
```

## Secrets created automatically on the cluster

The deploy job provisions these in the `twopot` namespace on every run
(idempotent `kubectl apply`), so you never create them by hand:

| Secret           | Type                | Contents / purpose                                                                 |
| ---------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `ghcr-creds`     | `docker-registry`   | Lets the cluster pull the private GHCR image. Built from `GHCR_PULL_TOKEN` (falls back to the run's `GITHUB_TOKEN`). |
| `twopot-supabase`| `generic`           | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_REF`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD` — so cluster-side jobs (e.g. a CronJob using the Supabase CLI) can read them. |

> **Image-pull token:** the run-scoped `GITHUB_TOKEN` expires when the job ends,
> so a pod rescheduled later (node reboot, etc.) could fail to pull. Set a
> dedicated classic PAT with `read:packages` as `GHCR_PULL_TOKEN` for durable
> pulls — or make the GHCR package public.

## Supabase Edge Function secrets (set automatically)

The workflow runs `supabase secrets set` after deploying the functions, so the
functions get their config without a manual step:

| Function secret    | Sourced from GitHub secret | Notes                                                          |
| ------------------ | -------------------------- | ------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`| `ANTHROPIC_API_KEY`        | Used by `scan-receipt` (OCR) and `parse-expense` (quick-add). |
| `ANTHROPIC_MODEL`  | `ANTHROPIC_MODEL`          | Optional; default `claude-haiku-4-5-20251001`.                |
| `VAPID_SUBJECT`    | `VAPID_SUBJECT`            | Web-push contact (e.g. `mailto:you@example.com`).             |
| `VAPID_PUBLIC_KEY` | `VITE_VAPID_PUBLIC_KEY`    | Same value the frontend uses.                                 |
| `VAPID_PRIVATE_KEY`| `VAPID_PRIVATE_KEY`        | Web-push private key.                                         |

Each is only set if its GitHub secret is non-empty. `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are **not** set here — the Supabase platform injects
them into functions automatically (and the `SUPABASE_` prefix is reserved).

Without `ANTHROPIC_API_KEY`, receipts still upload and expenses can be entered
manually — only the AI autofill is unavailable. Without the `VAPID_*` values,
push notifications are disabled.

Also schedule `recurring-expenses` to run daily via `pg_cron` or an external
scheduler.

## CI/CD (`.github/workflows/deploy.yaml`)

On push to `main`:

1. **preflight** — validates that every required secret is set and aborts the
   run before any work if one is missing (optional secrets only emit a warning,
   so degraded features are visible in the log). This guarantees the app never
   ships with, e.g., an empty Supabase URL.
2. **migrate** — `supabase db push` applies pending migrations.
3. **build-and-deploy** — resolve the frontend build vars (see below) → type-check,
   lint, test → deploy edge functions and set their secrets → build & push the
   Docker image to GHCR → connect to Tailscale → create the namespace and cluster
   secrets → `kubectl apply -f k8s/` → `rollout restart` and wait for
   `rollout status` (the job fails if pods don't become ready, e.g. on an
   image-pull error).

### Frontend build vars (derived, not secrets)

The three `VITE_*` build vars are resolved at deploy time from what you already
have, so there are **no extra secrets to add**:

| Var                     | Derived from                                                              |
| ----------------------- | ------------------------------------------------------------------------ |
| `VITE_SUPABASE_URL`     | `https://<SUPABASE_PROJECT_REF>.supabase.co`                              |
| `VITE_SUPABASE_ANON_KEY`| Supabase Management API (`/v1/projects/{ref}/api-keys`) via `SUPABASE_ACCESS_TOKEN` |
| `VITE_APP_URL`          | the `host:` in `k8s/ingress.yaml` (prefixed with `https://`)             |

The service-role key is fetched the same way and used for the `twopot-supabase`
cluster secret. The anon/service keys are masked in the logs. This path assumes a
**hosted** Supabase project; for self-hosted, set the `VITE_*` values explicitly
instead.

### GitHub Actions secrets

The `preflight` job enforces this list: **required** secrets abort the run if
unset; **optional** ones only warn (and disable the noted feature).

Cluster / connectivity:

- `KUBE_CONFIG` *(required)* — base64 of the k3s kubeconfig, server pointing at the VM's Tailscale address
- `TS_OAUTH_CLIENT_ID`, `TS_OAUTH_SECRET` *(required)* — Tailscale OAuth client (`tag:ci`)
- `GHCR_PULL_TOKEN` *(optional, recommended)* — classic PAT with `read:packages` for the image-pull secret

Frontend build:

- `VITE_VAPID_PUBLIC_KEY` *(optional — web push disabled if unset)*
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL` are **derived**, not secrets (see "Frontend build vars" above).

Supabase project + migrations:

- `SUPABASE_ACCESS_TOKEN` *(required)* — personal access token (Account → Access Tokens); also used to fetch the anon/service-role keys
- `SUPABASE_PROJECT_REF` *(required)* — the target project's ref id
- `SUPABASE_DB_PASSWORD` *(required)* — database password (for `db push`)

Edge function secrets, all *(optional)* — set on the Supabase project:

- `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` (default `claude-haiku-4-5-20251001`) — AI autofill
- `VAPID_SUBJECT`, `VAPID_PRIVATE_KEY` — push sending

> The image is pushed to GHCR using the built-in `GITHUB_TOKEN`; no separate
> registry username/password secret is needed.
