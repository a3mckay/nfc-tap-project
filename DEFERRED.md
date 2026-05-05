# Deferred Decisions & Known Gaps

Things we consciously deferred during the build, with enough context to pick them up later. Add to this as new gaps are discovered.

---

## Analytics

### Pre-aggregated tables not populated
**Tables:** `daily_product_taps`, `weekly_brand_taps`
**What exists:** Both tables are in the schema (§7.2 + §13.6). The analytics dashboard queries `tap_events` directly with `GROUP BY` instead.
**Why deferred:** No background job writes to these tables yet; direct queries are correct for low V1 volume.
**What's needed:** A worker job (similar to `generate-copy`) that runs nightly, aggregates `tap_events` into the two tables, and is used by the dashboard queries instead of the raw table scans.

---

## Worker / Background Jobs

### Worker discovers stores via env var, not DB
**File:** `services/worker/src/index.ts`
**What exists:** Worker reads a `STORE_IDS` comma-separated env var to know which stores to enrich.
**Why deferred:** Simple to wire up quickly; avoids needing a "get all active stores" query at boot.
**What's needed:** Replace with `SELECT id FROM stores` so new stores are picked up automatically without a redeploy.

### No job queue, retry, or distributed locking
**Files:** `services/worker/src/jobs/generate-copy.ts`, `src/index.ts`
**What exists:** A polling loop with `try/catch` per product; failed products are logged and skipped.
**Why deferred:** Sufficient for single-process V1; a proper queue (BullMQ, pg-boss) adds significant complexity.
**What's needed:** Before running multiple worker instances or needing guaranteed delivery, add a job queue with exponential backoff and a dead-letter mechanism.

---

## Database / Infrastructure

### Connection pooling not production-ready
**Files:** `packages/db/src/index.ts` (singleton `Pool`)
**What exists:** A module-level `pg.Pool` singleton. Works fine for long-lived Node processes.
**Why deferred:** In serverless environments (Vercel) each function invocation may create a new pool, exhausting DB connections under load.
**What's needed:** Use Neon's built-in connection pooler (the `?pgbouncer=true` connection string) or deploy a PgBouncer sidecar before going to production traffic.

---

## Tap Page

### Theme changes don't revalidate the tap page cache
**Files:** `apps/admin/app/theme/actions.ts`, `apps/tap-page`
**What exists:** `saveThemeAction` calls `revalidatePath("/theme")` (admin only). The tap page is a separate Next.js app and caches its own data.
**Why deferred:** Two separate Next.js deployments can't share a revalidation call directly.
**What's needed:** Either call Vercel's on-demand revalidation API from `saveThemeAction` (requires a shared secret), or set a short ISR `revalidate` interval on the tap page product route.

---

## Shopify Integration

### Webhook product handlers need end-to-end testing
**Files:** `services/api/src/shopify/webhooks.ts`, `services/api/src/routes/`
**What exists:** HMAC verification and `registerWebhooks` are implemented and unit-tested. The Fastify webhook route receives the payload.
**Why deferred:** Requires a live Shopify store and a public tunnel to test the full round-trip.
**What's needed:** Integration test with a Shopify development store once the Cloudflare tunnel is set up (see ACTION_ITEMS.md).

---

## Tag Lifecycle

### `encoded_at`, `shipped_at`, `deployed_at` have no UI to set them
**Files:** `apps/admin/app/tags/`
**What exists:** The three timestamp columns exist in the schema and are displayed read-only on the tag edit page.
**Why deferred:** Physical tag encoding workflow (Steps 10–12) will define how these get set — likely via a bulk CSV import or a dedicated encoding tool.
**What's needed:** A "mark as encoded / shipped / deployed" action on the tag edit page, or a bulk import flow in Steps 10–12.

---

## Security / Production Hardening

### No rate limiting on the API
**File:** `services/api/src/server.ts`
**What exists:** No rate limiting middleware on any endpoint.
**Why deferred:** Low-traffic V1; adding rate limiting before the auth and webhook endpoints are publicly exposed is sufficient.
**What's needed:** Add `@fastify/rate-limit` to the auth and webhook routes before public launch.

### Admin app has no authentication
**Files:** `apps/admin/`
**What exists:** The admin app is accessible to anyone who knows the URL.
**Why deferred:** Running locally or behind a private URL for V1.
**What's needed:** Add authentication (e.g. NextAuth with a magic-link email provider, or Shopify session tokens) before exposing the admin publicly.
