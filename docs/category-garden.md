# Garden centre categories (founder-approved and built 2026-10-15)

Two new spec categories for garden centres: **Plants** (anything living: perennials, annuals, shrubs, trees, houseplants, bulbs, seeds) and **Garden care** (soil, compost, mulch, fertilizer, pest and weed control). They plug into the approved category system (`docs/category-labels.md`): same stored fields, their own words everywhere (product editor, customer page, Generate, AI assistant, staff training, staff view).

Garden centres also sell tools, pots, planters and décor. These fit the existing categories: pots and planters go to **home**, and tools go to **general**. Garden boots stay **footwear**.

## 1. Automatic detection

**Detection before this build misfiled garden stock** (checked against `specCategoryFor` on 2026-10-15):

| Title | Before | Now |
|---|---|---|
| Flower Pot, 10 in | **cannabis** ("flower": age gate, no reviews, no staff quote) | home |
| Hydrangea 'Bloomstruck' Blush | beauty ("blush") | plants, in a garden store |
| Soil Conditioner | beauty ("conditioner") | garden care |
| Top Dressing Compost | apparel ("top") | garden care |
| Seed Starting Blocks | toys ("blocks") | garden care |
| Cold Frame | eyewear ("frame") | still eyewear (`DEFERRED.md`); owners can pick a category |
| Hosta, Japanese Maple… | general | plants, in a garden store (main industry) |

**Rules:**
- **Plants words** (checked last, after apparel, since "tree" and "vine" are broad: "Tea Tree Shampoo" stays beauty; "plant-based" doesn't count): plant(s), perennial, annual, shrub, tree, hedge, groundcover, vine, succulent, cactus, houseplant, hanging basket, bulbs, seedlings, seeds / seed mix / grass seed. A **quoted cultivar name** also counts in a garden store ("Hosta 'Sum and Substance'"), and only there, because sneaker names are quoted too ("Air Jordan 1 'Chicago'").
- **Garden care words** (checked right after cannabis): soil, potting mix, compost, mulch, manure, peat, perlite, fertilizer, plant food, lawn food, insecticide, herbicide, fungicide, weed killer, slug bait, seed starting, seed trays.
- **Order:** the clear cannabis words (cannabis, THC, CBD, indica, sativa, pre-roll) still come first, so "cannabis seeds" stay cannabis.
- **A bare "flower" counts as cannabis only in a store whose main industry is cannabis.** Everywhere else, "Flower Pot" and "Wildflower Seed Mix" aren't cannabis. (Checked 2026-10-15: the only live cannabis product's type is "Cannabis Flower", so it stays cannabis.)
- **Pots and planters** join the home words.
- A garden centre sets **Plants** as its main industry, so a plain plant name ("Japanese Maple") falls to Plants. Owners can still pick a category for any product.

**Side effect on other stores:** a product like "Plant Stand" in a home store now reads as Plants. Checked 2026-10-15: no live product and no prospect demo product changes category.

## 2. Product specs

| Plants | Garden care |
|---|---|
| **Botanical name**: e.g. Hydrangea paniculata 'Limelight' | **Type**: e.g. organic granular fertilizer, potting mix |
| **Hardiness zone**: as on the grower's tag, naming the system, e.g. Zone 4 (Canada) or Zone 3 (USDA) | **Analysis (N-P-K)**: as on the label, e.g. 4-4-4 |
| **Light**: full sun, part shade, shade | **Use on**: e.g. vegetables, lawns, containers |
| **Water**: e.g. average; drought-tolerant once established | **Coverage**: e.g. one bag covers 10 m² |
| **Mature size**: height × spread, e.g. 1.8 × 1.5 m | **Size**: e.g. 28 L, 2 kg |
| **Bloom**: colour and season, e.g. white to pink, July–September | **Registration**: PCP number for pest control, as on the label |
| **Pot size**: e.g. #2 (2 gal) | **Certifications**: e.g. OMRI listed, peat-free |
| **Pets & kids**: only as a named source states, e.g. toxic to cats (ASPCA) | |

## 3. The four relabelled fields

| Stored field | Plants | Garden care |
|---|---|---|
| `materials` | **Light & soil**: "Full sun to part shade; any well-drained soil, including clay…" | **What's in it**: "Composted poultry manure, feather meal and kelp; 4-4-4…" |
| `fit_notes` | **Size & habit**: "Grows 1.8 m tall and wide; upright, sturdy stems that don't flop…" | **What it's for**: "Vegetables, flowers and containers; one bag feeds a 3 × 3 m bed…" |
| `care_instructions` | **Care**: "Water deeply the first summer; prune in late winter; flowers on new wood…" | **How to use**: "Mix into the top 5 cm of soil; repeat every 6–8 weeks…" |
| `sustainability_notes` | **Pollinators & wildlife**: "Bees love it in August; deer usually leave it alone…" | **Sustainability**: "Peat-free; made in Ontario from local compost…" |

## 4. Examples

| | Plants | Garden care |
|---|---|---|
| Product name | e.g. Hydrangea 'Limelight', #2 | e.g. Organic All-Purpose Fertilizer 4-4-4, 2 kg |
| Backstory | Where this variety comes from and why growers love it… | The brand and what makes this mix different… |
| Great when… | you have a sunny spot and want flowers from July to frost / you want a hydrangea that blooms every year, even after a hard winter / you want cut flowers for the house | you're starting a new vegetable bed / you want one feed for flowers and vegetables / you'd rather go organic |
| Reasons to buy | Blooms every year / Hardy to zone 3 / Great for cutting and drying | Organic / Slow release: feeds for weeks / Made in Canada |
| Awards & press | Perennial Plant of the Year 2024 | OMRI listed |
| FAQ | Does it need full sun? / At least 6 hours for the most flowers. | Can I use it on vegetables? / Yes, the label lists vegetables. |
| Staff name & role | Pat, Perennials lead | Pat, Garden care lead |
| Staff quote | "The hydrangea I tell first-time gardeners to buy." | "The only feed I use on my tomatoes." |
| Internal notes | The bench-front plants are #2; bigger #5s are in the back yard… | Keep bags off the concrete; damp bags split… |
| Extra image hint | In bloom, mature size in a garden, the grower's tag | The bag front, the label, before and after |
| Fact topics (starts on) | **hardiness**, light, water, size, bloom, care, wildlife, pets & kids, origin, other | **use**, ingredients, analysis, application, coverage, certifications, other |
| Add-fact example | Hardy to zone 4 (Canada) | Covers 10 m² per bag |
| Brand website example | provenwinners.com | espoma.com |
| Training "truth" field | **Survival truth**: "Tag says zone 5, but we lost a few in open, windy yards last winter; plant it near the house." | **Results truth**: "Works, but slowly: tell people it takes 3–4 weeks to see a difference." |

## 5. AI rules

Living plants vary, and a few garden questions have safety or legal weight: pets and kids, eating, and pest control.

**Plants (Generate and the assistant):**
- Hardiness, light, size and bloom only as the grower or a named source states them. Always name the zone system (Canadian or USDA); never convert one to the other.
- Never promise a plant will survive, bloom or reach a size. Describe what's typical. For "will it survive?", the assistant gives the zone on file and the store's plant guarantee (its returns policy), if there is one.
- **Pets, kids and eating:** toxicity only from a named source in the fact sheet (see question 3), marked "regulated"; otherwise "We don't have that on file; check before planting where pets or kids play." Never say a plant is edible unless it's sold as a food plant (vegetables, herbs, fruit).
- **No health claims** for herbs and medicinal plants (echinacea, chamomile): growing and kitchen use only, never what they do for the body.
- "Native", "non-invasive", "deer-resistant", "pollinator-friendly" and "drought-tolerant" only when a source says so. "Native" names where (e.g. native to Ontario).

**Garden care:**
- **Pest and weed control** (Pest Control Products Act): only what the label says, including which pests and uses. Never "safe", "non-toxic", "harmless", "pet-safe" or "natural, so it's safe". The assistant answers use questions from the label only and adds "Follow the label." It never suggests a use the label doesn't list.
- **Fertilizers:** N-P-K and claims only as on the label; no promised results.

These rules are pending the legal review in `ACTION_ITEMS.md`, like the alcohol, cannabis and cosmetic rules.

## 6. Not in this build (physical kit and onboarding; for `ACTION_ITEMS.md`)

- **Outdoor tags:** stickers on outdoor benches need to be waterproof and UV-stable, and tags on metal benches need on-metal (ferrite-backed) tags. Ask the tag suppliers in Step 11.
- **Tags go on the bench sign, not the pot.** The pot leaves with the customer. One tag per variety, as on a shelf.
- **Seasonal turnover:** benches change every few weeks, so garden centres remap tags often. Web NFC tap-to-map (§7 Step 7, not built) matters more here than for a boutique.
- **Catalog:** many garden centres use a non-Shopify POS. CSV import and manual products already work.

## Decisions (founder, 2026-10-15)

1. **Two categories:** Plants and Garden care (N-P-K and PCP numbers mean nothing on a plant).
2. **Pets and kids:** research may use named public sources (the ASPCA's toxic plant list; the Canadian Poisonous Plants Information System), cited on the fact sheet.
3. **Plants' fourth field:** "Pollinators & wildlife".

Still open: which garden centre is the first prospect, so the examples and a demo store can use its real stock.
