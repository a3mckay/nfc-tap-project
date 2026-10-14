# Beauty category (founder-approved and built 2026-10-13)

A new spec category for makeup, skincare, fragrance, hair and body care. It plugs into the approved category system (`docs/category-labels.md`): same stored fields, its own words everywhere (product editor, customer page, Generate, AI assistant, staff training, staff view).

## 1. Automatic detection

Picked from the product's type or title: makeup, lipstick, lip gloss/liner/tint/balm/oil, mascara, foundation, concealer, blush, bronzer, highlighter, eyeshadow, eyeliner, brow, nail polish, serum, moisturiser, cleanser, toner, sunscreen, SPF, skincare, face mask/oil/wash/cream, perfume, eau de parfum/toilette, cologne, fragrance, shampoo, conditioner, hair oil/mask, body lotion/wash/butter, cosmetics, beauty. A store can also set Beauty as its main industry, and an owner can pick it per product.

**Fixes to existing detection,** found while drafting:
- "Rose Gold Highlighter" is filed as **wine** today (the wine rule matches "rose"). Wine will match only "rosé" and "rose wine".
- "Top Coat" nail polish is filed as **clothing** ("top"). Beauty is checked before clothing.
- Cannabis is still checked first: in Canada a CBD face oil is a cannabis product, not a cosmetic.

## 2. Product specs

| Field | Hint |
|---|---|
| Shade | e.g. 03 Warm Beige; or the shade range |
| Finish | e.g. matte, satin, dewy |
| Skin type | e.g. all, oily, dry, sensitive (as the brand states it) |
| Key ingredients | e.g. hyaluronic acid, niacinamide |
| Free from | e.g. fragrance-free, vegan (as the brand states it) |
| Size | e.g. 30 ml |

## 3. The four relabelled fields

| Stored field | Beauty label | Example |
|---|---|---|
| `materials` | **Key ingredients** | Hyaluronic acid and squalane; fragrance-free… |
| `fit_notes` | **Shade & finish** | Buildable sheer-to-medium coverage, satin finish; 24 shades… |
| `care_instructions` | **How to use** | Apply with fingertips or a damp sponge; layer under SPF… |
| `sustainability_notes` | **Sustainability & ethics** | Leaping Bunny certified; refillable compact… |

## 4. Examples

| | Beauty |
|---|---|
| Product name | e.g. Soft Matte Lip Cream, 03 |
| Backstory | The brand and what makes this formula different… |
| Great when… | you want a matte lip that doesn't dry out / you have oily skin and want it to last / you want one shade from day to night |
| Reasons to buy | 24 shades / Fragrance-free / Vegan and cruelty-free |
| Awards & press | Allure Best of Beauty 2025 |
| FAQ | Is it fragrance-free? / Yes, no added fragrance. |
| Staff name & role | Jess, Makeup artist |
| Staff quote | "The only matte lip I re-apply once a day." |
| Internal notes | Testers are in the drawer; swap them every month… |
| Extra image hint | Swatches, texture shots, packaging |
| Fact topics (starts on) | **ingredients**, shade, finish, skin type, how to use, free-from, certifications, size, other |
| Add-fact example | Fragrance-free and vegan |
| Brand website example | glossier.com |
| Training "truth" field | **Shade and longevity truth**: "Runs warm: most customers go one shade lighter. Lasts about 4 hours, not 8." |

## 5. AI rules (Canadian cosmetic rules)

In Canada a product that claims to treat or change the body is a drug (it needs a DIN or NPN), not a cosmetic. Cosmetic claims describe **appearance or feel**; therapeutic claims don't belong in cosmetic copy.

**Generate:**
- Appearance and feel only: "skin looks smoother", "reduces the look of fine lines", "feels hydrated". Never "heals", "treats acne", "repairs the skin barrier", "boosts collagen", "anti-inflammatory", "reverses ageing".
- "Hypoallergenic", "non-comedogenic", "dermatologist tested", "clinically proven", "safe for sensitive skin", vegan and cruelty-free only when a source states them.
- SPF only as stated on the product (sunscreens are drugs in Canada); never a stronger protection claim.
- Ingredients and allergens only from the brand's list; never invented. (Since April 2026, Canadian labels must list fragrance allergens.)

**AI assistant:** questions about allergies, sensitive skin, pregnancy, acne, conditions or medications, and sun protection are regulated: only what the store's data says, plus "Check the label to be sure." No medical or skin-care advice. Shade questions ("will this suit me?") get the shade information on file, never a guess about the customer's skin.

## Decisions (founder, 2026-10-13)

1. Fourth field: **"Sustainability & ethics"** (not "Clean & ethical": "clean beauty" is loosely defined).
2. Built together with toys and vintage.
3. The training "truth" field is "Shade and longevity truth" (the draft's "wear" is a clothing word the category rules don't allow).

Sources: Health Canada, [Classification of products at the cosmetic-drug interface](https://www.canada.ca/en/health-canada/services/consumer-product-safety/reports-publications/industry-professionals/guidance-document-classification-products-cosmetic-drug-interface.html); Ad Standards, [Guidelines for nonprescription and cosmetic industry](https://adstandards.ca/wp-content/uploads/2020/02/Guidelines-for-Nonprescription-and-Cosmetic-Industry-EN.pdf); CIRS, [Fragrance allergen disclosure from April 12, 2026](https://www.cirs-group.com/en/cosmetics/starting-april-12-2026-health-canada-mandates-fragrance-allergen-disclosure-on-cosmetic-labels).
