# NFC Tap Project

V1 of an NFC-powered in-store product experience platform. See `~/Downloads/nfc-product-prd-v3.docx` for the full PRD.

## What's here right now (Phase 1, Step 1)

A monorepo skeleton, a PostgreSQL schema covering all PRD §7.2 + §13.6 tables, a schema-conformance test, and a CI pipeline. **No application code yet** — that starts in Step 2.

```
apps/
  admin/       Next.js admin (placeholder)
  tap-page/    Next.js public tap page (placeholder)
services/
  api/         Fastify API (placeholder)
  worker/      Background worker (placeholder)
packages/
  db/          SQL migrations + DB client + schema test
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
