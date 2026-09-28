# TapShelf — Product Requirements & Build Status (PRD v4)

**NFC-powered in-store product experience platform for independent boutiques**

| | |
|---|---|
| Version | v4 (supersedes `nfc-product-prd-v3.docx`, Apr 30 2026) |
| Canonical location | `docs/PRD-v4.md` in this repo. Edit this file; local copies are not authoritative. |
| Updated | 2026-09-28 |
| Repo | `github.com/a3mckay/nfc-tap-project` (pnpm monorepo) |
| Domains | `tapshelf.co` (marketing + admin), `tapshelf.store` (customer tap pages) |
| Audience | Founder + Claude Code sessions (local and cloud) |

### What changed from v3

1. The product is named **TapShelf**. v3 still said "[Product Name TBD]".
2. Every build step now has a **status**, based on a scan of the codebase on 2026-09-28.
3. **Section 10** adds the features built *after* v3 that the v3 PRD never specified: customer accounts, reactions, reviews, offers, Ask Us, notifications, PWA, multi-store admin, and others.
4. **Section 12** brings in the known gaps from `DEFERRED.md` and the human to-dos from `ACTION_ITEMS.md`.
5. **Section 11** lists places where the code and the spec disagree (for example, pricing tiers).

### Status legend

- ✅ **Built**: implemented in the repo
- 🟡 **Partial**: some of it is built; what's missing is listed
- ⬜ **Not started**
- 🧍 **Non-code**: physical, legal or business work

> **Note for a Claude session reading this:** statuses come from reading the code (routes, migrations, jobs, greps), not from running the app end to end. Check a status against the code before you rely on it. The working tree may also have uncommitted changes. As of this writing: advisory-lock tag provisioning in `packages/db/src/tags.ts`, plus small edits to canonical, offers and settings actions.

---

## 1. Vision & Problem

Independent boutiques put a lot of work into curating products and building a brand. But in the store, depth about a product still comes almost entirely from floor associates, who are expensive, inconsistent, and can only be in one place at a time.

TapShelf connects the physical shelf to the web. An NFC tag sits near each product. A customer taps their phone on it and a rich, on-brand product page opens instantly, with no app to download. The page can show fit notes, backstory, materials, video, staff picks, reviews and more. The store owner writes this content once in a simple admin, and their Shopify catalog syncs automatically.

**Core loop:** NFC tag near product → customer taps → mobile web page loads instantly → rich product content → deeper engagement → more confidence to buy

**Why now:**
- iPhones have read NFC natively since iOS 14.
- Tap-to-pay has trained people to tap their phones on objects.
- Shopify's GraphQL Admin API makes catalog sync easy.
- NFC tags cost pennies at volume.
- QR codes proved people will use physical-to-digital triggers. NFC does the same without visual clutter.

## 2. Target Customer

The beachhead is an independent boutique with:
- 1–3 locations
- 50–500 SKUs
- **Shopify** already in use
- an owner who runs it and cares about brand storytelling
- products with real depth (specs, origin stories, fit variance, educational value)

**Verticals, in priority order:**
1. Premium sneaker boutiques
2. Outdoor and technical gear
3. Curated menswear and womenswear
4. Activewear
5. Wine and specialty food

**Toronto beachhead:** Queen St W, Ossington, Yorkville. Walk-in demos use pre-built pages for each store's actual products.

## 3. Product Overview: the V1 Layers

1. **Shopify integration**: OAuth app, full catalog import, real-time webhook sync. Owners never re-enter product data.
2. **Content enrichment admin**: owners add fit notes, backstory, video, materials, staff picks and reasons to buy. AI pre-fills starter copy so no product is ever blank.
3. **NFC tag system**: tags are pre-encoded and ship in a branded kit. Each tag holds a permanent static URL, and the store maps it to a product in the admin. Tags are never rewritten.
4. **Customer tap page**: carries the store's brand, loads in under 2 seconds, needs no app, and works on any modern phone.
5. **Analytics dashboard**: tap volume, engagement, and the tap-to-purchase signal.

## 4. Design Philosophy

### 4.1 NFC first; QR only if a store asks
NFC is the product. A store can request QR codes, but they aren't recommended, aren't in the default kit, and aren't part of the story we tell. QR codes can't look premium. A subtle "Tap ✦" mark can.

**The "magical tap":** if it needs explaining, it has failed. If it loads slowly, it has failed. If it looks generic, it has failed.
- Pages load in **under 2 seconds on 4G**. Speed is part of the magic.
- Design the "Tap ✦" mark with the same care as a logo.
- The page must feel like it belongs to the store, not to a SaaS platform. Brand inheritance is mandatory.

**Customer training:** tap-to-pay, transit cards and hotel keys already taught the gesture. A small "Tap to explore" indicator on the shelf does the rest. After one successful tap, customers look for it everywhere.

### 4.2 Physical design language
The bar is Apple-level *intentionality*, not Apple-level cost.
- **Kit box:** matte, monochrome, opens like a book, die-cut tray, setup card on uncoated stock with 5 illustrated steps. A handwritten founder note goes to the first 20 customers.
- **Tags:** white circular stickers with a "Tap ✦" overlay. No URLs, barcodes or visible IDs.
- **Shelf indicators:** small rectangular adhesive markers placed *near* the tag, with the "Tap ✦" wordmark only. Neutral black or white by default; brand colors later.

### 4.3 The tap page is not the storefront
The customer is already in the store holding the product. The page's job is to **deepen, not convert**:
- editorial rather than transactional
- story first: backstory, materials and fit come before price
- **no cart, no checkout, no cross-sell widgets**
- staff picks and the owner's voice are first-class content

---

## 5. Feature Requirements (V1 spec)

### 5.1 Shopify integration
| Requirement | Spec |
|---|---|
| OAuth app | Standard Shopify OAuth. Scopes: `read_products`, `read_inventory`, `read_locations` |
| Catalog import | GraphQL import after OAuth: id, title, descriptionHtml, vendor, productType, tags, images, variants (price, sku, inventoryQuantity), status |
| Internal product DB | Products stored in our own DB. **Shopify is never queried live on a tap.** |
| Webhook sync | `products/update`, `products/delete`, `inventory_levels/update`. Handle duplicate deliveries safely (idempotent). |
| Multi-location inventory | Inventory tracked per location (drives out-of-stock logic) |
| GraphQL only | No REST (deprecated for new apps) |

### 5.2 Content enrichment admin
**Fields per product:**
- fit notes
- materials
- origin / backstory
- reasons to buy (3–5)
- staff pick quote and staff name
- video URL (YouTube or Vimeo)
- additional images
- internal staff notes (never shown to customers)

**AI copy assist:** each imported product without enrichment gets AI starter copy (backstory, fit notes, reasons to buy, materials), stored with `ai_generated=true` and editable by the owner.

**Tag management:**
- inventory view with statuses Active / OOS / Unassigned / Disabled
- map a tag to a product in one tap
- tap-to-verify preview
- bulk disable and bulk reassign
- "Needs Remapping" when a tag's product is deleted

**Brand theming:**
- auto-pull primary color, background, logo and font from the Shopify theme
- owner overrides for colors, font, logo and layout (minimal or content-rich)
- live preview

**Out-of-stock and discontinued products:** a default per store, overridable per product. Options:
- (A) email capture ("Get notified when it's back")
- (B) similar-product recommendations
- (C) a branded holding page linking to the storefront

A deleted product sends its tag to Unassigned and shows a graceful branded page.

### 5.3 NFC tag system
| Requirement | Spec |
|---|---|
| Hardware | NTAG213/216, white, circular, "Tap ✦" overlay |
| Pre-encoding | We encode tags before shipping. URL: `https://tapshelf.store/p/<tag-uuid>`. **The URL is permanent once deployed.** |
| Routing | Mapped → product page. Unmapped → graceful fallback. OOS → out-of-stock behavior. Disabled → store holding page. |
| Uniqueness | UUIDs are globally unique. One tag maps to one product at a time; old mappings are archived. |
| Replacement | Owner reports a damaged tag, a replacement ships, and the owner remaps it to the same product in one step |
| Kit contents | Box, tray of tags, setup card, shelf markers, founder note |

### 5.4 Customer tap page
- **Performance:** under 2 s on 4G (hard requirement), minimal JS, CDN-served assets, cache invalidated when enrichment changes
- **Structure:** hero (image, name, price, vendor) → enrichment → video → gallery → call to action that depends on stock ("Ask us about this", "Find your size", or out-of-stock behavior) → store branding
- **Tech:** works in Safari, Chrome and Samsung Internet. URL is `/p/<tag-uuid>`, not product-specific, so tags can be remapped. Each page load records a tap event: tag ID, time, device type, anonymous session ID, and dwell time.

### 5.5 Analytics dashboard
**The five core questions:**
1. What's getting tapped?
2. How long do people stay on the page (dwell time), and does video change it?
3. What isn't getting tapped?
4. When do customers engage (hour × day heatmap)?
5. What content works (enriched vs. AI-only vs. empty)?

**Hero metrics:** taps this month, and tap-to-dwell rate (share of taps with more than 30 seconds on the page).

**Tap-to-purchase:**
- Pull Shopify orders nightly and join them to taps with a 2-hour lookback.
- Show "tapped products converted X% vs. Y% for non-tapped products."
- Only unique taps count.

**Event schema:** tag_id, product_id, store_id, timestamp, session_id (anonymous cookie), device_type, dwell_seconds.

### 5.6 Pricing (as spec'd in v3)
Positioned against a part-time associate (~$700–800/mo). TapShelf should be 5–15× cheaper.

| Tier | Spec |
|---|---|
| Free | 50 taps/mo, 10 enriched products, 1 location, basic tap count |
| Starter, $49/mo | 500 taps/mo, unlimited products, full analytics, tap-to-purchase, AI copy |
| Growth, $99/mo | 2,500 taps/mo, up to 3 locations, custom theme overrides, priority support |
| Pro, $199/mo | Unlimited taps and locations, staff view, custom tap-page domain, dedicated onboarding |

- **Never hard-block a customer page.** Email at 80% of the limit, show an in-app banner at 100%, and allow a 7-day grace period before the upsell becomes persistent.
- **Unique tap:** one session, per product, per day.
- ⚠️ The code implements different tiers. See Section 11.

### 5.7 Onboarding (goal: first tag live in under 30 minutes)
1. **Connect Shopify:** show live import progress, not a spinner.
2. **Enrich your first product:** auto-pick the product with the best data, pre-fill AI copy, show a live preview, celebrate the save.
3. **Map your first tag:** tap the physical tag (Web NFC on Android, manual ID entry as a fallback).
4. **Demo tap:** the owner taps as a customer and sees "You built this." It must load in under 2 s.
5. **Keep going:** progress framing ("X of Y enriched, Z tags deployed") and an email sequence on Day 1 (welcome), Day 3 (deployment nudge) and Day 7 (first data).

---

## 6. Technical Architecture

### 6.1 Components as built
```
apps/
  admin/      Next.js admin (tapshelf.co). Per-store email+password login (PBKDF2, edge-safe)
  tap-page/   Next.js customer tap pages (tapshelf.store): /p/[tag_uuid], /me, /store/[domain], magic-link auth
services/
  api/        Fastify: Shopify OAuth (auth.ts), webhooks, Stripe billing webhook, health
  worker/     Polling worker: generate-copy, match-canonical, enrich-events
packages/
  db/         SQL migrations (0000–0016), typed query modules, seeds, schema-conformance test
```

**Scheduled jobs:** the admin exposes Vercel cron routes `api/cron/brand-refresh` and `api/cron/reviews-refresh`.

**External services:**
- Anthropic (AI copy)
- Brave Search (grounds AI copy; finds public reviews and awards)
- Twilio (SMS and WhatsApp)
- email for magic links and the notification fallback
- Stripe
- Postgres (Neon recommended)

### 6.2 Critical engineering constraints (non-negotiable)
- The tap page loads in **under 2 s on 4G**.
- **Shopify is sync-only.** Tap pages keep working if Shopify is down.
- Tag routing uptime is 99.9%+. A tap that 404s is a broken experience.
- **No PII in `tap_events`.** Only the anonymous first-party `session_id` cookie. Customer identity lives in separate `customers` / `customer_taps` tables, and only after the customer opts in by email.
- Stores with `data_sharing_opted_in = false` are excluded from every cross-store aggregation.
- Webhooks are idempotent.
- PIPEDA compliance (Canada); GDPR-ready architecture.
- **Edge runtime:** `middleware.ts` must use the Web Crypto API (`crypto.randomUUID()`), never `node:crypto`.

### 6.3 Data model
**Core (v3 §7.2):**
- `stores`
- `products`
- `enrichments`
- `tags`, which now includes a sequential per-store `tag_number`
- `tap_events`
- `orders_cache`

**Data intelligence (v3 §13.6):**
- `canonical_products`
- `brands`
- `product_canonical_map`
- `daily_product_taps`
- `weekly_brand_taps`
- `brand_dashboard_subscriptions`
- `data_access_audit`

Added to `stores`: `data_sharing_opted_in`, city/neighborhood/lat/lng. Added to `tap_events`: `canonical_product_id`, `brand_id`, `price_tier`, `enriched_at`.

**Added after v3 (see the migrations):**

| Migration | Adds |
|---|---|
| 0001 | Billing columns (Stripe) |
| 0003 | Enrichment fields: primary image, editable title, etc. |
| 0004 | Tap reactions |
| 0005 | Brand refresh |
| 0006 | Manual products and soft delete |
| 0007 | Persuasion: `enrichments.staff_photo_url`, `stores.scarcity_threshold` |
| 0008 | Customers: `customers`, `customer_taps` (email magic-link identity, loved/liked/passed reactions) |
| 0009 | Reviews: `review_sources`, `external_reviews` |
| 0010 | Public reviews and `awards`; `stores.public_reviews_enabled` |
| 0011 | Offers: `store_offers` (triggers `always`, `after_reaction`, `after_n_taps`); `customer_offers` delivery log |
| 0012 | `stores.platform` (shopify, woocommerce, squarespace, other) |
| 0013 | `tags.tag_number` |
| 0014 | `stores.name`, `store_admins` (multi-store admin logins) |
| 0015 | Store contact numbers (WhatsApp / SMS) |
| 0016 | Notifications: `customers.phone`, `preferred_channel`, `display_name`; `notification_preferences` (3×3 grid of event × engagement), `notification_subscriptions`, `notification_log` |

---

## 7. Build Order & Status (v3 §8 + §13.7)

Steps are ordered by dependency. Steps 8a–8c run alongside Phase 3.

### Phase 1: Foundation

**Step 1: Scaffolding & database 🟡**
- ✅ pnpm monorepo
- ✅ All core and intelligence tables migrated
- ✅ Env config
- ✅ CI runs migrations, typecheck and tests
- ⬜ **Performance gate:** the Lighthouse job was removed from CI (commit `b1fb968`). An untracked `apps/tap-page/.lighthouserc.json` (FCP ≤ 2 s, LCP ≤ 2.5 s) is ready to wire back in.

**Step 2: Shopify OAuth 🟡**
- ✅ OAuth flow and GraphQL catalog import
- ✅ Webhook HMAC verification and registration (unit-tested)
- ⬜ **Webhook round-trip not tested end to end** against a live dev store
- ➕ Beyond the spec: CSV product import, manual product creation, a platform picker for non-Shopify stores

**Step 3: Tag routing & tap page shell 🟡**
- ✅ `/p/[tag_uuid]` handles active, unassigned, disabled, OOS and not-found tags with branded fallbacks
- ✅ Tap events recorded; anonymous session cookie set in middleware
- ⬜ `dwell_seconds` capture on page unload or blur **isn't implemented**, so dwell metrics have no data
- ⬜ The under-2 s check needs to be re-verified (see Step 1)

**Step 4: Brand theming 🟡**
- ✅ Theme settings stored on `stores`
- ✅ Admin theme override UI with a preview
- ✅ Brand-refresh cron
- ⬜ Theme changes don't revalidate the tap-page cache (they're separate Next.js deployments)
- ❓ Auto-pull of theme from Shopify on connect: verify
- ⬜ Layout toggle (minimal vs. content-rich): verify

**Step 5: AI copy generation ✅**
- Worker `generate-copy` job
- Admin "Generate" action grounded in Brave Search results; YouTube search for videos
- Shorter copy style
- Known gap: the worker finds stores via the `STORE_IDS` env var and has no queue or retry

**Step 6: Content enrichment admin ✅**
- Product list with enrichment status
- Editor with all fields, video, staff quote and staff photo, internal notes
- Primary image URL and editable title
- Live preview
- Reviews and awards panels on each product

**Step 7: Tag management UI 🟡**
- ✅ Tag table with sequential tag numbers, sortable columns and status filter
- ✅ Tag edit page and verify link
- ✅ CSV export (for encoding)
- ⬜ **Web NFC tap-to-map** (`NDEFReader`) isn't implemented; mapping is manual
- ⬜ QR-on-backing-paper mapping
- ⬜ Out-of-stock behavior setting per product
- ❓ Bulk reassign: verify
- ⬜ UI to set `encoded_at`, `shipped_at` and `deployed_at`

### Phase 2: Content layer
Covered by Steps 5–7 above.

### Phase 3: Analytics & pricing

**Step 8: Analytics dashboard 🟡**
- ✅ Daily taps
- ✅ Top products
- ✅ Customer reactions and most-loved products
- ✅ Customer funnel and segments
- ✅ Offer performance
- ✅ "High curiosity, not converting"
- ✅ Dead zones
- ✅ Device breakdown
- ✅ Date range limited by tier
- ⬜ Hour × day heatmap
- ⬜ Dwell-based hero metric (blocked on dwell capture)
- ⬜ Enriched vs. AI-only vs. empty comparison
- ⬜ **Tap-to-purchase:** `orders_cache` exists but nothing fills it
- ⬜ Dashboard reads `tap_events` directly; the rollup tables aren't used yet

**Step 8a: Canonical product matching ✅**
- Worker `match-canonical` job (fuzzy vendor + title)
- `/canonical` review queue for low-confidence matches, with confirm action
- ⬜ Phase 2 matching on barcode/SKU
- ⬜ Seed data for the top 50 brands: verify

**Step 8b: Event enrichment & aggregation 🟡**
- ✅ Worker `enrich-events` job
- ✅ `data_sharing_opted_in` toggle in settings
- ⬜ Nightly `daily_product_taps` rollup
- ⬜ Weekly `weekly_brand_taps` rollup
- ⬜ Internal data-access API

**Step 8c: Consent & governance 🟡**
- ✅ Opt-out flag and `data_access_audit` helpers (`packages/db/src/governance.ts`)
- ⬜ Monthly job to delete raw tap events older than 24 months
- 🧍 Terms of Service and Privacy Policy need legal review
- 🧍 PIPEDA review

**Step 9: Pricing, billing & tier enforcement 🟡**
- ✅ Stripe webhook route
- ✅ `stores.tier`
- ✅ `/plan` page
- ✅ `tier-utils` limits (AI copy, tags, analytics days), unit-tested
- ⬜ Checkout / subscription creation flow: verify
- ⬜ Stripe Customer Portal
- ⬜ Counting unique taps per billing period
- ⬜ 80% email and 100% banner, with 7-day grace
- ⚠️ Tier names and limits differ from the spec (Section 11)

### Phase 4: Onboarding & launch

**Step 10: Onboarding flow 🟡**
- ✅ `/onboarding` checklist
- ✅ Welcome banner after signup (email pre-filled on login)
- ⬜ Live import progress
- ⬜ Auto-picked first product
- ⬜ NFC tap detection
- ⬜ Full-screen "You built this" demo
- ⬜ Day 1 / Day 3 / Day 7 email sequence

**Step 11: Physical kit production ⬜🧍**
- Source NTAG213 tags (HID Global, Identiv, direct manufacturers)
- Design the tag overlay, shelf markers, box and setup card
- Build an encoding script (tag CSV export is ready)
- White-glove fulfillment for the first 20 stores

**Step 12: Demo kit & sales tooling 🟡🧍**
- Build 3 demo store environments (sneaker, outdoor, menswear). A demo seed exists at `packages/db/seeds/demo.ts`.
- Pre-build a page per target store
- Write the 90-second demo script
- Prepare the leave-behind
- Offer: "I'll set up your first 10 products free"

---

## 8. Data Intelligence Layer (v3 §13, summarized)

Every tap is a declared, pre-purchase signal of interest at the product level, and no one else collects this for independent retail.

**Signals:**
- **Product:** curiosity vs. purchase gap; dwell time
- **Category and taste:** brands over-indexing on curiosity; emerging interest before it shows in sales
- **Time:** when customers are curious vs. when they decide
- **Geography:** neighborhood taste maps

**Cross-store identity:**
- Phase 1: fuzzy title + vendor match ✅
- Phase 2: SKU/EAN match ⬜
- Phase 3: curated global catalog ⬜

**Governance, required before any model beyond Model 1:**
- ToS disclosure
- store opt-out
- no PII in tap events
- Canadian data residency
- 24-month raw retention
- explicit opt-in (with a monthly credit) for brand reporting
- audit log of all external access

**Four business models:**

| Model | What | Activation threshold |
|---|---|---|
| 1. Trend reports | Quarterly Curiosity Index, gap report, emerging brands, city taste map | 50+ stores in one city, 90+ days of data |
| 2. Brand dashboards | $500–2,000/mo B2B SaaS: tap rate and conversion per SKU, geography, benchmarks | 100+ stores in 2+ cities, canonical matching live |
| 3. Buying intelligence | Growth/Pro feature: reorder signals, stocking gaps, slow movers, seasonal forecasts, display effectiveness | Growth tier; needs 90 days of store data |
| 4. Consumer discovery | "What's trending near you" | 500+ stores in 3+ cities; a separate business |

The SaaS tool is how TapShelf gets to market. The dataset is the long-term defensible asset. Build the infrastructure for it quietly and correctly now.

## 9. V2 Roadmap (v3 §9, updated)

| Feature | Status |
|---|---|
| Staff view layer (same tap; staff see inventory, notes, talking points) | ⬜ `internal_staff_notes` field exists |
| Post-purchase "product passport" | ⬜ |
| Email capture on OOS | ✅ **Pulled into V1.** Done via NotifyMe subscriptions and restock notifications |
| PWA / add to home screen | ✅ **Pulled into V1.** Hand-rolled service worker, manifest, 192/512 icons, install prompt with manual fallback |
| Multi-platform (WooCommerce, Lightspeed, Square, CSV) | 🟡 CSV and manual import plus the `platform` field exist; no WooCommerce or Squarespace sync |
| Custom domain for tap pages (Pro) | ⬜ |

---

## 10. Features Added After v3 (not in the original PRD)

These were built in May 2026. The migrations number them as expansion sections §1–§7, §14 and §16. The original expansion plan document wasn't found in the repo; this section records what was built.

**Tap page experience**
- **Visual-first redesign:** reviews moved up and long text collapsed
- **Media carousel:** swipeable, with a lightbox
- **"Your picks" bar:** fixed bar with thumbnails of products the customer reacted to
- **Reactions:** loved / liked / passed on each product
- **Persuasion elements:** staff photo beside the staff quote; "Only X left" scarcity once inventory drops below `stores.scarcity_threshold` (default 5)
- **Recognition section:** approved awards
- **Ask Us:** WhatsApp and SMS deep-link buttons using the store's contact numbers
- **NotifyMe:** inline opt-in after viewing a product (sale, restock and offer alerts); works anonymously by session or signed in
- **Offers:** store-configured codes shown `always`, `after_reaction` or `after_n_taps`, scoped per product or store-wide, with optional expiry
- **Back navigation** on product pages

**Customer accounts** (tapshelf.store)
- **Sign-in:** email magic link (`/auth/request`, `/auth/verify`, `/auth/sent`, `/auth/expired`); URLs are built from forwarded headers and never point at localhost
- **`/me` collection page:** tabs for tap history and reactions, plus offers
- **Profile:** display name, phone, preferred channel (SMS, WhatsApp or email)
- **Notification preferences:** a 3×3 grid of {sale, offer, restock} × {loved, liked, tapped}; changes save automatically
- **Store pages:** `/store/[domain]`
- **Sign-in link in the email footer**, and a root redirect

**Reviews & awards** (admin)
- **Provider integrations:** Judge.me, Loox, Okendo, Yotpo, Stamped, with auto-detection
- **Manual reviews** and a review queue (`/reviews`, `/reviews/pending`)
- **Public web reviews and awards:** opt-in, via Brave Search, approved before display
- **Refresh cron:** `api/cron/reviews-refresh`

**Notifications** (admin)
- **`/notifications` composer:** send to a product's subscribers, filtered by engagement level
- **Delivery chain:** Twilio SMS → WhatsApp → email fallback, logged to `notification_log` with the Twilio SID

**Admin / platform**
- **Multi-store admin:** `/stores`; per-store email + password login (PBKDF2, edge-safe); logout
- **Settings:** store contact numbers, platform picker, data-sharing toggle
- **Analytics additions:** customer segments, offer performance, curiosity gap, dead zones
- **`/offers` management**
- **Product import:** CSV import and manual product creation

---

## 11. Where the Spec and the Code Disagree (decisions needed)

1. **Pricing tiers.**
   - Spec: Free / Starter $49 / Growth $99 / Pro $199, metered on **taps per month**.
   - Code (`apps/admin/src/tier-utils.ts`): `free / starter / pro / enterprise`, limited on **AI copy count, tags and analytics days**.
   - `ACTION_ITEMS.md` also names Starter / Pro / Enterprise Stripe prices.
   - Decide which model is right, then update the other.
2. **Tap-page performance gate.** The spec says to enforce it in CI from day one; the Lighthouse job was removed. Decide whether to restore it.
3. **PII rule vs. customer accounts.** `tap_events` remains PII-free. Customer identity (email, phone) now lives in `customers` / `customer_taps` / `notification_*`. The privacy policy and PIPEDA review must cover this. v3 assumed no customer identity at all.
4. **"No cross-sell" principle vs. offers and the picks bar.** Offers and the picks bar are arguably engagement, not cross-sell. Confirm they're in the spirit of §4.3.

## 12. Known Gaps & Human To-Dos

**Technical gaps (from `DEFERRED.md`, updated):**
- **Rollup tables:** `daily_product_taps` and `weekly_brand_taps` are never populated.
- **Worker store discovery:** the worker reads `STORE_IDS` from env; it should `SELECT id FROM stores`.
- **Worker reliability:** no job queue, retries or locking (consider pg-boss or BullMQ before running multiple workers).
- **Connection pooling:** a `pg.Pool` singleton isn't serverless-safe. Use Neon's pooled connection string.
- **Stale tap pages after theme changes:** theme edits don't revalidate the tap page. Use on-demand revalidation with a shared secret, or short ISR.
- **Webhook testing:** no end-to-end webhook test against a live store.
- **Tag lifecycle:** no UI for the tag lifecycle timestamps.
- **Rate limiting:** none on the API. Add `@fastify/rate-limit` to the auth and webhook routes.
- **Admin authentication:** listed as missing in `DEFERRED.md`, but per-store login now exists (`apps/admin/middleware.ts`, `store_admins`). Verify it covers every route, then close the item.
- **Admin server actions trusted the client's `shop` (fixed 2026-09-28):** every `apps/admin/app/**/actions.ts` now resolves its store with `getActionStore` (`apps/admin/src/current-store.ts`), which pins store-role admins to their own store from the signed session. Admin pages and `tags/export` read `?shop=`, so `middleware.ts` now redirects a store-role admin's `?shop=` to their own store (`pinShopParam`, `apps/admin/src/shop-param.ts`). Still open: tag assign/status and review/award status updates are keyed by ID only, with no store check.

**Human / account tasks (from `ACTION_ITEMS.md`):**
- Anthropic API key
- Shopify Partner account, dev store and custom app
- Cloudflare tunnel for local OAuth testing
- Neon Postgres
- Stripe products and price IDs (set `metadata.shop_domain` on subscriptions)
- Twilio credentials
- **Legal review** of the Privacy Policy and ToS (PIPEDA). **Don't launch without it.**
- Domain chosen: ✅ `tapshelf.store` is the permanent tag URL domain.

**Open questions before launch (v3 §10):**
- Shopify App Store listing requirements
- PIPEDA
- Shopify ToS on using product data
- Tag manufacturer and minimum order quantity (quotes for 500 / 2k / 10k)
- Fulfillment for the first 20 stores
- Stripe / Ontario entity setup

## 13. V1 Success Metrics

| Metric | Target |
|---|---|
| Onboarding completion | >70% map their first tag within 48 h of connecting |
| 7-day retention | >60% of stores with a deployed tag return to the admin |
| Tap volume growth | >20% month over month in months 1–3 |
| Tap-to-dwell | >40% of taps stay >30 s *(needs dwell capture)* |
| Tap-to-purchase | Tapped products convert >2× non-tapped *(needs orders sync)* |
| NPS | >50 at 30 days |
| Paid conversion | >40% of free stores convert within 60 days of hitting the limit |

## 14. Competitive Landscape

| Company | Why TapShelf is different |
|---|---|
| Blue Bite | Enterprise and brand-side (Adidas, Bulgari). Deal sizes 10–100× ours. Sells to the brand, not the store. |
| Ombori Grid | Broad retail digitization for big retailers; NFC is a minor feature |
| Bulgari NFC | In-house, not a platform |
| Mulberry + EON | Circularity and resale, led by the brand |
| Generic QR platforms | Look cheap, no Shopify sync, no physical kit |

**The white space:** a Shopify-native NFC product experience built for boutique retailers first, with a premium physical kit and tap-to-purchase analytics.

---

## 15. Working Protocol for Claude Sessions

- **State the scope:** open each session with the Phase / Step (or Section 10 area) being worked on. Don't build ahead of it.
- **Engineering bar:** TDD, SOLID, KISS, YAGNI. Push back on anything premature or over-engineered. The full protocol is in `docs/claude-code-prompt.md`.
- **Setup:**
  ```
  corepack pnpm install
  corepack pnpm db:up
  corepack pnpm db:migrate
  ```
- **Checks:** `corepack pnpm test`, `corepack pnpm typecheck`
- **Migrations:** `packages/db/migrations/` with the next sequential number; update `packages/db/test/schema-spec.ts` too.
- **Old section numbers in code:** comments and tests cite v3 numbering. v3 §7.2 + §13.6 (data model) → v4 §6.3. v3 §8 + §13.7 (build plan) → v4 §7. v3 §4.x (features) → v4 §5.x.
- **Keep this PRD current:** update the build statuses in §7 and §10 when a step or feature lands.
- **Keep the running docs current:** add new deferrals to `DEFERRED.md` and new human tasks to `ACTION_ITEMS.md`.
- **Hosting:** Vercel; DNS via Namecheap. GitHub user `a3mckay`.

*End of document · PRD v4 · TapShelf*
