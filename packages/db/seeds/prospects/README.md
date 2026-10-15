# Prospect demo stores (PRD v4 §7 Step 12)

One JSON file per sales prospect creates their demo store: name, category, theme, products, one tag per product, and an optional dashboard login. Copy `example.json` to `<slug>.json` (these files stay out of git) and fill it in.

- `industry`: one of the spec categories (apparel, footwear, eyewear, beauty, cannabis, wine, beer, spirits, toys, vintage, home, plants, garden_care, general). A garden centre is `plants`.
- `owner.email` (optional): the prospect's admin login, if you know their email. The password is printed once, the first time.
- **No email?** Leave `owner` out. The command prints a **claim link** instead (once): print it as a QR code in the kit. Whoever opens it sets the owner's email and password, and is signed in. It works once, for 90 days. Lost the card? Re-run with `--new-claim`; the old link stops working.
- `products`: the products you chose. Only `title` is required.

Run against production (copy `DATABASE_PUBLIC_URL` from Railway's Postgres service):

```
DATABASE_URL="…" corepack pnpm --filter @nfc/db seed:prospect seeds/prospects/<slug>.json
```

It prints the tag links to write to your cards (and the claim link, if any) and saves them to `<slug>.tags.csv`. Re-running is safe: products update, tags and the password stay the same. Then open each product in the admin, click Generate, and review the copy before the visit.

Owner demos only: it adds no made-up taps, and the store doesn't share data.
