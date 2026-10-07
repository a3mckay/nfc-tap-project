# TapShelf — Product Requirements & Build Status (PRD v4)

**NFC-powered in-store product experience platform for independent boutiques**

| | |
|---|---|
| Version | v4 (supersedes `nfc-product-prd-v3.docx`, Apr 30 2026) |
| Canonical location | `docs/PRD-v4.md` in this repo. Edit this file; local copies are not authoritative. |
| Updated | 2026-10-02 |
| Repo | `github.com/a3mckay/nfc-tap-project` (pnpm monorepo) |
| Domains | `tapshelf.co` (marketing), `admin.tapshelf.co` (admin), `tapshelf.store` (customer tap pages) |
| Hosting | Railway: admin, tap page and Postgres, deployed from `main` |
| Audience | Founder + Claude Code sessions (local and cloud) |

### What changed from v3

1. The product is named **TapShelf**. v3 still said "[Product Name TBD]".
2. Every build step now has a **status**, based on a scan of the codebase on 2026-09-28.
3. **Section 10** adds the features built *after* v3 that the v3 PRD never specified: customer accounts, reactions, reviews, offers, Ask Us, notifications, PWA, multi-store admin, and others.
4. **Section 12** brings in the known gaps from `DEFERRED.md` and the human to-dos from `ACTION_ITEMS.md`.
5. **Section 11** lists places where the code and the spec disagree (for example, pricing tiers).
6. **Staff logins and the staff training view** moved from the V2 roadmap into the build order as the **next priority** (§7 Phase 5, Step 13). Decided 2026-09-28. The design is in [`docs/staff-experience.md`](staff-experience.md).
7. **2026-10-02 → 2026-10-05:** the Shelf-Side AI Assistant (customer Ask, staff Ask in the existing training view, question insights) was specified and approved as §7 Phase 6, Step 15. Spec: [`docs/PRD-ai-assistant.md`](PRD-ai-assistant.md).
8. **Section 16** lists parked features: built or spec'd, still wanted, set aside for now. First entry: customer contact over WhatsApp/SMS (2026-10-05).

### Status legend

- ✅ **Built**: implemented in the repo
- 🟡 **Partial**: some of it is built; what's missing is listed
- ⬜ **Not started**
- 🔍 **Discovery**: spec in progress; not approved for build
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
  admin/      Next.js admin (admin.tapshelf.co). Per-store email+password login (PBKDF2, edge-safe)
  tap-page/   Next.js customer tap pages (tapshelf.store): /p/[tag_uuid], /me, /store/[domain], magic-link auth
services/
  api/        Fastify: Shopify OAuth (auth.ts), webhooks, Stripe billing webhook, health
  worker/     Polling worker: generate-copy, match-canonical, enrich-events
packages/
  db/         SQL migrations (0000–0023), typed query modules, seeds, schema-conformance test
  email/      Resend wrapper shared by the admin and the tap page
```

**Scheduled jobs:** the admin exposes cron routes `api/cron/brand-refresh` and `api/cron/reviews-refresh`. They need an external scheduler; what triggers them in production isn't recorded yet (see `ACTION_ITEMS.md`).

**External services:**
- Anthropic (AI copy)
- Brave Search (grounds AI copy; finds public reviews and awards)
- Twilio (SMS and WhatsApp)
- email for magic links and the notification fallback
- Stripe
- Postgres (Railway)

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
| 0017 | Staff: `store_staff` (emails approved by the store admin; soft-removed via `revoked_at`) |
| 0018 | Staff sign-in: `staff_auth_tokens` (single-use emailed links; SHA-256 hash only, 15 min) |
| 0019 | Staff training notes: `product_training` (ten optional owner-written fields per product; store-scoped) |
| 0020 | Admin → tap page sign-in handoff: `tap_handoff_tokens` (single-use, 60 s, hash only; staff member or store owner) |
| 0021 | Training progress: `staff_product_views` (a staff member opening a product's training view) |
| 0022 | Manager roles: `store_staff.role` (staff / co_manager / manager), `store_staff.password_hash` |
| 0023 | `staff_auth_tokens.purpose` (sign_in / set_password) |
| 0024 | Shelf-Side AI Assistant: `product_questions` (PII stripped on write), `question_themes`, `product_answers` (hidden answer pool), `product_facts` (research fact sheet), `enrichments.great_when` |
| 0025 | `store_brand_websites` (each store's brand website for brand-first research; `confirmed` once an owner or manager checks it) |
| 0026 | `store_policies` (one row per filled-in policy; the types live in `packages/db/src/store-policies.ts`) |
| 0027 | `product_question_reviews` (when the team last opened a product on the Questions tab; later questions are "new") |
| 0028 | `product_review_flags` (contradictions between a product's notes, and research findings that don't fit it; one row per kind) |
| 0029 | Category spec fields: `stores.industry`, `products.spec_category`, `product_specs` (one value per spec field, with its source; owner edits win) |

---

## 7. Build Order & Status (v3 §8 + §13.7)

Steps are ordered by dependency. Steps 8a–8c run alongside Phase 3.

> **Phase 5 (staff experience) is complete: Step 13 (staff logins & training view, 2026-09-29) and Step 14 (manager and co-manager roles, 2026-09-29).** The founder had moved it ahead of the remaining Phase 3–4 gaps on 2026-09-28. Next planned feature (founder, 2026-10-05): the **Shelf-Side AI Assistant**, §7 Phase 6, Step 15 (approved; spec in [`docs/PRD-ai-assistant.md`](PRD-ai-assistant.md)), then weekly training quizzes for staff (not started; see `docs/staff-experience.md`, "Later: weekly quizzes").

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
- ✅ Job to delete raw data older than 24 months (2026-10-05): `deleteExpiredRawData` removes tap events, reactions and chat questions; `/api/cron/retention` runs it daily, called by `.github/workflows/scheduled-jobs.yml`. Daily totals and signed-in customers' own history stay. Needs `CRON_SECRET` set (see `ACTION_ITEMS.md`).
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

### Phase 5: Staff experience ✅

**Step 13: Staff logins & training view ✅**

Design: [`docs/staff-experience.md`](staff-experience.md). Associates tap the same tags as customers. A signed-in staff member of the tag's store sees a training view by default, with a toggle to the customer page. The main use case is self-guided product training during quiet periods.

Decided:
- The store admin approves staff email addresses in the admin; staff can't sign up on their own
- Staff sign in on the admin (admin.tapshelf.co) with an emailed link, and a one-time handoff carries the sign-in to the tap page (tapshelf.store)
- Signed-in staff see the training view by default, with a toggle to the customer page
- Staff taps are kept out of customer analytics, offers and personalisation
- Owners can see training progress ("31 of 40 products reviewed")

Sub-steps:
- ✅ 13a: `store_staff` table and the admin Staff page (`/staff`: add, list, remove approved emails)
- ✅ 13b: `staff` admin role (30-day session, confined to `/training`), staff sign-in by emailed link at `/login/staff` (one link per store), staff home page, invite email when an owner adds staff
- ✅ 13c: handoff to the tap page — staff (after their emailed link) and store owners (after login) get a 30-day `nfc_staff` cookie on tapshelf.store via a single-use token; `getCurrentStaff()` re-checks them on every request; admin sign-out clears it too
- ✅ 13d: staff and owners of the tag's store see the training view on tap by default (owner's notes, or the product page's fit, materials and FAQ when there are none yet); "View as customer" shows a preview with reactions, sign-ups, offers and personalisation off; their taps never count as customer taps
- ✅ 13e (built before 13c/13d): Staff training page per product (`/enrichment/[id]/training`, with Customer page | Staff training tabs and a link from the Content list) — ten optional fields (one-line sell, who it's for / not for, fit and sizing, worth the price, closest alternative, common Q&A, companions, brand context, stock note) in `product_training`, with an optional "Draft with AI" that fills only empty fields
- ✅ 13f: training progress — each staff member's training-view taps are recorded in `staff_product_views` (not owners', not the customer preview); owners' Staff page shows "12 of 40 products reviewed · last active …" per person, notes coverage and products nobody has reviewed; the staff home page lists what's left to tap. Only products with an active tag count.

Deferred: Tap-to-Edit and live stock data in the staff view (see §12).

**Step 14: Manager and co-manager roles ✅** (founder, 2026-09-29)
- The owner can make anyone on the Staff list a **manager** or **co-manager**; a manager can make someone a co-manager (or back to staff) but can't make or change managers.
- Managers and co-managers get an emailed "Set your password" link (single-use, 3 days) and then sign in on the normal admin login with their own password; demoting someone to staff removes their password.
- One permission table (`apps/admin/src/permissions.ts`) is enforced by the middleware (pages), `getActionStore(pool, shop, permission)` (every server action, with the manager's role re-read from the database), the layout (live role re-check; the sidebar shows only allowed areas), and the tag CSV export. A manager's cookie is re-checked against the database at least once a minute: the middleware sends a stale cookie through `/api/session/refresh`, which re-signs it with the current role or signs the person out (`apps/admin/src/session-refresh.ts`). So demotions, removals and promotions reach client-side navigation and route handlers too:

| Area | Owner | Manager | Co-manager |
|---|---|---|---|
| Staff training notes | ✅ | ✅ | ✅ |
| Customer product content, reviews | ✅ | ✅ | ✅ |
| Training progress (Staff page) | ✅ | ✅ | view only |
| Add / remove staff (not managers) | ✅ | ✅ | ❌ |
| Make someone a co-manager | ✅ | ✅ | ❌ |
| Make, change or remove a manager | ✅ | ❌ | ❌ |
| Products and tags | ✅ | ✅ | ❌ |
| Offers and customer notifications | ✅ | ✅ | ❌ |
| Analytics | ✅ | ✅ | ❌ |
| Theme, settings, product matching, getting started | ✅ | ❌ | ❌ |
| Plan and billing | ✅ | ❌ | ❌ |

### Phase 6: Shelf-Side AI Assistant ✅

**Step 15: Shelf-Side AI Assistant ✅** (built 2026-10-05; go-live checklist in `ACTION_ITEMS.md`) (approved by the founder 2026-10-05)

Spec: [`docs/PRD-ai-assistant.md`](PRD-ai-assistant.md) (decisions D1–D45). Customers ask questions on the tap page and get answers grounded in the store's data. Staff can ask the same AI from the training view. Owners, managers and co-managers review every question, grouped by theme, and add answers that the AI uses from then on. Comes before weekly staff quizzes (D36). Slices, in dependency order:

- ✅ **15a Data and PII** (2026-10-05): migrations for `product_questions`, `question_themes`, `product_answers` (the hidden answer pool), the per-product research fact sheet, and the "Great when…" key-points field on `enrichments`. A tested PII-stripping function that names what it removed (D10, D30): `redactPii` (`packages/db/src/pii.ts`) removes emails, phone numbers and Luhn-valid card numbers; names aren't detected. `recordQuestion` (`packages/db/src/product-questions.ts`) always strips question and answer text before writing and checks that the product and staff member belong to the store.
- ✅ **15b Research tool upgrade** (2026-10-05; §6.2 of the spec): find the brand's website (`brands.website`, else search); search the brand's site first; read the page, not just the snippet; save a fact sheet with a source URL per fact; owners and managers can view and edit it in the product editor; regenerating keeps their edits. Also drafts "Great when…". Built: `apps/admin/src/lib/product-research.ts` (brand-domain lookup, brand-first ranking, page reading limited to public https with every redirect checked, and source-checked facts); Generate saves the fact sheet (`product_facts`) and up to 3 "Great when…" points; there's a fact-sheet panel and a brand-website setting on the product editor ("content" permission). Research runs only when `BRAVE_SEARCH_API_KEY` is set; without it, the fact sheet is left as is.
- ✅ **15c Answer engine** (2026-10-05): gathers sources in priority order (answer pool → owner content → product data and fact sheet → reviews → store answers), with Claude Sonnet 5.5 (D16, D52; Haiku 4.5 was the first choice), streamed and prompt-cached. Applies the no-upsell tone rules (§6.1), the regulated-facts rule (D9), the sourced-claims rule (D41), and the fixed stock/size reply (D25). Flags Unanswered (D5); answers in the customer's language (D24); caps at 10 questions per product per visit (D22). Strips PII before saving. Keeps tap-page load under 2 s by loading the chat lazily. Built: `POST /api/ask` on the tap page (`apps/tap-page/app/api/ask/route.ts`) streams newline-delimited JSON events (`pii`, `delta`, `done` with source labels, `limit`, `error`). The engine is in `apps/tap-page/src/ask/` (`prompt.ts` rules and context, `meta.ts` answer/metadata splitter, `handle.ts` orchestration, `load.ts`, `model.ts`). PII is stripped before the model sees a question, not only before saving. Stock/size questions get the fixed reply and are recorded as answered with a `stock_reply` source, so they don't fill the Unanswered list. The team's own previews aren't recorded. It needs the `nfc_session` cookie, which the product page sets.
- ✅ **15d Quality test set** (D33; passed 2026-10-05): about 100 questions (shoes and menswear first; some womenswear and home furnishings), including questions that invite an upsell. The founder checks the expected answers once. The answer engine must pass before 15e ships. Step up to Sonnet 5.5 only if Haiku fails (D16). **Founder update 2026-10-05:** 350 questions (50 each: shoes, cannabis, wine, womenswear, sunglasses from the sample store's products; menswear and home furnishings from sample products). Built: `apps/tap-page/eval/` (questions, rule-based safety checks, a Sonnet 5.5 judge, and a read-only runner; see its README). **Result:** after four runs and engine fixes (mode line with server-sent fixed replies, price reply, label backstop, team-notes ordering), Sonnet 5.5 passed with 100% safety and about 95% quality; Haiku 4.5 stayed at about 75%, so answers moved to Sonnet 5.5 (D52). Re-run with `corepack pnpm --filter @nfc/tap-page eval` after prompt or data changes (about $3).
- ✅ **15e Customer Ask on the tap page** (2026-10-05): header carousel kept; "Great when…" key points (D21) above long details collapsed behind "More details"; full-width Ask bar with a floating "Your picks" pill (option A, D37); half-sheet chat that can minimize (D4, D28); suggested-question chips (D23); "Sources" tap (D29); one-line AI disclosure (D19, §7.1). Built: `KeyPoints` (Great when…, else the first three reasons to buy) replaces "Why we love it"; `AskBar` (full-width bar → half-sheet chat that expands and minimizes, suggestion chips from the product FAQ, streamed answers, personal-details notice, Sources tap, disclosure; conversation kept for the visit in sessionStorage); `PicksBar` is now a floating "Your picks (N)" pill and tray that hides while the chat is open; the reactions row moved inline under the key points (founder to confirm), so the bottom of the screen belongs to the Ask bar; the WhatsApp/SMS Ask Us card is removed (D26). Partial answers (D53) carry the note "We've shared the rest of your question with {store}" and are flagged Unanswered for owners. Test set after D53: 100% safety, about 92% quality.
- ✅ **15f Theme grouping** (2026-10-05): a background job groups questions into product themes and store-wide themes (D8). Stock and size questions get their own theme (D25). Built: grouping runs right after each question is saved (`apps/tap-page/src/ask/group.ts`, `classify.ts`), not as a worker job, because the worker isn't deployed on Railway. Each run also picks up that product's earlier ungrouped questions, so failures retry themselves. Claude Haiku 4.5 with a structured output reuses or creates product themes under store-wide themes (`packages/db/src/question-themes.ts`); questions in other languages get English themes.
- ✅ **15g Questions tab (admin)** (2026-10-05): a new nav item for owners, managers and co-managers (new `questions` permission). Products appear automatically once they have a question; grouped summaries by default, with a Verbatim toggle; an Unanswered filter; answering adds to the answer pool (D12, D38); explicit "Show on product page" and "Add to training Q&A" buttons. Store policies have their own page (15j, D48). Built: `/questions` (products with questions: total, new since last opened, Unanswered, top theme, last asked; new or unanswered first) and `/questions/[product_id]` (themes with counts and the latest answer; a Verbatim toggle with status, Staff label, and PII-removed flags; an Unanswered filter; answer a theme or a question; dismiss; "Your answers" with Show on product page, Add to training Q&A, and Remove). New `questions` permission (owner, manager, co-manager); data in `packages/db/src/question-insights.ts`. Super admins can open any store's questions (D20).
- ✅ **15h Staff side** (2026-10-05): "Customers are asking" under the one-line sell in the training view, and a staff Ask box that can also use training notes and internal notes (D6, D13, D31). Staff questions appear on the Questions tab with a "Staff" label and name. Built: `StaffShell` shows "Customers are asking" (top 5 themes, counts, latest answer, total so far) after the one-line sell, and the Ask bar pinned at the bottom, calling `/api/staff-ask`. That endpoint only accepts signed-in staff or the owner of the tag's store; its answers can also use internal notes and the 20 most recent customer questions, and staff questions are recorded as `asked_by = staff` with the staff member's id. Shared request handling lives in `apps/tap-page/src/ask/respond.ts`.
- ✅ **15i Admin home page** (2026-10-05): `/` becomes a real home page with tap activity and customer questions at a glance (D44), and it's where owners, managers and co-managers land after sign-in (D45). Built: `apps/admin/app/page.tsx` with a questions card ("Customers asked N questions this week · top theme", most-asked product, link to Unanswered) for anyone with the `questions` permission, and a taps card (this week vs last, top 3 products) for anyone with `analytics`; counts in `packages/db/src/home-summary.ts`. `adminHomePath` and the owner sign-in now go to `/?shop=…`; the sidebar's "TapShelf Admin" links home.
- ✅ **15j Store policies page** (2026-10-05; D48): owners and managers fill in the standard policies; the assistant's `store_policy` source reads them. Built: `/policies` in the admin (new `policies` permission: owner and manager), eight policy types (returns and exchanges, warranty and repairs, alterations and tailoring, price matching, holds and special orders, delivery and shipping, gift cards and gift wrap, ID and age requirements); the assistant reads them first in its `store_policy` section.
- ✅ **15k Contradiction and AI-draft checks** (2026-10-05; D49, D50): the conflict banner on save/generate; Generate checks findings against the product's title and type; "AI draft, not reviewed" marking; reviewed content ranks above AI drafts. Built: after saving product copy, saving training notes, or Generate, a Claude Haiku 4.5 check (`apps/admin/src/lib/consistency-check.ts`, `check-product.ts`) compares customer copy, training notes and research facts and stores contradictions; Generate also returns and stores findings that don't fit the product (`mismatches`). Both show in a "Check these before customers ask" banner on the product and training editors, and clear when the notes agree. A check failure never blocks a save. On the tap page, copy still marked `ai_generated` ranks below the listing and research. "AI draft, not reviewed" marking uses the existing `ai_generated` flag, which saving clears.
- ✅ **15l Category spec fields** (2026-10-05; D51): per-product spec templates by product type (store industry as default), filled by the research tool with sources, read by the assistant. Built: templates and detection in `packages/db/src/spec-templates.ts` (cannabis, wine, beer, spirits, eyewear, footwear, apparel, home, general); `product_specs` storage; Generate fills only fields a numbered source states; a "Product specs" panel on the product editor (category picker with "Automatic" detection; values typed there win); "Main industry" in Settings as the fallback (it replaced a duplicated platform section); the assistant lists specs in the product listing. **Fix 2026-10-07:** the spec boxes now show values Generate saved without a page reload; a box the owner has typed in and not saved keeps their text (`apps/admin/src/spec-values.ts`).
- 🧍 Privacy Policy and store Terms of Service updates for saved questions and the founder's cross-store access (D19, D20); part of the existing legal review.

Out of scope for this phase: weekly owner email (D43, `DEFERRED.md`), thumbs up/down (D39), problem-first framing of the existing copy prompt, live stock answers (D25).

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
| Staff view layer (same tap; staff see inventory, notes, talking points) | ➡️ **Moved into V1** as §7 Phase 5, Step 13 (current priority). Live inventory in the staff view stays deferred. |
| **Shelf-Side AI Assistant**: customers ask questions on the tap page; staff can ask the same AI and see "common questions" in the Step 13 training view; owners and managers see questions grouped into themes. Builds on Step 13. | ➡️ **Moved into V1** as §7 Phase 6, Step 15 (approved 2026-10-05). Spec: [`docs/PRD-ai-assistant.md`](PRD-ai-assistant.md). |
| Post-purchase "product passport" | ⬜ |
| Email capture on OOS | ✅ **Pulled into V1.** Done via NotifyMe subscriptions and restock notifications |
| PWA / add to home screen | ✅ **Pulled into V1.** Hand-rolled service worker, manifest, 192/512 icons, install prompt with manual fallback |
| Multi-platform (WooCommerce, Lightspeed, Square, CSV) | 🟡 CSV and manual import plus the `platform` field exist; no WooCommerce or Squarespace sync |
| Custom domain for tap pages (Pro) | ⬜ |

---

## 10. Features Added After v3 (not in the original PRD)

These were built in May 2026. The migrations number them as expansion sections §1–§7, §14 and §16 (an older plan's numbering, not this PRD's). The original expansion plan document wasn't found in the repo; this section records what was built.

**Tap page experience**
- **Visual-first redesign:** reviews moved up and long text collapsed
- **Media carousel:** swipeable, with a lightbox
- **"Your picks" bar:** fixed bar with thumbnails of products the customer reacted to
- **Reactions:** loved / liked / passed on each product
- **Persuasion elements:** staff photo beside the staff quote; "Only X left" scarcity once inventory drops below `stores.scarcity_threshold` (default 5)
- **Recognition section:** approved awards
- **Ask Us:** WhatsApp and SMS deep-link buttons using the store's contact numbers. ⏸️ *Parked 2026-10-05: replaced by the AI assistant. See §16.*
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
- **Delivery chain:** Twilio SMS → WhatsApp → email fallback, logged to `notification_log` with the Twilio SID. ⏸️ *Text and WhatsApp parked 2026-10-05; alerts go by email. See §16.2.*

**Admin / platform**
- **Multi-store admin:** `/stores`; per-store email + password login (PBKDF2, edge-safe); logout
- **Settings:** store name (shown to customers on tap pages, in the chat and in link previews; added 2026-10-05), platform picker, main industry, data-sharing toggle (the store contact numbers section was removed 2026-10-05; see §16)
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
5. **Shelf-Side AI Assistant vs. the current tap page.** Decided (D1–D45 in [`docs/PRD-ai-assistant.md`](PRD-ai-assistant.md)). §5.4 will be updated when Step 15e lands.

## 12. Known Gaps & Human To-Dos

**Technical gaps (from `DEFERRED.md`, updated):**
- **Rollup tables:** `daily_product_taps` and `weekly_brand_taps` are never populated.
- **Worker store discovery:** the worker reads `STORE_IDS` from env; it should `SELECT id FROM stores`.
- **Worker reliability:** no job queue, retries or locking (consider pg-boss or BullMQ before running multiple workers).
- **Connection pooling (closed 2026-09-28):** the apps run on Railway as long-lived Node servers, where the `pg.Pool` singleton is correct. Revisit only if hosting moves to serverless.
- **Stale tap pages after theme changes:** theme edits don't revalidate the tap page. Use on-demand revalidation with a shared secret, or short ISR.
- **Webhook testing:** no end-to-end webhook test against a live store.
- **Tag lifecycle:** no UI for the tag lifecycle timestamps.
- **Rate limiting:** none on the API. Add `@fastify/rate-limit` to the auth and webhook routes.
- **Tap-to-Edit (deferred 2026-09-28):** an "Edit" link on the tap page for owners. Low priority; owners edit in the admin.
- **Live store data in the staff view (deferred 2026-09-28):** stock by size, "Notify me" sign-ups by size, restock dates, tap trends. Stock is a single `inventory_quantity` per product and NotifyMe doesn't record a size.
- **Admin authentication:** listed as missing in `DEFERRED.md`, but per-store login now exists (`apps/admin/middleware.ts`, `store_admins`). Verify it covers every route, then close the item.
- **Admin server actions trusted the client's `shop` (fixed 2026-09-28):** every `apps/admin/app/**/actions.ts` now resolves its store with `getActionStore` (`apps/admin/src/current-store.ts`), which pins store-role admins to their own store from the signed session. Admin pages and `tags/export` read `?shop=`, so `middleware.ts` now redirects a store-role admin's `?shop=` to their own store (`pinShopParam`, `apps/admin/src/shop-param.ts`). ID-keyed writes are store-scoped too (fixed 2026-09-28): tag assign/status and review/award status updates filter on `store_id` (tag assignment also checks the product belongs to the store), the review-approval actions resolve their store with `getActionStore`, and the public-review search and per-product pending list check `product.store_id`. Covered by `packages/db/test/store-scoping.test.ts` and `apps/admin/test/store-scoped-actions.test.ts`.

**Human / account tasks (from `ACTION_ITEMS.md`):**
- Anthropic API key
- Shopify Partner account, dev store and custom app
- Cloudflare tunnel for local OAuth testing
- ✅ Postgres on Railway
- ✅ Railway pre-deploy command on the admin service, so migrations run on every deploy
- Confirm what triggers the two cron routes in production
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
- **Hosting:** Railway (admin, tap page, Postgres), deployed from `main`; DNS via Namecheap. GitHub user `a3mckay`.
- **Migrations in production:** the admin service's Railway pre-deploy command runs `pnpm --filter @nfc/db migrate:up` before each deploy. To run them by hand, use the Postgres service's `DATABASE_PUBLIC_URL` (the plain `DATABASE_URL` is only reachable inside Railway): `DATABASE_URL="…" corepack pnpm db:migrate`.

## 16. Parked Features (good ideas, not now)

Features that were built or spec'd and then deliberately set aside. They're still wanted; they're waiting for the right time. Before reviving one, check it against what's been built since.

### 16.1 Customer contact (Ask Us over WhatsApp / SMS)

- **What it was:** the store entered a WhatsApp and an SMS number in Settings ("Customer contact"). The tap page showed an "Ask Us" card that opened a WhatsApp chat or the phone's messages app with the store.
- **Why it's parked (2026-10-05):** the Shelf-Side AI Assistant (§7 Phase 6) answers customer questions on the tap page, saves them, and sends the ones it can't answer to the store (D5, D26, D53). The Ask Us card was removed from the tap page in Step 15e, which left the Settings section doing nothing, so it was removed too.
- **What's kept:** the `stores.whatsapp_number` and `stores.sms_number` columns (migration 0015) and any numbers already saved. Nothing reads or writes them now. The Settings form, its save action and the phone-number formatter are in git history (removed in the commit that added this section).
- **When it could come back:**
  - as a "Talk to a person" option in the chat when the AI can't answer and the store wants live replies;
  - for stores that staff a phone line and want customers to reach them directly.
- **Open questions when revived:** should the customer's question and the AI's attempt go with the message? Who answers outside store hours? How do we capture these conversations as questions for the owner's Questions view, the way the chat does?

### 16.2 Text and WhatsApp alerts (Twilio)

- **What it is:** the `/notifications` composer sends sale, restock and offer alerts by SMS first, then WhatsApp, then email (`apps/admin/src/lib/notify.ts`). Customers can pick SMS or WhatsApp as their preferred channel on their profile.
- **Why it's parked (2026-10-05):** Twilio was never set up (no `TWILIO_*` variables in Railway), and owner notifications are a lower priority than the AI assistant. Without Twilio, every alert falls back to email, so nothing is broken.
- **What's kept:** all the code, and the SMS / WhatsApp choice on the customer profile (an SMS or WhatsApp pick gets email for now). The privacy page doesn't mention texts or Twilio; add them back when this ships.
- **To turn it on:** a Twilio account, a sending number and an approved WhatsApp sender; set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` and `TWILIO_WHATSAPP_FROM` on the admin service; add a one-click opt-out to texts (reply STOP) and emails, which Canada's anti-spam law (CASL) expects; update the privacy page.

---

*End of document · PRD v4 · TapShelf*
