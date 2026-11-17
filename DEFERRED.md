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

### Connection pooling only matters if hosting goes serverless
**Files:** `packages/db/src/index.ts` (singleton `Pool`)
**What exists:** A module-level `pg.Pool` singleton. Correct for the long-lived Node servers the apps run as on Railway.
**Why deferred:** Not a problem on Railway. It would be on serverless hosting, where each invocation may open a new pool.
**What's needed:** Only if hosting moves to serverless: a pooled connection (PgBouncer or the provider's pooler).

### Uploaded photos live in Postgres, not object storage
**Files:** `packages/db/src/uploaded-images.ts`, `apps/admin/app/api/images/route.ts`, `apps/tap-page/app/img/[id]/route.ts`
**What exists:** photo upload (2026-11-16) stores each photo (shrunk to 1600 px in the browser, 3 MB cap) as `bytea` in `uploaded_images`; the tap page serves it at `/img/<id>` with a one-year immutable cache header.
**Why deferred:** no object storage or CDN is set up on Railway, and a demo store has a handful of photos. Postgres is fine at that size.
**What's needed:** once stores upload hundreds of photos (database size, backup time) or tap-page image load shows up in the 2-second budget: move the bytes to object storage (Railway bucket, Cloudflare R2 or S3) behind a CDN, keep `/img/<id>` as a redirect so saved URLs keep working. No cleanup of photos that are no longer used either.

---

## Tap Page

### Theme changes don't revalidate the tap page cache
**Files:** `apps/admin/app/theme/actions.ts`, `apps/tap-page`
**What exists:** `saveThemeAction` calls `revalidatePath("/theme")` (admin only). The tap page is a separate Next.js app and caches its own data.
**Why deferred:** Two separate Next.js deployments can't share a revalidation call directly.
**What's needed:** Either add an on-demand revalidation route to the tap page and call it from `saveThemeAction` (requires a shared secret), or set a short ISR `revalidate` interval on the tap page product route.

---

## Shopify Integration

### Webhook product handlers need end-to-end testing
**Files:** `services/api/src/shopify/webhooks.ts`, `services/api/src/routes/`
**What exists:** HMAC verification and `registerWebhooks` are implemented and unit-tested. The Fastify webhook route receives the payload.
**Why deferred:** Requires a live Shopify store and a public tunnel to test the full round-trip.
**What's needed:** Integration test with a Shopify development store once the Cloudflare tunnel is set up (see ACTION_ITEMS.md).

---

## Tag Lifecycle

### Demo seed provisions and assigns a tag in two steps
**File:** `packages/db/seeds/demo.ts`
**What exists:** For each untagged demo product the seed calls `provisionTags` (numbered, unassigned), then `assignTagToProduct`. A re-run skips products that already have a tag.
**Why deferred:** Reusing the two existing functions keeps the tag-numbering logic in one place. The gap only matters if the seed crashes between the two calls, and this is demo data.
**What's needed:** If it ever bites, a crash leaves an extra unassigned tag and the next run provisions a fresh one. Delete the stray tag, or give `provisionTags` an optional product to assign inside its transaction.

### `encoded_at`, `shipped_at`, `deployed_at` have no UI to set them
**Files:** `apps/admin/app/tags/`
**What exists:** The three timestamp columns exist in the schema and are displayed read-only on the tag edit page.
**Why deferred:** Physical tag encoding workflow (Steps 10–12) will define how these get set — likely via a bulk CSV import or a dedicated encoding tool.
**What's needed:** A "mark as encoded / shipped / deployed" action on the tag edit page, or a bulk import flow in Steps 10–12.

---

## Staff Experience (PRD v4 §7 Step 13)

### Tap-to-Edit for store owners
**Files:** `apps/tap-page/app/p/[tag_uuid]/page.tsx`
**What exists:** Nothing. Owners edit products in the admin (`/enrichment`).
**Why deferred:** Low priority (founder, 2026-09-28); the admin already covers editing.
**What's needed:** An "Edit" link on the tap page for a signed-in owner, linking to the product's enrichment page in the admin.

### Live store data in the staff view
**Files:** `packages/db/migrations/1700000000000_initial-schema.sql` (`products.inventory_quantity`), NotifyMe subscriptions
**What exists:** One stock number per product; NotifyMe sign-ups have no size; tap counts exist (`getProductTapCount`).
**Why deferred:** Low priority for the first staff release (founder, 2026-09-28).
**What's needed:** Per-size stock from the Shopify `variants` data, a size on NotifyMe sign-ups, owner-entered restock dates, then a "Live" section in the staff view.

---

## Product categories

### "Frame" means eyewear everywhere
**File:** `packages/db/src/spec-templates.ts`
**What exists:** the eyewear words include "frame", so "Cold Frame" (garden) and "Picture Frame" (home) are filed as eyewear.
**Why deferred:** found while adding garden centres (2026-10-15); no live product is affected and owners can pick a category per product.
**What's needed:** count "frame" as eyewear only with an eyewear word nearby (e.g. "acetate frame", "optical frame"), or in an eyewear store.

### No botanical-name check (GBIF) before plant research
**File:** `apps/admin/src/lib/product-research.ts`
**What exists:** plant research (2026-11-16) searches the trusted references (NC State Extension, Missouri Botanical Garden, ASPCA, CPPIS) by the plant's name from its title, minus pot sizes and quoted cultivars. The reference pages state the botanical name, so Generate fills it from a cited source.
**Why deferred:** the founder approved a GBIF name check as part of the plan, but titles use common names ("Poinsettia", "Neo. Guacamole Bromeliad") and trade names that GBIF's matcher doesn't resolve without extra work, and the references already give the botanical name with a source.
**What's needed:** if research picks the wrong plant for common names (e.g. two plants called "snake plant"), look up the title's name with GBIF's species search before searching the references, and search by the botanical name.

### Goes great with doesn't refresh when the catalog changes
**Files:** `apps/admin/src/lib/refresh-pairings.ts`, `apps/admin/app/enrichment/[product_id]/pairingActions.ts`
**What exists:** a product's pairings are picked at Generate or when the owner clicks "Find again" (2026-11-16). Adding a new product (say, a bark mix) doesn't update the pairings of products that would go with it, and deleting or drafting a product just hides it.
**Why deferred:** a demo store has a handful of products, and each Generate costs an AI call; refreshing every product on each catalog change is premature.
**What's needed:** if stores report stale pairings, a "Find pairings for all products" button, or a background refresh after a product import.

### No garden questions in the AI quality test set
**Files:** `apps/tap-page/eval/`
**What exists:** the 350-question set covers shoes, cannabis, wine, womenswear, sunglasses, menswear and home. Beauty, toys, vintage, plants and garden care have rule tests but no graded questions.
**Why deferred:** no garden centre's catalog yet to write questions from. Terra (the first garden-centre prospect, 2026-11-16) now has a demo catalog to write them from.
**What's needed:** 50 questions per new category from a real store's products, especially pets and kids, "will it survive?" and pest control use questions, before a garden centre goes live.

## Email

### Admin notifications have their own Resend call
**Files:** `apps/admin/src/lib/notify.ts`
**What exists:** A private `sendEmail` (plain-text body, hard-coded sender) alongside the shared `@nfc/email` package added for staff sign-in.
**Why deferred:** Out of scope for Step 13b; notifications work as they are.
**What's needed:** Move `notify.ts` onto `@nfc/email` (add a plain-text option) so there's one Resend wrapper.

---

## Manager roles

### No "forgot password" for owners, managers or co-managers
**Files:** `apps/admin/app/login/`
**What exists:** Managers set a password from an emailed link when promoted. Owners' passwords come from signup.
**Why deferred:** Out of scope for Step 14.
**What's needed:** A "Forgot password?" link that emails a single-use reset link (the `staff_auth_tokens` set_password purpose can be reused for managers; owners need their own).

### An owner whose store row is gone isn't tried as a manager
**File:** `apps/admin/app/login/actions.ts`
**What exists:** If an email matches a `store_admins` row with the right password but that store no longer exists, sign-in fails without trying the same email's manager logins.
**Why deferred:** It needs a deleted store *and* the same password on both accounts. Found in the PR #12 review (2026-10-02).
**What's needed:** Fall through to `signInManager` when `getStoreById` returns null.

### An email on several stores' lists signs in to the first matching store
**Files:** `apps/admin/app/login/actions.ts` (`signInManager`)
**What exists:** If the same email is a manager at two stores, sign-in goes to the first store whose password matches.
**Why deferred:** Rare for now.
**What's needed:** A store picker after sign-in when more than one store matches.

---

## Stores

### Stores have no country or province
**What exists:** Nothing records where a store is. Generate's research assumes Canada: brand websites are looked for in Canada, then the US, UK and Australia; product searches run from Canada (`apps/admin/src/lib/product-research.ts`).
**Why deferred:** All stores are Canadian for now (founder, 2026-10-07).
**What's needed:** Pre-fill the store's details at onboarding from Google Places (address, country, province, hours, phone), then use the country for search order. The province will also matter for cannabis stores: the legal age (19 in most provinces, 18 in Alberta, 21 in Quebec) and provincial marketing rules (Alberta's AGLC bans effect claims).

---

## Owner emails

### Weekly owner email
**What exists:** Nothing scheduled. Resend works via `@nfc/email` (staff sign-in, invites).
**Why deferred:** Founder, 2026-10-05: it'll cover more than AI questions (taps, questions, staff training) and needs its own design. Scope it after the Shelf-Side AI Assistant ships, before staff quizzes (`docs/PRD-ai-assistant.md` D43).
**What's needed:** Recipients (owner / managers), schedule, contents, unsubscribe, and a cron route like `api/cron/brand-refresh`.

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


**Also (2026-10-05):** the tap page's `POST /api/ask` (AI assistant) is capped at 10 questions per product per visit by session cookie (D22), but has no per-IP limit. Someone who clears cookies can keep asking, and each question is a paid Claude call. Add a per-IP limit (e.g. an Upstash or Postgres token bucket) before public launch.