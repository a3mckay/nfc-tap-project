# Staff Experience (Associate Training View)

**Status:** Design only. Nothing in this doc is built yet.

## Summary

Associates tap the same NFC tags that customers tap. When the tapper is a signed-in
staff member, the tap page shows a training view of the product in place of the
customer page: product knowledge and how to sell it.

The main use case is **self-guided training during quiet periods**, not quick lookups
in front of a customer. On a slow afternoon, an associate walks the floor, taps each
product, and learns about it while standing next to it. Quick lookups beside a
customer will also happen, so the top of the view must still work at a glance.

Pitch to store owners: *your slow periods become training time, and your team
is ready for the next customer.*

## Scope

**In scope (V1 of this feature)**
1. A staff role under the store admin: the store admin approves staff email addresses
2. Staff sign-in on the tap page
3. A staff training view shown when a signed-in staff member taps a tag from their store
4. A Staff section in the admin enrichment form for writing the training content
5. Keeping staff taps out of customer analytics and features
6. Training progress for owners ("12 of 40 products reviewed")

**Deferred (low priority)**
- **Tap-to-Edit** (an "Edit" link on the tap page for owners). Owners already edit
  products in the admin dashboard.
- **Live store data**: stock by size, "Notify me" sign-ups by size, restock dates,
  tap trends in the staff view. Stock today is one `inventory_quantity` per product,
  and "Notify me" sign-ups don't record a size. Revisit later.

## Why one URL, not two

Writing two NDEF URL records to one tag (one for customers, one for staff) doesn't
work reliably. iOS acts only on the first URL record, and Android also favours the
first. So each tag keeps a single URL, `/p/:tag_uuid`, and **the server picks the
experience based on who is signed in**:

| Tapper | Experience |
| --- | --- |
| Anonymous or signed-in customer | Customer product page (today's behaviour) |
| Signed-in staff member of the tag's store | Staff training view, with a toggle to preview the customer page |
| Signed-in staff member of a different store | Customer product page |

## Current state of the codebase

- The tap page (`apps/tap-page/app/p/[tag_uuid]/page.tsx`) shows every visitor the
  same page. It knows two cookies: the anonymous `nfc_session` and the signed
  `nfc_customer` (customer magic-link sign-in, `apps/tap-page/src/lib/auth.ts`).
- The admin (`apps/admin`) has its own `nfc_admin` cookie with roles `super` and
  `store` (`apps/admin/src/admin-auth.ts`). Store admins sign in with email and password
  against the `store_admins` table (migration `1700000000014`). There is no staff
  role.
- The `internal_staff_notes` column on `enrichments` is edited in the admin under
  "Internal Notes", but nothing displays it.

## 1. Staff role and approved emails

The store admin owns the store account. Staff are a subordinate role: they can't
sign up on their own. The store admin approves specific email addresses in the admin.

**Data model**, a new migration:

```sql
CREATE TABLE store_staff (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id       uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email          text NOT NULL,            -- stored lower-cased
  name           text,
  added_by       uuid REFERENCES store_admins(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,              -- soft-remove; revoked staff can't sign in
  last_login_at  timestamptz,
  UNIQUE (store_id, email)
);
CREATE INDEX store_staff_email_idx ON store_staff(email);
```

**Admin UI**: a new **Staff** page, shown to `store` and `super` roles:
- Add a staff email (and optional name)
- List staff with last sign-in and training progress (see §6)
- Remove staff (sets `revoked_at`, which also blocks their existing sessions on the
  next check)

Staff don't get access to the admin dashboard. The `nfc_admin` roles stay
`super` and `store`.

## 2. Staff sign-in (tap page)

Staff sign in **on the tap page app**, not the admin. The cookie has to exist on the
domain the NFC tags open, and the admin's cookie is on a separate app.

Reuse the existing customer magic-link setup (`auth_tokens`, `/auth/verify`):

1. Staff go to `/staff/login` once, bookmarked or linked from an invite email.
2. They enter their email. If it matches a `store_staff` row that hasn't been
   revoked, a magic link is emailed. If not, show the same neutral "check your
   email" message so the page doesn't reveal which emails are approved.
3. The link sets a signed `nfc_staff` cookie holding the `store_staff.id`, built like
   `nfc_customer` (`httpOnly`, `sameSite=lax`). Use a shorter lifetime than the
   customer cookie, for example 30 days.
4. `getCurrentStaff()`, the staff counterpart of `getCurrentCustomer()`, verifies the
   cookie and re-checks that the row exists and hasn't been revoked on each
   request.

When the store admin approves an email, send an invite email linking to
`/staff/login`, so staff never have to type the URL.

## 3. Staff view on tap

In `page.tsx`, resolve `getCurrentStaff()` alongside `getCurrentCustomer()`. If a
staff member is signed in **and** `staff.store_id === tag.store_id`, render
`<StaffShell>` in place of `<ProductShell>`, with a "View as customer" toggle.
Otherwise, show today's customer page unchanged.

**Content**: the main case is someone learning with time to spare, so short
paragraphs and a brand video are fine. The top section still has to be readable in
about 10 seconds. Sections follow a learning order: **what it is → how to sell it →
with a customer**.

**At a glance** (top)
- Fit and sizing, stated honestly ("Runs small — size up; wide feet go half up")
- The owner's one-line pitch

**Product knowledge**
- Materials in plain language ("warm, not bulky, machine washable, won't pill")
- 2–3 reasons it's worth the price
- How it compares with the closest alternative in the store
- Common customer questions with honest answers (reuses the existing `faq`)
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

**Owner's private notes**
- `internal_staff_notes`
- Supplier or brand rep contact
- Handling instructions for fragile or unusual items

Leave out the customer-facing story copy. Staff can see it through the toggle.

## 4. Admin authoring

Add a **Staff Training** section to the enrichment form
(`apps/admin/app/enrichment/[product_id]/EnrichmentForm.tsx`), written like
instructions left for the team rather than formal documentation. It replaces the
current "Internal Notes" block. New fields on `enrichments`:

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
| `staff_supplier_contact` | text |
| `internal_staff_notes` | text (existing) |

The existing "Generate with AI" enrichment action could draft these fields too,
with the owner reviewing and editing the draft.

## 5. Keep staff out of customer analytics

Staff taps shouldn't count toward what customers see or what owners measure. When
a staff view is shown, skip:

- `insertTapEvent`, so tap counts, "X people tapped this" and the analytics
  dashboard don't include staff
- `upsertCustomerTap`, offer delivery (`getApplicableOffer` /
  `recordOfferDelivery`), reactions, and the personalisation shown to customers

Also skip these when staff use "View as customer".

## 6. Training progress

Record staff taps in their own table:

```sql
CREATE TABLE staff_product_views (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id    uuid NOT NULL REFERENCES store_staff(id) ON DELETE CASCADE,
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX staff_product_views_staff_idx ON staff_product_views(staff_id, product_id);
```

On the admin Staff page, show:
- For each associate: "31 of 40 products reviewed", plus the last time they reviewed
  a product
- For the store: products that no one on the team has reviewed yet

## Suggested build order

1. Migration: `store_staff`, `staff_product_views`, and the new staff columns on
   `enrichments`
2. Admin Staff page (add, list, remove) plus the invite email
3. Tap-page staff magic-link sign-in and `getCurrentStaff()`
4. `StaffShell`, plus the branch in `page.tsx` that skips customer analytics
5. Staff Training section in the enrichment form
6. Training progress on the admin Staff page

## Open questions

- Should approved emails be unique across stores? The schema above allows the same
  email at two stores. Sign-in would then need a store picker, or the most recent
  store could be used.
- Should the store admin also be able to see the staff view by adding their own
  email as staff, or should `store_admins` be accepted automatically?
- Should staff get read-only access to anything in the admin (for example a list of
  all products to review), or stay tap-page-only?
