# Base44 Dev Environment

## What this app is

"Aesi's Signal Petal" — a private, client-side SRE work tracker. Built with
**vinext** (Next.js app-router semantics on Vite) plus the `@cloudflare/vite-plugin`
for local RSC/SSR rendering via workerd/Miniflare.

- **All data is in the browser** (`localStorage`). There is no real backend
  persistence in dev: the D1/R2 bindings in `.openai/hosting.json` are `null`
  and `db/schema.ts` is empty, so `db/getDb()` is never called at runtime.
- The page (`app/page.tsx`) is a single `"use client"` component.

## Running it

```
docker compose -f docker-compose.base44.yml up -d
```

- Single `web` service on the `node:22` image, source bind-mounted at `/app`.
- Installs deps with `corepack pnpm` then runs `pnpm dev` (`vinext dev`).
- Vite dev server is configured (`vite.config.ts`) to bind `0.0.0.0:3000` with
  `allowedHosts: true` so the preview's external hostname is accepted.

## Secrets

None required. The app is fully self-contained / client-side. `chatgpt-auth.ts`
is a server helper that reads request headers injected by an external control
plane; it is not used in local dev and needs no credentials.

## Cloud sync

Local-first with an optional cloud mirror. `d1: "DB"` in `.openai/hosting.json`
enables a local D1 (Miniflare) in dev; on the real platform the control plane
injects the binding.

- `app/api/state/route.ts` — GET/POST a single JSON blob per user in the
  `app_state` table (`db/schema.ts`). Identity is the ChatGPT user id header when
  present, else a per-browser device id (`x-device-id`). Table is created
  idempotently via `db/index.ts`'s `ensureStateSchema` — no migration step needed.
- `app/lib/sync.ts` — client layer. On load: pull; if the cloud is newer than the
  last sync, apply + reload to re-hydrate (existing local data is never clobbered
  on first sync). Otherwise push local up. Writes are mirrored on a 5s interval
  and on `pagehide`. `signal-petal-device-id` / `signal-petal-last-sync` and the
  daily reminder-day keys are excluded from the synced blob.
- Wired into `app/page.tsx` via `useEffect(() => { if (hydrated) initSync(); })`.

Note: vinext keeps a PID lock at `.vinext/dev/lock.json` (in the repo, so it
survives container recreation and collides with a live PID in the fresh
container). The compose command clears it before `pnpm dev`.

## Verifying

- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/`
  must return the app HTML (catches Vite "Blocked request" host rejections).
- The dev server logs show `vinext`/Vite compilation (live source, not a
  prebuilt bundle).

## Tests

`pnpm test` — builds then runs `node --test tests/**/*.test.mjs`.
