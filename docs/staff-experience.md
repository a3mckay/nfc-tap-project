# Staff Experience (Associate Training View)

**Status:** Design only. Nothing in this doc is built yet.
**Target:** V2

## Summary

Associates tap the same NFC tags that customers tap. When the tapper is a signed-in
staff member, the tap page shows a training view of the product in place of the
customer page: product knowledge, how to sell it, and live store data.

The main use case is **self-guided training during quiet periods**, not quick lookups
in front of a customer. On a slow afternoon, an associate walks the floor, taps each
product, and learns about it while standing next to it. Quick lookups beside a
customer will also happen, so the top of the view must still work at a glance.

Pitch to store owners: *your slow periods become training time, and your team
is ready for the next customer.*

## Why one URL, not two

Writing two NDEF URL records to one tag (one for customers, one for staff) doesn't
work reliably. iOS acts only on the first URL record, and Android also favours the
first. So each tag keeps a single URL, `/p/:tag_uuid`, and **the server picks the
experience based on who is signed in**:

| Tapper | Experience |
| --- | --- |
| Anonymous or signed-in customer | Customer product page (today's behaviour) |
| Signed-in staff | Staff training view, with a toggle to preview the customer page |
| Signed-in store owner | Staff view plus an "Edit" link to the enrichment form in the admin |

No separate tags and no extra work on the floor.

## Current state of the codebase

Not everything discussed earlier exists yet:

- **Tap-to-Edit is not built.** `apps/tap-page/app/p/[tag_uuid]/page.tsx` shows every
  visitor the same page. The only identity checks are the anonymous `nfc_session`
  cookie and the customer `nfc_customer` cookie (magic-link sign-in).
- **Admin sign-in doesn't reach the tap page.** The admin (`apps/admin`) uses its own
  `nfc_admin` cookie with roles `super` and `store` (`apps/admin/src/admin-auth.ts`),
  and it's a separate app. Being signed in to the admin on a phone does not
  change what a tap shows. There is no `staff` role.
- **`internal_staff_notes` exists but nothing shows it.** It's a text column on
  `enrichments`, edited in the admin under "Internal Notes"
  (`apps/admin/app/enrichment/[product_id]/EnrichmentForm.tsx`). Nothing displays it.
- **Stock is a single number per product.** `products.inventory_quantity` has no
  per-size split. Per-size stock would have to come from the `variants` JSON (from
  Shopify).
- **"Notify me" sign-ups don't record a size**, so "8 people are waiting on size 9"
  needs a size field added first.
- **Tap counts exist.** `getProductTapCount` (`packages/db/src/tap_events.ts`) and the
  analytics queries can supply "most-tapped this week".

## Proposed build

### 1. Staff identity on the tap page

- Add a `staff` role scoped to a store (a new `staff_members` table, or an
  extension of the store login in the admin).
- Staff sign in on their phone once per shift (magic link or store PIN). The tap
  page gets a signed `nfc_staff` cookie that it can verify on the server, the same
  way `getCurrentCustomer()` works today.
- The tap page only shows the staff view when the staff member's store matches the
  tag's `store_id`.

### 2. Keep staff out of customer analytics

Staff taps shouldn't count toward what customers see or what owners measure. For
staff sessions, skip or tag these:

- `insertTapEvent`, so tap counts, "X people tapped this" and the analytics
  dashboard don't include staff
- `upsertCustomerTap`, offer delivery (`getApplicableOffer`), reactions, and the
  personalisation shown to customers

Record staff taps in their own table (`staff_product_views`) to track training
progress (see §5).

### 3. Staff view content

The main case is someone learning with time to spare, so short paragraphs and a
brand video are fine. The top section still has to be readable in about 10 seconds
for quick lookups. Sections follow a learning order: **what it is → how to sell it →
what's happening now**.

**At a glance** (top, for quick lookups)
- Fit and sizing, stated honestly ("Runs small — size up; wide feet go half up")
- Stock by size right now
- The owner's one-line pitch

**Product knowledge**
- Materials in plain language ("warm, not bulky, machine washable, won't pill")
- 2–3 reasons it's worth the price
- How it compares with the closest alternative in the store
- Common customer questions with honest answers (can reuse the existing `faq`)
- Brand or training video (optional)

**Selling it**
- The owner's recommended pitch (2–3 sentences)
- Who it's for, and who it's *not* for
- Answers to objections: "It's expensive" / "I need to think about it" / "I saw it
  cheaper online"
- Products it pairs with ("We usually sell these together")

**With a customer**
- If they're undecided: what to offer (try-on, another size, the return policy)
- How to present or demonstrate it
- If their size is sold out: a script for signing them up to "Notify me"
- Display unit notes ("Display unit is a 10, not for sale")

**Live store data**
- Taps this week (customer taps only) and rank within the store
- Pending "Notify me" sign-ups (by size once that's recorded)
- Last restock date and next expected delivery (entered by the owner)

**Owner's private notes**
- `internal_staff_notes`
- Supplier or brand rep contact
- Priority or margin flags ("push this one")
- Handling instructions for fragile or unusual items

Leave out the customer-facing story copy. That belongs to the customer page, and
staff can see it through the toggle.

### 4. Admin authoring

Add a **Staff** section to the enrichment form for each product, written like
instructions left for the team rather than formal documentation. New fields on
`enrichments` (or a separate `staff_enrichments` table):

| Field | Type |
| --- | --- |
| `staff_fit_notes` | text |
| `staff_materials_plain` | text |
| `staff_value_reasons` | text[] |
| `staff_comparison` | text |
| `staff_pitch` | text |
| `staff_for_whom` / `staff_not_for_whom` | text |
| `staff_objections` | jsonb (`[{objection, response}]`) |
| `staff_pairs_with` | uuid[] (product ids) |
| `staff_demo_notes` | text |
| `staff_display_unit_notes` | text |
| `staff_priority` | enum/flag |
| `staff_supplier_contact` | text |
| `next_restock_at` | date |

The existing "Generate with AI" enrichment action could draft these fields too,
with the owner reviewing and editing the draft.

### 5. Training progress

Store staff taps in `staff_product_views (staff_id, product_id, store_id, viewed_at)`.
In the admin, show owners:

- "12 of 40 products reviewed by staff this week"
- Coverage for each associate, and products that no one has reviewed

This shows owners how engaged the team is without anyone having to report in.

## Open questions

- Staff sign-in: magic link to each associate's own email or phone, or one PIN for
  the whole store?
- Should the owner or super role get the staff view by default, or only through a
  toggle?
- Should priority and margin flags be visible to all staff, or only to managers?
- Does per-size stock need a Shopify variant-inventory sync, or is the synced
  `variants` JSON fresh enough?
