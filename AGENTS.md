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

## Verifying

- `curl -sf -H "Host: external-preview.example.com" http://localhost:3000/`
  must return the app HTML (catches Vite "Blocked request" host rejections).
- The dev server logs show `vinext`/Vite compilation (live source, not a
  prebuilt bundle).

## Tests

`pnpm test` — builds then runs `node --test tests/**/*.test.mjs`.
