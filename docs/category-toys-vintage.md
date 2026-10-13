# Toys and vintage categories (founder-approved 2026-10-13; not built yet)

Two new spec categories, for Citizen Kid (ethical toys) and The Pale Blue Dot (antiques and vintage). They plug into the approved category system (`docs/category-labels.md`): same stored fields, their own words everywhere.

## 1. Spec fields (the "Product specs" panel)

| Toys | Vintage |
|---|---|
| **Ages** — as on the packaging, e.g. 3+ | **Era** — e.g. 1960s |
| **Safety** — e.g. no small parts; meets Canadian toy rules | **Maker** — e.g. Dansk, or "unmarked" |
| **Materials** — e.g. FSC beech, water-based paint | **Materials** — e.g. teak, brass |
| **Batteries** — e.g. none | **Condition** — e.g. very good; light wear on the base |
| **Made in** — country | **Dimensions** — e.g. 30 × 20 cm |
| **Dimensions** — size of the toy or box | **Provenance** — where it came from, if known |

Picked automatically from the product's type or title ("toy", "puzzle", "blocks", "plush", "vintage", "antique", "mid-century"…), or set by the owner or as the store's main industry.

## 2. The four relabelled fields

| Stored field | Toys | Vintage |
|---|---|---|
| `materials` | **Materials & safety** — "Solid beech, water-based paints; no small parts…" | **Materials & maker** — "Teak and brass; Danish, maker unmarked…" |
| `fit_notes` | **Ages & play** — "Best for ages 3–6; open-ended building…" | **Size & condition** — "30 × 20 cm; light wear on the base, no chips…" |
| `care_instructions` | **Care** — "Wipe with a damp cloth; don't soak…" | **Care** — "Dust with a soft cloth; oil the teak once a year…" |
| `sustainability_notes` | **Who made it** — "Hand-knit by a women's cooperative in Peru…" | **Provenance** — "From a Dundas estate; one owner since 1968…" |

## 3. Examples

| | Toys | Vintage |
|---|---|---|
| Great when… | you want a toy with no batteries / you're buying for a 3-year-old who loves building / you want a gift that lasts past the toddler years | you're furnishing with one-of-a-kind pieces / you love mid-century design / you'd rather buy old than new |
| Reasons to buy | No batteries, no screens / Made from natural materials / Built to be handed down | One of a kind / Solid teak / Original finish |
| FAQ | What age is it for? / 3 and up: no small parts. | Is it the original finish? / Yes, never refinished. |
| Staff name & role | Rebecca, Owner | Sam, Owner |
| Internal notes | Display set is missing one block; sell from the boxed stock… | Price is firm; the matching chair is in the cave… |
| Fact topics (starts on) | **ages**, safety, materials, made-by, play, care, other | **era**, maker, materials, condition, provenance, dimensions, other |
| Add-fact example | Ages 3+, no small parts | Stamped "Made in Denmark" underneath |
| Training "truth" field | **Age and durability truth** — "Says 3+, but the pieces are fiddly; best from 4." | **Condition truth** — "Small chip on the lid; point it out before they ask." |

## 4. AI rules

**Toys** (child safety; and Quebec bans advertising aimed at children under 13):
- Generate writes to the adult buyer, never to the child.
- Ages and safety only as the packaging or the store states them; never invent a certification or a safety claim.
- No developmental or health claims ("boosts brain development", "makes kids smarter").
- The assistant treats age and safety questions like other regulated facts: only from the store's data, plus "Check the label to be sure."

**Vintage** (one-of-a-kind pieces with nothing to search for):
- **Generate skips web research unless the owner sets a maker.** Then it searches for the maker's history, never for this exact piece. It writes from the owner's description and notes.
- Never invents an era, maker, provenance or condition. Never states value or investment potential ("worth", "will appreciate").
- "One of a kind" is a fact, not urgency: no "won't last", "grab it before it's gone".

## 5. Not included

- **The Pale Blue Dot's sustainable goods upstairs** (natural, earth-friendly products) fit the existing **home** or **general** categories.
- **Toys and vintage on the staff training tab** use the same system, so they get their own words automatically.

## Decisions (founder, 2026-10-13)

1. **Vintage research:** Generate skips web research unless the owner sets a maker.
2. **Toys' fourth field:** "Who made it" (founder unsure; chosen because it fits Citizen Kid's story and still reads well for big brands; easy to change).
