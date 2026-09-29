# NFC Tap Project

V1 of an NFC-powered in-store product experience platform. See [`docs/PRD-v4.md`](docs/PRD-v4.md) for the full PRD, build order, and current build status.

**Latest:** staff logins & training view (PRD v4 §7, Step 13) is complete. Design: [`docs/staff-experience.md`](docs/staff-experience.md).

## Layout

```
apps/
  admin/       Next.js store admin (admin.tapshelf.co)
  tap-page/    Next.js customer tap pages (tapshelf.store)
services/
  api/         Fastify API: Shopify OAuth, webhooks, billing
  worker/      Background jobs: AI copy, canonical matching, event enrichment
packages/
  db/          SQL migrations, DB client, tests
docker-compose.yml   Local Postgres 16
```

## Prerequisites (one-time)

You need:
1. **Node 20+** — already have it.
2. **pnpm** — this repo uses `corepack pnpm` (no install needed). If you want a plain `pnpm` command, run `sudo corepack enable` once.
3. **Docker Desktop** (or OrbStack) — for local Postgres. Install from https://www.docker.com/products/docker-desktop/. The CI pipeline uses a service container, so this is only needed for local dev.

## First-time setup

```bash
cp .env.example .env
corepack pnpm install
corepack pnpm db:up        # starts Postgres in Docker
corepack pnpm db:migrate   # runs all migrations
corepack pnpm test         # schema-conformance test should pass
```

## Useful scripts

| Script | What it does |
|---|---|
| `corepack pnpm db:up` | Start Postgres in Docker |
| `corepack pnpm db:down` | Stop Postgres |
| `corepack pnpm db:migrate` | Apply pending migrations |
| `corepack pnpm db:reset` | Wipe DB and re-migrate from scratch |
| `corepack pnpm test` | Run all tests |
| `corepack pnpm typecheck` | TypeScript across all packages |
