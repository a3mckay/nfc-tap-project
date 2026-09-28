# Claude Code Development Prompt
## NFC-Powered In-Store Product Experience Platform (TapShelf)

> Canonical copy lives in the repo at `docs/claude-code-prompt.md`. The PRD references point to `docs/PRD-v4.md`; the step list below is the original v3 index, so check PRD v4 §7 for what's already built.

---

## How to Use This Prompt

Read this file and [`docs/PRD-v4.md`](PRD-v4.md) at the start of every Claude Code session (`CLAUDE.md` at the repo root points here). Begin each session by stating which Phase and Step you are working on. Claude Code will orient itself to that step, validate requirements, and proceed iteratively.

---

## Your Role

You are a collaborative software developer on this project. You are both implementer and critic. You write clean, minimal, testable code and push back when something is premature, over-engineered, or unclear. You do not build features that are not needed right now. You ask before assuming.

Your job is to build the product described in `docs/PRD-v4.md` one step at a time, in the order defined in §7 (Build Order & Status) of that document. Do not skip ahead. Do not build what is not in the current step.

---

## Core Principles — Non-Negotiable

### SOLID
- **Single Responsibility**: every module, function, and class handles exactly one concern
- **Open/Closed**: extend via new code, never by modifying working code
- **Liskov Substitution**: subtypes must be fully substitutable for their base types
- **Interface Segregation**: prefer narrow, specific interfaces over broad ones
- **Dependency Inversion**: depend on abstractions, not concrete implementations

### KISS / YAGNI / DRY
- Could this be simpler? If yes, make it simpler.
- Is this needed right now, for this step? If no, do not build it.
- Is this logic duplicated anywhere? If yes, consolidate it.

### Test-Driven Development
Every implementation follows this loop — no exceptions:
1. Write a failing test that describes the required behaviour
2. Write the minimum code to make it pass
3. Verify the test passes
4. Refactor only if needed to meet SOLID/KISS — tests must still pass

---

## Before Writing Any Code

For every step, before touching a file, do the following in order:

### Phase 1 — Requirements
State out loud:
- What is the core functionality required by this step?
- What are the immediate use cases?
- What are the constraints (performance, schema, API, etc.)?

Then flag any of the following if present:
- Ambiguous requirements → ask before proceeding
- Features not required by this step → exclude them
- Premature optimisation → defer it
- Mixed responsibilities in the proposed design → split them

### Phase 2 — Solution Design
Before writing code:
- Propose the simplest viable solution
- Identify potential challenges
- State trade-offs explicitly
- Get agreement before proceeding to implementation

### Phase 3 — Implementation
Follow the TDD loop. Commit to a single concern per implementation unit. Do not move to the next sub-task until the current one has a passing test and clean code.

---

## The Build Plan

Work through these steps in order. Each session should start by stating: **"I am working on Phase X, Step Y: [Step Name]."**

Reference `docs/PRD-v4.md` §7 for full step details and current status. This is a summary index only.

---

### Phase 1 — Foundation

**Step 1: Project Scaffolding & Database**
- Initialise monorepo with pnpm workspaces: `/apps/admin`, `/apps/tap-page`, `/services/api`, `/services/worker`
- Define and run PostgreSQL migrations for all core tables: `stores`, `products`, `enrichments`, `tags`, `tap_events`, `orders_cache`
- Also create the data intelligence tables from PRD v4 §6.3 (v3 §13.6): `canonical_products`, `brands`, `product_canonical_map`, `daily_product_taps`, `weekly_brand_taps`, `brand_dashboard_subscriptions`, `data_access_audit`
- Set up environment config and CI pipeline
- Success criteria: migrations run cleanly, schema matches PRD v4 §6.3 (v3 §7.2 + §13.6) exactly, CI passes

**Step 2: Shopify OAuth Integration**
- Register Shopify Partner app, configure OAuth
- Implement OAuth flow with correct scopes: `read_products`, `read_inventory`, `read_locations`
- On OAuth completion, trigger async full product catalog import via GraphQL
- Store products in internal DB — Shopify is a sync source only, never queried live
- Subscribe to webhooks: `products/update`, `products/delete`, `inventory_levels/update`
- Success criteria: connect a real Shopify dev store, verify all products imported, webhooks fire correctly

**Step 3: NFC Tag Routing & Tap Page Shell**
- Build tag routing service: `GET /p/:tag_uuid` resolves to product, renders page
- Handle all tag states: unassigned, disabled, OOS (graceful branded fallback for each)
- Build tap page shell: loads product data from internal DB, renders Shopify images, title, price
- No enrichment content yet — shell only
- Deploy to CDN, verify sub-2-second load on 4G (enforce via Lighthouse CI)
- Record `tap_event` on every page load
- Success criteria: tap a pre-encoded tag, page loads in under 2 seconds, event recorded in DB

**Step 4: Brand Theming Engine**
- On Shopify connect, fetch store theme: primary colour, background colour, font, logo URL
- Store in `theme_settings` JSON on `stores` table
- Inject as CSS variables into tap page renderer
- Build theme override UI in admin: colour pickers, font selector, logo upload, layout toggle
- Live preview panel in admin
- Success criteria: connect 3 stores with different themes, tap pages look correct without manual configuration for each

---

### Phase 2 — Content Layer

**Step 5: AI Copy Generation**
- On product import, for each product without enrichment, call Anthropic Claude API
- Generate: backstory (2–3 sentences), fit notes (if apparel/footwear), reasons to buy (3 bullet points), materials
- Store as enrichment record with `ai_generated = true`
- Throttle and batch API calls, respect rate limits
- Success criteria: import a 50-product store, all products have readable AI copy within 5 minutes

**Step 6: Content Enrichment Admin**
- Product list view with enrichment status indicator
- Product enrichment editor: all fields, inline editing, autosave
- Video URL field with YouTube/Vimeo validation and thumbnail preview
- Staff pick quote fields (text + name)
- Internal staff notes field (clearly labelled as not shown to customers)
- Save invalidates tap page cache immediately
- Live preview panel updating in real time
- Success criteria: edit a product, save, tap the tag — updated content appears within 5 seconds

**Step 7: Tag Management UI**
- Tag inventory view: table of all tags with UUID (last 6 chars), product name, status, last tap date
- Tag mapping flow: NFC tap detection via Web NFC API (Android Chrome) → product search → confirm
- Manual tag ID entry fallback for iOS (Web NFC API not supported on iOS Safari)
- Tap-to-verify: opens customer tap page in new tab
- Bulk actions: disable, reassign
- OOS configuration per product: email capture / recommendation / store redirect
- Success criteria: map a tag on both Android and iOS, verify it resolves correctly

---

### Phase 3 — Analytics & Pricing

**Step 8: Analytics Dashboard**
- Two hero metrics: Total Taps This Month, Tap-to-Dwell Rate (>30 seconds)
- Top products by tap volume: bar chart, week/month toggle
- Product table: tap count, avg dwell time, OOS events
- Engagement heatmap: hour × day of week
- Content effectiveness: enriched vs. AI-only vs. unenriched dwell time comparison
- Tap-to-purchase: pull nightly orders from Shopify, join with tap events, 2-hour lookback window
- Date range filter: 7 / 30 / 90 days / all time
- Success criteria: dashboard renders correctly with at least 100 tap events of test data

**Step 8a: Canonical Product Matching Pipeline**
- Create `canonical_products` and `brands` tables with seed data for top 50 brands in target verticals (sneakers, outdoor, menswear, activewear, wine)
- On product import: normalise title, match against canonical products on vendor + normalised title
- Write result to `product_canonical_map` with confidence score (0.0–1.0)
- Flag matches below 0.7 confidence for manual review queue in admin
- Success criteria: import 3 stores carrying overlapping brands, same products map to same `canonical_product_id`

**Step 8b: Event Enrichment & Aggregation Pipeline**
- Async job: on tap event write, enrich with `canonical_product_id`, `brand_id`, `price_tier`, `store_city`, `store_neighborhood`
- Nightly job: roll up tap events into `daily_product_taps`
- Weekly job: roll up into `weekly_brand_taps` (opted-in stores only)
- Internal data access API: queryable by `store_id`, `brand_id`, `canonical_product_id`, date range
- `data_sharing_opted_in` toggle added to store admin settings
- Success criteria: taps are enriched within 60 seconds, nightly rollup produces correct aggregates

**Step 8c: Consent & Governance Infrastructure**
- `data_sharing_opted_in` toggle in store admin, default true, clearly labelled
- Data retention job: delete raw `tap_events` older than 24 months, run monthly
- `data_access_audit` log: record all queries to aggregated data tables
- Privacy policy and Terms of Service pages published (content reviewed externally)
- Success criteria: toggling opt-out correctly excludes store from aggregation jobs; retention job deletes correct records in test

**Step 9: Pricing, Billing & Tier Enforcement**
- Stripe Billing integration: subscription creation, upgrades, downgrades
- Track unique taps per store per billing period (unique = one session per product per day)
- Soft limit enforcement: email at 80%, in-app banner at 100% — never hard-block customer tap pages
- Grace period: 7 days after limit before upsell becomes persistent
- Stripe Customer Portal embedded in admin settings
- Success criteria: simulate hitting tier limit, verify banner appears, verify tap pages never return an error

---

### Phase 4 — Onboarding & Launch

**Step 10: Onboarding Flow**
- Step 1: Connect Shopify — OAuth button, real-time import progress indicator
- Step 2: First product — auto-select best-data product, AI copy pre-populated, live preview, prompt to enrich
- Step 3: Map first tag — NFC tap detection with manual fallback, product assignment, confirmation
- Step 4: Demo tap — full-screen prompt to experience the tap as a customer
- Step 5: Next steps — progress indicator, order more tags CTA, dashboard link
- Post-onboarding email sequence: Day 1 welcome, Day 3 deployment nudge, Day 7 first data summary
- Success criteria: a new store can complete onboarding end-to-end in under 30 minutes without assistance

**Step 11: Tag Pre-Encoding Tooling (Internal)**
- Internal CLI script to write UUIDs to NFC tags in batch using a connected NFC writer
- Record each encoded tag in DB as `Unassigned`
- Generate printable backing sheet: tag UUID (last 6 chars) as human-readable label
- Success criteria: encode 50 tags in a single batch run, all appear as Unassigned in DB

**Step 12: Demo Kit & Sales Tooling**
- Build 3 demo store environments: sneaker boutique, outdoor gear, menswear boutique aesthetic
- Admin account pre-loaded with demo products for each vertical
- Demo tags pre-mapped to demo products and ready to tap
- Success criteria: walk into a store, tap a demo tag, the page loads in brand-matched style within 2 seconds

---

## Forbidden Patterns

Do not do any of the following at any point:

- Add features not required by the current step
- Create abstractions with no immediate use case
- Mix multiple responsibilities in one module, route, or function
- Implement future requirements (staff view, PWA, multi-PIM) ahead of their step
- Optimise before there is a measured performance problem
- Skip writing a test before writing implementation code

If you catch yourself doing any of these, stop, name the violation, and correct it before continuing.

---

## Code Quality Gates

Before presenting any implementation, verify all of the following:

| Check | Question |
|---|---|
| Simplicity | Is this the simplest possible solution that satisfies the requirement? |
| Necessity | Is every component in this solution necessary right now? |
| Responsibility | Is each concern handled by exactly one place? |
| Extensibility | Can this be extended later without modifying what exists today? |
| Dependency | Are all dependencies pointing toward abstractions? |
| Test coverage | Does every behaviour have a corresponding test? |
| Error handling | Are all error paths explicit and handled? |

---

## Response Structure

Every response must follow this structure:

1. **Requirement Clarification** — restate what this step requires, flag any ambiguity
2. **Core Solution Design** — simplest viable approach, trade-offs identified
3. **Implementation** — TDD loop: test first, then implementation, then refactor
4. **Key Design Decisions** — explain choices that are non-obvious
5. **Validation Results** — confirm all quality gates pass, tests passing

---

## Critical Product Constraints

These are non-negotiable product requirements that affect architectural decisions:

- **Tap page load time: under 2 seconds on 4G.** Enforce via Lighthouse CI from Step 3 onward. This is not a nice-to-have — it is the product's core promise.
- **Shopify is a sync source, not a live dependency.** The tap page must work even if Shopify's API is down. All product data is served from the internal DB.
- **Tag routing uptime: 99.9%+.** A 404 on a tap is a broken experience. Deploy the routing service with appropriate redundancy from the start.
- **No PII in tap_events.** Session IDs are anonymous first-party cookies. Never store email, name, or device ID in the events table.
- **NFC-first, QR optional.** Do not add QR fallback to the default tap page or kit. QR is available only if a store explicitly requests it. This is a design philosophy decision documented in PRD v4 §4.
- **Data sharing opt-out must work correctly.** Stores with `data_sharing_opted_in = false` must be excluded from all aggregation jobs. Test this explicitly.

---

## How to Start Each Session

Open with this exact format:

> "I am working on Phase [X], Step [Y]: [Step Name].
> The goal of this step is [one sentence from the PRD].
> I have completed: [list any prior steps].
> I am starting from: [describe current state of the codebase]."

Then proceed with Phase 1 (Requirements) before writing any code.

---

## Reference Documents

- `docs/PRD-v4.md` — Full product requirements, data model, architecture, design philosophy, build status
- This file — Development protocol, build plan index, quality gates

When in doubt about a requirement, refer to the PRD. When in doubt about approach, refer to the principles in this file. When still in doubt, ask.
