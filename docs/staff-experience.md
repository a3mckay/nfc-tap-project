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

**Sign-in (built in 13b)**
1. The admin login page links to `/login/staff`: email only, no password.
2. If the email is on one or more stores' staff lists, one email is sent with a
   single-use link per store (15 minutes; only a SHA-256 hash is stored in
   `staff_auth_tokens`). If not, the same "check your email" page shows, so it
   doesn't reveal who's on a team.
3. The link (`/login/staff/verify`) starts a 30-day `role: "staff"` admin session.
   Staff can only open `/training` (the staff home page); every other admin page
   redirects there, and staff sessions never resolve a store in server actions.
4. `/training` re-checks the staff row on every visit; removed staff are sent back
   to sign-in.

**Carrying the sign-in to the tap page (built in 13c)**
5. Right after a staff member opens their emailed link, or a store owner signs in
   with their password, the admin creates a single-use handoff token (60 seconds;
   only its hash is stored, in `tap_handoff_tokens`) and redirects the browser to
   `tapshelf.store/staff/handoff?token=…`.
6. The tap page uses up the token, sets a signed, 30-day `nfc_staff` cookie
   (staff member or owner, plus their store), and sends the browser straight back
   to where it was going in the admin (`/training`, or the owner's Tags page). The
   return path is checked so it can only point at the admin.
7. `getCurrentStaff()` on the tap page verifies `nfc_staff` and re-checks the
   database on every request: the staff member must not be removed, and the
   owner's login must still exist for that store.
8. Admin sign-out goes through `tapshelf.store/staff/signout`, which clears the tap
   page's cookie, then back to the admin login page.

The handoff is required because the admin (`admin.tapshelf.co`) and the tap pages
(`tapshelf.store`) are on different domains, so they can't share a cookie. Owners
who were already signed in before this shipped get the tap-page cookie the next
time they sign in.

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

## 3. Staff view on tap (built in 13d)

In `page.tsx`, resolve `getCurrentStaff()` alongside `getCurrentCustomer()`. If a
staff member is signed in **and** `staff.store_id === tag.store_id`, render
`<StaffShell>` **by default** in place of `<ProductShell>`, with a "View as
customer" toggle at the top. The toggle switches to the normal customer page, with
a matching "Back to training view" toggle. The choice lasts for the current visit
only (`?view=customer`), so every new tap opens in the training view. Otherwise,
show today's customer page unchanged. Store owners signed in through the handoff
see it too. The customer preview hides reactions, "Notify me", the picks bar,
offers and personalisation, so staff don't add to customer data.

**Content**: the main case is someone learning with time to spare, so short
paragraphs are fine. The top section still has to be readable in about 10 seconds.
The view shows the owner's training notes (§4), in the order they're written:

1. **The one-line sell:** the sentence an associate says when a customer picks it up
2. **Who it's for:** 2–3 customer profiles it genuinely suits
3. **Who it's not for:** honest limitations
4. **Fit and sizing truth:** the honest version, not the tag version
5. **Why it's worth the price:** 2–3 specific reasons
6. **Closest alternative in the store:** the in-store comparison
7. **Common questions and answers:** 3–5 questions with the owner's answers
8. **Upsell and companion products:** what pairs naturally with it
9. **Brand context:** why the store carries the brand and what sets it apart
10. **Current stock note:** sizes running low, what's coming in, what's display-only
    (shows the date it was last changed)

The existing `internal_staff_notes` ("Internal Notes" on the customer form) is
shown too. Leave out the customer-facing story copy; staff can see it through the
toggle.

## 4. Admin authoring (built in 13e)

Each product's edit page (`/enrichment/[product_id]`) has a **Staff training**
section below the customer content, with its own Save button and a "Staff training ↓"
link at the top of the page. Every field is optional. Fields, as chosen by the
founder on 2026-09-29:

1. **The one-line sell:** the sentence an associate says when a customer picks it up
2. **Who it's for:** 2–3 customer profiles it genuinely suits
3. **Who it's not for:** honest limitations
4. **Fit and sizing truth:** the honest version, not the tag version
5. **Why it's worth the price:** 2–3 specific reasons
6. **Closest alternative in the store:** the in-store comparison
7. **Common questions and answers:** 3–5 questions with the owner's answers
8. **Upsell and companion products:** what pairs naturally with it
9. **Brand context:** why the store carries the brand and what sets it apart
10. **Current stock note:** sizes running low, what's coming in, what's display-only
    (shows the date it was last changed)

Stored in their own table, `product_training` (migration 0019), one row per product,
separate from the customer-facing `enrichments`. Writes are store-scoped.

**Draft with AI (optional):** fills only the fields the owner left empty, from the
product data, its customer copy and the store's other product titles (for the
comparison and companions). Nothing is saved until the owner clicks Save. It never
drafts the stock note. Uses `claude-opus-5-5` with structured output
(`apps/admin/src/lib/training-draft.ts`); the button only appears when
`ANTHROPIC_API_KEY` is set.

**Who can edit:** store owners (and super admins). The founder asked for owners *or
managers*; there's no manager role yet (see Decisions needed, question 8).

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
5. **13e (built before 13c/13d):** Staff training section on the product edit page
   (`product_training` table), with an optional AI draft
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
1. **Can one email be staff at more than one store?** ✅ Yes (built in 13b): the
   sign-in email has one link per store.
2. **Do store admins see the training view when they tap?** ✅ Yes, decided
   2026-09-28. Owners get the tap-page sign-in through the same handoff after their
   admin login (13c).
3. **How long does a staff sign-in last?** ✅ 30 days, decided 2026-09-28 (built
   in 13b).
4. **What does the invite email say?** ✅ Store name, one "Sign in" button, and a
   line saying to open it in Safari on iPhone (built in 13b).

### Owner (admin) usability
5. **Where does the Staff page live?** Recommended: a top-level "Staff" item in the
   admin nav, next to Tags and Analytics.
6. **How do owners write training content for 40+ products without it becoming a
   chore?** ✅ An optional "Draft with AI" button fills empty fields for the owner
   to edit (built in 13e). Still open: a "Staff content: 12 of 40 done" count on
   the Staff page.
7. **Which staff fields are in the first release?** ✅ The ten fields in §4,
   decided 2026-09-29.
8. **Should managers be able to edit training notes?** The founder wants owners
   *or managers* to write them. There's no manager role yet: owners (store admins)
   can edit today. Open: add a manager role (edit training notes and staff, but not
   billing or settings), or let the owner mark a staff member as able to edit.

### Staff usability
9. **What does a staff member see for a product with no staff content yet?**
   ✅ The customer page's fit notes, materials and FAQ (and internal notes), under
   a note that the owner hasn't added training notes yet (built in 13d).
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
