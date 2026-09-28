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

### Run migrations automatically on deploy
One-time setting so database changes apply themselves on every deploy:
1. In Railway, open the **admin** service (`admin.tapshelf.co`), then **Settings**.
2. Under **Deploy**, set **Pre-deploy Command** to `pnpm db:migrate`.
3. Save. The next deploy runs any new migrations first; if one fails, the deploy stops and the old version keeps running.
4. If that deploy's logs show `pnpm: not found`, change the command to `corepack pnpm db:migrate`.

Only set it on the admin service, not the tap page, so migrations run once per deploy.

To run migrations by hand instead: copy `DATABASE_PUBLIC_URL` from the Railway Postgres service (the plain `DATABASE_URL` only works inside Railway), then from the repo run `DATABASE_URL="…" corepack pnpm db:migrate`.

### Confirm what triggers the scheduled jobs
The admin has two cron routes, `api/cron/brand-refresh` (every 2 weeks) and `api/cron/reviews-refresh` (daily). Something external has to call them, and the repo doesn't record what. Check for a Railway cron service or a cron-job.org account; if neither exists, these jobs aren't running.

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

## Needed before public launch

### Legal review
The PRD flags two documents that need external legal review before launch:
- **Privacy Policy** — covering tap event data collection, retention (24-month), and store owner obligations
- **Terms of Service** — disclosing the aggregated data use (the data intelligence layer)
PIPEDA compliance (Canada) is a hard requirement per the PRD. Do not launch without legal sign-off.

---

## Done
- _(items will move here as completed)_
