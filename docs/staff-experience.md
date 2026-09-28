# Staff Experience (Associate Training View)

**Status:** Next priority: PRD v4 §7 Phase 5, Step 13. Design in progress; nothing is built yet.
Decisions still needed are listed at the end, under "Decisions needed".

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
2. Staff sign in through the admin, and the sign-in carries over to the tap page
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
| Signed-in staff member of the tag's store | **Staff training view by default**, with a toggle to switch to the customer page |
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
- The admin runs on `admin.tapshelf.co` and the tap pages on `tapshelf.store`. These are
  different domains, so the two apps can never share a cookie.
- Admin server actions resolve their store from the signed session
  (`getActionStore`), and ID-keyed writes are scoped to that store (see
  [PR #2](https://github.com/a3mckay/nfc-tap-project/pull/2)). Staff features must
  follow the same pattern.

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

Add a third admin role, `staff`, next to `super` and `store`:
`{ role: "staff"; staffId; storeId }` in `apps/admin/src/admin-auth.ts`. Staff can't
reach the store's settings, products, tags or analytics. The middleware only lets
them into a small staff home page (see §2).

## 2. Staff sign-in (through the admin, carried over to the tap page)

Staff sign in on the **admin login page**, so there's one obvious place to sign in.
The sign-in then has to carry over to the tap page. The admin and tap page are
separate apps, and the NFC tags open the tap page, which can't read the admin's
`nfc_admin` cookie.

**Sign-in**
1. The admin login page (`apps/admin/app/login`) gets a "Staff sign-in" option:
   email only, no password.
2. If the email matches a `store_staff` row that hasn't been revoked, email a
   one-time sign-in link (valid for 15 minutes). If not, show the same neutral
   "check your email" message so the page doesn't reveal which emails are
   approved. Staff never have to create or remember a password.
3. The link signs them in to the admin as `role: "staff"`.

**Carrying the sign-in to the tap page**
4. Right after sign-in, the admin creates a single-use handoff token (valid for 60
   seconds, stored in the database) and redirects the browser to the tap page at
   `/staff/handoff?token=…`.
5. The tap page checks and uses up the token, sets a signed `nfc_staff` cookie on
   the tap page's domain, and redirects back to the admin's staff home page. To
   the associate, this is one quick redirect.
6. `getCurrentStaff()`, the staff counterpart of `getCurrentCustomer()`, verifies
   `nfc_staff` and re-checks that the staff row exists and hasn't been revoked on
   each request. Removing someone in the admin takes effect on their next tap.

The handoff is required because the admin (`admin.tapshelf.co`) and the tap pages
(`tapshelf.store`) are on different domains, so they can't share a cookie.

**Staff home page** (the admin's landing page for `role: "staff"`)
- "You're signed in as a staff member of <Store>. Tap any product to see its
  training view."
- The store's products, each marked reviewed or not yet reviewed (from §6), so
  associates can see what's left to learn
- Sign out, which clears both the admin and tap-page staff cookies

**Must be done in Safari (or the phone's default browser).** On iOS, tapping a tag
opens the phone's default browser. If staff sign in through the admin saved to the
home screen as an app, iOS keeps that login in a separate cookie store, so taps
won't see it. The invite email and the staff home page should say "open this in
Safari". Android Chrome shares cookies between its home-screen apps and the
browser, so this isn't an issue there.

When the store admin approves an email, send an invite email with a sign-in link.
The emailing code in `apps/tap-page/src/lib/email.ts` can move to a shared package
so the admin can send it.

## 3. Staff view on tap

In `page.tsx`, resolve `getCurrentStaff()` alongside `getCurrentCustomer()`. If a
staff member is signed in **and** `staff.store_id === tag.store_id`, render
`<StaffShell>` **by default** in place of `<ProductShell>`, with a "View as
customer" toggle at the top. The toggle switches to the normal customer page, with
a matching "Back to training view" toggle. Keep the toggle choice for the current
visit only (for example `?view=customer`), so every new tap opens in the training
view. Otherwise, show today's customer page unchanged.

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

## Build order

Matches PRD v4 §7, Step 13. Each slice adds only the tables it needs.

1. **13a:** `store_staff` table and the admin Staff page (add, list, remove approved
   emails)
2. **13b:** `staff` admin role, staff sign-in by emailed link, staff home page, invite
   email
3. **13c:** handoff to the tap page (`/staff/handoff`, `nfc_staff` cookie,
   `getCurrentStaff()`)
4. **13d:** `StaffShell` as the default view for staff, the customer toggle, and the
   branch in `page.tsx` that skips customer analytics
5. **13e:** Staff Training section in the enrichment form (new staff columns on
   `enrichments`)
6. **13f:** `staff_product_views` and training progress on the admin Staff page and
   the staff home page

## Later: native iOS/Android staff app

Not needed for this feature. The web approach works on both platforms as long as
staff sign in through the phone's default browser (see §2). A native app becomes
worth it if we want:

- **Taps that open straight in the app.** With iOS Universal Links and Android App
  Links, taps on `/p/...` open the staff app when it's installed. Customers, who
  won't have it, still get the web page. This also removes the Safari sign-in
  caveat.
- **Push notifications for training**, like "3 new products arrived — review them
  before your shift".
- **Offline reading and a proper app-store listing**, which some stores' IT
  policies prefer.

Cost: app-store review, a second codebase to maintain (or a wrapper around the
existing web view), and a domain association file. The tap page and database
would stay the same, since a native app would call the same staff-session
endpoints. Revisit after staff are using the web version.

## Decisions needed

Each question has a recommendation. Answers get folded into the sections above.

### Access and sign-in
1. **Can one email be staff at more than one store?** Recommended: yes. The schema
   already allows it. If an email belongs to several stores, the sign-in email asks
   which store to sign in to.
2. **Do store admins see the training view when they tap?** Recommended: yes,
   automatically, so owners can check what their team sees without adding
   themselves as staff. This needs the owner signed in on the tap page too, through
   the same handoff after their admin login.
3. **How long does a staff sign-in last?** Recommended: 30 days, then sign in again.
   Removing a staff member takes effect on their next tap either way.
4. **What does the invite email say?** Recommended: store name, one "Sign in" button,
   and a line saying to open it in Safari on iPhone.

### Owner (admin) usability
5. **Where does the Staff page live?** Recommended: a top-level "Staff" item in the
   admin nav, next to Tags and Analytics.
6. **How do owners write training content for 40+ products without it becoming a
   chore?** Recommended: AI drafts every staff field from the product data and
   existing enrichment; the owner edits. A "Staff content: 12 of 40 done" count on
   the Staff page shows the gaps.
7. **Which staff fields are in the first release?** Recommended: start with five —
   fit notes, pitch, who it's for / not for, objections and answers, internal
   notes. Add the rest (comparison, pairs-with, demo and display notes, supplier
   contact) once owners are using it. Fewer fields means more of them get filled
   in.
8. **Should some fields be manager-only** (supplier contact, margin or priority
   flags)? Recommended: leave priority/margin flags out of the first release, which
   removes the need for a manager role.

### Staff usability
9. **What does a staff member see for a product with no staff content yet?**
   Recommended: the customer page's fit notes, materials and FAQ, reframed for
   staff, plus a note that the owner hasn't added training notes yet.
10. **Should there be a "mark as reviewed" button, or does a tap count?**
    Recommended: a tap counts. It's zero effort, and the goal is exposure, not a
    test.
11. **Does the staff home page need a product list?** Recommended: yes, grouped by
    "Not reviewed yet" and "Reviewed", so associates know what to go tap next.
12. **Quizzes or certifications?** Recommended: not in the first release.

### Business
13. **Which plan includes the staff view?** PRD §5.6 lists it under Pro ($199/mo),
    but the tiers in the code differ (§11). Recommended: available on every plan
    during early launch, and decide the tier gating when §11 is settled.
14. **Is there a limit on staff per store?** Recommended: no limit for now.
