# Action Items — Things You Need to Do

This doc tracks tasks that require a human decision or external account. Updated as we progress through the build.

---

## Blocking for Step 5 AI copy generation

### Anthropic API key
Go to https://console.anthropic.com → API Keys → Create key.
Add to your `.env`:
```
ANTHROPIC_API_KEY=<your key>
STORE_IDS=<comma-separated store UUIDs from your DB — added automatically after Shopify OAuth>
```
The worker reads `STORE_IDS` to know which stores to generate copy for. Once you have a store connected via Shopify OAuth, copy its `id` from the `stores` table.

---

## Blocking for live testing (not blocking for code)

### Shopify Partner account
Register at https://partners.shopify.com. You'll be asked for a company name — it can be changed later, so don't let it block you.
Once registered:
- Create a **Development Store** (free, for testing)
- Create a **Custom App** in the Partner Dashboard
- Copy the API Key and API Secret into your `.env` file

Then fill in `.env`:
```
SHOPIFY_API_KEY=<from Partner Dashboard>
SHOPIFY_API_SECRET=<from Partner Dashboard>
SHOPIFY_APP_URL=<your ngrok/cloudflare tunnel URL or production URL>
```

### Cloudflare tunnel (for local Shopify OAuth testing)
Shopify needs to reach your local machine for OAuth callbacks and webhooks.
Install once: `npm install -g cloudflared`
Run when testing: `cloudflared tunnel --url http://localhost:3002`
Set `SHOPIFY_APP_URL` to the tunnel URL it prints.

---

## Needed before real NFC tags go live

### Domain name
The URL encoded into each NFC tag is permanent once the tag is deployed in a store. Choose a short, brandable domain before ordering production tags.
The tap page URL format will be: `https://<your-domain>/p/<tag-uuid>`

### Production hosting — done
Everything runs on **Railway**, deployed from `main`: the admin (`admin.tapshelf.co`), the tap page (`tapshelf.store`) and Postgres.

### Run migrations automatically on deploy — done
The admin service's Railway **Pre-deploy Command** is `pnpm --filter @nfc/db migrate:up`, so new migrations run before each deploy. If one fails, the deploy stops and the old version keeps running. Only the admin service has it, so migrations run once per deploy.

To run migrations by hand instead: copy `DATABASE_PUBLIC_URL` from the Railway Postgres service (the plain `DATABASE_URL` only works inside Railway), then from the repo run `DATABASE_URL="…" corepack pnpm db:migrate`.

### Email settings on the admin service
Staff invite and sign-in emails are sent by the admin. In Railway, check the **admin** service's **Variables** include `RESEND_API_KEY` (the same key the tap page uses). Without it, the emails are only written to the logs and never sent. They're sent from `TapShelf <hello@tapshelf.co>` unless `RESEND_FROM` says otherwise.

### Decide whether to schedule the review and brand refreshes
The admin has two more cron routes, `api/cron/brand-refresh` (every 2 weeks) and `api/cron/reviews-refresh` (daily). Nothing calls them: `CRON_SECRET` wasn't set in Railway, and until 2026-10-05 the admin's login check redirected them to the login page anyway (fixed). To turn them on, add a job for each to `.github/workflows/scheduled-jobs.yml`, the same way as `retention`. Public web reviews use Brave Search, so watch the free tier's 2,000 searches a month.

---

## Needed before taking payments (Step 9)

### Stripe account
Register at https://stripe.com. Required for subscription billing and the customer portal.
Once registered:
1. Create three Products in Stripe Dashboard: Starter, Pro, Enterprise (recurring monthly)
2. Copy each product's Price ID and add to your `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_ENTERPRISE=price_...
   ```
3. When creating a Stripe subscription for a store, set `metadata.shop_domain` to the store's Shopify domain — the webhook handler uses this to find the store.

---

## Product decisions: Shelf-Side AI Assistant (discovery)

### Answer the open questions in `docs/PRD-ai-assistant.md` §9
Start with the ★ items: which surface ships first, V1 vs. post-launch, tap-page length, human handoff, staff identity, Ask placement, Questions nav, grouping, regulated categories, PII redaction. Nothing gets built until the spec status says *Approved*.

### Add free-text questions to the legal review
The Privacy Policy / PIPEDA review (below) must also cover storing customers' typed questions (redacted, keyed to an anonymous session).

---

## AI assistant go-live (PRD v4 §7 Step 15)

- **Railway tap-page service:** add `ANTHROPIC_API_KEY` (the chat returns "Questions aren't available right now" without it). The admin service needs `BRAVE_SEARCH_API_KEY` for Generate's brand-first research.
- **Railway tap-page service** is the one named `romantic-kindness` (serves tapshelf.store); the admin service is `nfc-tap-project`. Renaming them to `tap-page` / `admin` in each service's Settings is optional.
- **Privacy page:** a plain-language draft is live at `tapshelf.store/privacy`, linked from the chat's disclosure line and the sign-in form. It names "TapShelf" (no legal name yet) and `hello@tapshelf.co` for requests. To do:
  - set up `hello@tapshelf.co` forwarding at Namecheap so privacy requests reach you;
  - have the legal review revise it (add the legal name once there is one);
  - turn on the 24-month deletion job (built; it needs `CRON_SECRET`, below).
- **`CRON_SECRET`** (turns on the daily deletion of data older than 24 months that the privacy page promises):
  1. Make a random secret: run `openssl rand -hex 32` in Terminal.
  2. Railway → admin service (`nfc-tap-project`) → Variables → add `CRON_SECRET` with that value.
  3. GitHub → the repo → Settings → Secrets and variables → Actions → New repository secret → `CRON_SECRET`, same value.
  4. GitHub → Actions → "Scheduled jobs" → Run workflow. A green run whose log ends in `{"deleted":…}` means it works. It then runs daily by itself.
- **Check on a phone:** the floating "Your picks" pill only shows after two products have been tapped in a visit; it hasn't been checked on a real device yet.

## Needed before public launch

### Legal review
The PRD flags two documents that need external legal review before launch:
- **Privacy Policy** — covering tap event data collection, retention (24-month), and store owner obligations. A draft to start from is at `apps/tap-page/app/privacy/page.tsx` (live at `tapshelf.store/privacy`). Also ask about: the alert emails and texts have no one-click unsubscribe link (customers change alerts on their profile page), which may matter under CASL.
- **Terms of Service** — disclosing the aggregated data use (the data intelligence layer)
PIPEDA compliance (Canada) is a hard requirement per the PRD. Do not launch without legal sign-off.

### Cannabis marketing review (before selling to cannabis stores)
Licensed stores are covered by the Cannabis Act's promotion rules (s.17): no testimonials or endorsements, no lifestyle associations, and online promotion only where minors are reasonably kept out. Provinces add their own rules (AGCO in Ontario, AGLC in Alberta). Founder decisions, 2026-10-07, for the lawyer to confirm:
- **No customer reviews or staff quotes** on cannabis products (testimonials).
- **"Great when…" is factual only** for cannabis (e.g. "you want lemon-and-cake terps"), no occasions or lifestyle.
- **Effects tags (e.g. Calm, Energetic) are allowed until banned outright.** Note: Alberta's AGLC already bans claims of positive or negative effects, and Health Canada found Cannabis NB non-compliant for "Discover / Connect / Refresh" groupings.
- **Age gate:** is an in-store tap enough (the store checks ID at the door)? Our tap page is a public link that can be revisited or shared later. Options: a one-tap "I'm 19 or older" gate on cannabis pages; or secure NFC tags (e.g. NTAG 424 DNA) that prove a physical tap, so only in-store taps skip the gate.
- Also ask: awards (e.g. "KIND Awards Brand of the Year") — endorsement or fact? And whether showing prices on the tap page is fine.

---

## Done
- _(items will move here as completed)_
