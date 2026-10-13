# Category labels (founder-approved 2026-10-07; built in `packages/db/src/category-copy.ts`)

The product editor, the customer page, Generate, the AI assistant and the staff view all describe a product with the same stored fields. Today their labels and examples are written for clothing ("Fit & Feel", "Machine wash cold", "As seen in Vogue"). This draft gives each spec category (PRD v4 §7 Step 15l: the category picker on the product editor) its own words.

**What changes:** labels, hints, placeholders (the grey example text), the customer-page headings, the instructions Generate gets for each field, the labels the AI assistant and the staff view read, and the fact-sheet topics.
**What doesn't:** the stored fields. A wine's "Tasting notes" is saved in the same column as a shirt's "Fit & feel", so nothing is migrated and switching category just relabels.

## 1. The four relabelled fields

The label is used in the product editor and as the customer-page heading.

| Stored field | Apparel (today) | Footwear | Eyewear | Cannabis | Wine | Beer | Spirits | Home | General |
|---|---|---|---|---|---|---|---|---|---|
| `materials` | Materials & construction | Materials & construction | Lenses & frame | Grow & cure | Winemaking | Brewing | Production | Materials | Materials & construction |
| `fit_notes` | Fit & feel | Fit & sizing | Fit & sizing | Aroma & flavour | Tasting notes | Tasting notes | Tasting notes | Size & feel | Size & fit |
| `care_instructions` | Care instructions | Care | Care | Storage | Serving & storage | Serving & storage | Serving | Care | Care |
| `sustainability_notes` | Sustainability | Sustainability | Sustainability | Packaging | Farming | Sustainability | Sustainability | Sustainability | Sustainability |

Backstory ("The Story" on the customer page), Great when…, Reasons to buy, Awards & press, Media, FAQ and Internal notes keep their labels everywhere; only their examples change (section 2).

## 2. Examples (placeholders) per category

| Field | Apparel (today) | Footwear | Eyewear |
|---|---|---|---|
| Product name | e.g. Merino Crewneck | e.g. Weekend Chukka | e.g. Erika Classic |
| Backstory | Brand origin or product design story… | The brand, the workshop, what makes this pair special… | The brand and the design story behind this frame… |
| `materials` | Key materials, fabric weight, construction details… | Full-grain suede upper, Goodyear-welted rubber sole… | Polarised glass lenses, hand-polished acetate frame… |
| `fit_notes` | Sizing, fit, or how to wear it… | Runs half a size large; wide sizes available… | Medium fit, 54 mm lenses, suits narrower faces… |
| `care_instructions` | Machine wash cold, lay flat to dry… | Brush suede dry; use a protector spray… | Clean with the microfibre cloth; store in the case… |
| `sustainability_notes` | Certified organic cotton, carbon-neutral shipping… | Leather from a Gold-rated LWG tannery… | Bio-acetate frame, recycled case… |
| Great when… | you want warmth without bulk / it's cold but not snowing / you layer under a coat | you need one boot from office to bar / it's wet but not snowing / you hate breaking shoes in | you drive a lot in bright sun / you're on the water / you want one pair for everything |
| Reasons to buy | Ethically sourced merino / Warm yet breathable / Lifetime repair guarantee | Resoleable / Broken in from day one / Made in Portugal | 100% UV protection / Polarised / Prescription-ready |
| Awards & press | B Corp Certified / As seen in Vogue, March 2024 | Esquire's best boots 2025 | Red Dot design award 2024 |
| FAQ | Is this suitable for cold weather? / Yes, merino stays warm even when damp. | Does it run true to size? / Half a size large; go down. | Can it take prescription lenses? / Yes, single-vision and progressive. |
| Staff name & role | Alex, Senior Stylist | Alex, Store manager | Alex, Optician |
| Staff quote | "My go-to piece every winter." | "The pair I'd buy if I could only own one." | "The one I reach for on the drive to the cottage." |
| Internal notes | Fragile clasp — handle with care when demonstrating… | Display pair is a 9; check stock before promising a size… | Demo pair has clear lenses; the polarised version is boxed… |

| Field | Cannabis | Wine | Beer |
|---|---|---|---|
| Product name | e.g. Animal Face 3.5 g | e.g. Campofiorin 2020 | e.g. Headstock IPA 4-pack |
| Backstory | Who grew it and what makes this cut special… | The estate, the family, how this wine came to be… | The brewery and the idea behind this beer… |
| `materials` | Hang-dried, hand-trimmed, cold-cured; small-batch greenhouse… | Ripasso method: refermented on Amarone skins, 18 months in oak… | Double dry-hopped with Citra and Mosaic, unfiltered… |
| `fit_notes` | Lemon and cake up front, with pepper and pine… | Cherry and plum, soft tannins, a long spiced finish… | Mango and pine, soft bitterness, hazy and juicy… |
| `care_instructions` | Keep sealed, cool and dark, out of reach of children… | Serve at 16–18 °C; decant 30 minutes; drink by 2030… | Keep cold; best within 3 months; serve at 6–8 °C… |
| `sustainability_notes` | Glass jar, recyclable lid, nitrogen-flushed… | Certified organic vineyards, hand-harvested… | Spent grain goes to local farms… |
| Great when… | you want a limonene-forward sativa-dominant hybrid / you prefer hand-trimmed, cold-cured flower / you're after Seed Junky genetics | you're cooking a slow braise / you want a red with depth under $30 / you're bringing a bottle to dinner | you want a hazy IPA that isn't too bitter / you're grilling / you like tropical hops |
| Reasons to buy | Hand-selected from 100 phenos / Cold-cured for terpene retention / Small-batch greenhouse | Ripasso method / Pairs with braised meats / Drinks above its price | Double dry-hopped / Brewed in Toronto / Fresh: canned weekly |
| Awards & press | KIND Awards 2021: Craft Brand of the Year | Gambero Rosso Tre Bicchieri 2022 / 92 pts, Wine Spectator | Canadian Brewing Awards 2025: gold |
| FAQ | What's the lineage? / Face Off OG × Animal Mints. | What does it pair with? / Braised beef, mushroom risotto, aged cheese. | How bitter is it? / Soft: 45 IBU. |
| Staff name & role | *(hidden for cannabis)* | Sam, Sommelier | Jo, Beer buyer |
| Staff quote | *(hidden for cannabis)* | "My pick for a Sunday roast." | "The IPA for people who say they don't like IPAs." |
| Internal notes | Check the packaged date; older lots go to the front… | Often confused with the Valpolicella Classico; show the label… | Keep the display can cold; warm cans foam… |

| Field | Spirits | Home | General |
|---|---|---|---|
| Product name | e.g. Glenfarclas 12 | e.g. Linen Duvet Cover, Queen | e.g. Product name |
| Backstory | The distillery and what sets this bottling apart… | The maker and the story behind this piece… | Brand origin or product story… |
| `materials` | Pot-distilled, aged 12 years in ex-sherry casks… | Stonewashed European linen, 170 gsm… | What it's made of and how… |
| `fit_notes` | Dried fruit, toffee and a hint of smoke… | Fits mattresses up to 40 cm deep; soft, relaxed drape… | Size, capacity, or how it's used… |
| `care_instructions` | Neat or with a drop of water; keep upright… | Machine wash warm, tumble dry low… | How to look after it… |
| `sustainability_notes` | Spent grain to local farms; recycled glass… | OEKO-TEX certified, plastic-free packaging… | Certifications, sourcing, packaging… |
| Great when… | you want a sherried Scotch under $90 / you're starting a whisky shelf / you like it neat | you sleep hot / you like a relaxed, lived-in look / you want bedding that softens with every wash | *(apparel examples, reworded generically)* |
| Reasons to buy | Sherry-cask aged / Family-owned since 1865 / Great value for 12 years | Gets softer with every wash / Breathable for warm sleepers / OEKO-TEX certified | Well made / Built to last / Great value |
| Awards & press | San Francisco World Spirits 2024: double gold | Featured in Dwell, 2025 | Award or press mention |
| FAQ | Is it peated? / Lightly: a hint of smoke. | Will it shrink? / It's pre-washed; very little. | A question customers ask / The answer |
| Staff name & role | Kim, Spirits specialist | Alex, Interior stylist | Alex, Store manager |
| Staff quote | "The dram I pour for whisky sceptics." | "I own it in three colours." | "The one I recommend most." |
| Internal notes | Locked cabinet: key at the till… | Display set is a queen; kings are boxed… | Notes for the team… |

## 3. Fact sheet

The topic list on the fact sheet (and what Generate tags each fact with), the topic the "Add fact" row starts on, its example text, and the example in the brand-website box. "other" stays in every topic list.

| Category | Topics | "Add fact" starts on | "Add fact" example | Brand website example |
|---|---|---|---|---|
| Apparel (today) | materials, construction, fit, sizing, care, origin, features | fit | Runs half a size large | northfield.com |
| Footwear | materials, construction, fit, sizing, care, origin, features | sizing | Runs half a size large | redwingshoes.com |
| General | materials, construction, fit, sizing, care, origin, features | features | Comes with a 2-year warranty | brandname.com |
| Eyewear | lenses, frame, fit, protection, care, origin | lenses | Lenses are polarised glass | rayban.com |
| Cannabis | strain, lineage, grow, aroma, terpenes, potency, format, producer | grow | Hang-dried for 10–14 days | carmelcannabis.ca |
| Wine | grapes, region, winemaking, tasting, pairing, serving | winemaking | Aged 18 months in Slavonian oak | masi.it |
| Beer | style, ingredients, brewing, tasting, pairing, serving | style | 6.5% hazy IPA | bellwoodsbrewery.com |
| Spirits | production, cask & age, tasting, serving, origin | cask & age | Finished in ex-sherry casks | glenfarclas.com |
| Home | materials, dimensions, care, origin, certifications | materials | Pre-washed for softness | parachutehome.com |

**Rule for the build:** every example (grey placeholder text) in the product editor comes from the category's set; none is hard-coded for clothing. Examples are never saved as content.

Facts already saved keep their topic. A topic that's not in the new list shows as is, and can be changed by editing the fact.

## 4. Cannabis extras (on top of the 2026-10-07 compliance rules)

- **Extra image URLs hint:** "Detail shots and packaging. No lifestyle images for cannabis" (the Cannabis Act bans lifestyle promotion). Other categories keep "detail shots, lifestyle images, packaging".
- **Customer reviews and Staff perspective:** already hidden for cannabis (PRD v4 §10).
- **Awards & press:** kept; whether awards count as endorsements is on the legal review list (`ACTION_ITEMS.md`).

## 5. Where each label shows

| Place | Uses |
|---|---|
| Product editor (admin) | labels, hints, placeholders, fact topics |
| Customer page | the four labels as headings |
| Generate | per-field instructions in the category's words (e.g. "Tasting notes: one sentence on aroma and palate") |
| AI assistant | the four labels in the product info it reads |
| Staff view on the tap page | the four labels in the product details |

## Decisions (founder, 2026-10-07)

1. **Every page that shows this information uses the category's words**, including the staff training tab, its AI draft, the staff view on the tap page and the note-consistency check. "We should never show footwear labels for a wine product." The training tab's "Fit and sizing truth" becomes, for example, "Style and serving truth" for wine and "Potency and freshness truth" for cannabis.
2. **Alcohol "Great when…" and copy** (pending legal review, `ACTION_ITEMS.md`): taste, food pairings, serving, gifting and cellaring are fine; never mood or effects ("after a long day"), social or personal success, drinking more, or activities that need care (driving, boating, sports). Generate gets these rules for wine, beer and spirits.
3. **All examples are category-specific**, including the internal-notes box, the add-fact row and the brand-website box.
