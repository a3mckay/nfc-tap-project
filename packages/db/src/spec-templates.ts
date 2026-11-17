// PRD v4 §7 Step 15l: spec fields per product category (docs/PRD-ai-assistant.md
// D51). The product's type and title pick the template; the store's main
// industry is the fallback, and the owner can override it per product.

export interface SpecField { key: string; label: string; hint: string }

const f = (key: string, label: string, hint: string): SpecField => ({ key, label, hint });

export const SPEC_TEMPLATES = {
  cannabis: [
    f("strain_type", "Strain type", "Indica, sativa, hybrid (and dominance)"),
    f("thc", "THC", "As on the label, e.g. 22–26%"),
    f("cbd", "CBD", "As on the label, e.g. <1%"),
    f("terpenes", "Terpenes", "Dominant terpenes, e.g. limonene, caryophyllene"),
    f("format", "Format", "Dried flower, pre-roll, vape, edible…"),
    f("size", "Size", "e.g. 3.5 g"),
    f("producer", "Producer", "Licensed producer or brand"),
    f("packaged_date", "Packaged date", "From the label"),
  ],
  wine: [
    f("abv", "Alcohol (ABV)", "e.g. 13.5%"),
    f("vintage", "Vintage", "e.g. 2020"),
    f("region", "Region", "e.g. Veneto, Italy"),
    f("grapes", "Grapes", "e.g. Corvina, Rondinella"),
    f("sweetness", "Sweetness", "Dry, off-dry, sweet"),
    f("allergens", "Allergens", "e.g. contains sulfites"),
    f("organic_vegan", "Organic / vegan", "Certifications, if any"),
  ],
  beer: [
    f("abv", "Alcohol (ABV)", "e.g. 6.5%"),
    f("style", "Style", "e.g. Hazy IPA"),
    f("ibu", "Bitterness (IBU)", "If listed"),
    f("allergens", "Allergens", "e.g. contains gluten"),
    f("size", "Size", "e.g. 4 × 473 ml"),
  ],
  spirits: [
    f("abv", "Alcohol (ABV)", "e.g. 40%"),
    f("spirit_type", "Type", "e.g. single malt Scotch whisky"),
    f("region", "Region", "e.g. Speyside"),
    f("age", "Age", "e.g. 12 years"),
    f("size", "Size", "e.g. 750 ml"),
    f("allergens", "Allergens", "If any"),
  ],
  eyewear: [
    f("lens_colour", "Lens colour", "e.g. green classic"),
    f("polarised", "Polarised", "Yes / no / depends on variant"),
    f("uv_rating", "UV protection", "e.g. 100% UVA/UVB"),
    f("lens_width", "Lens width", "e.g. 54 mm"),
    f("rx_compatible", "Prescription lenses", "Can it take prescription lenses?"),
    f("frame_material", "Frame material", "e.g. nylon, acetate, metal"),
  ],
  footwear: [
    f("width", "Width", "Standard, wide, narrow; wide sizes available?"),
    f("upper", "Upper", "e.g. full-grain leather"),
    f("sole", "Sole", "e.g. rubber cupsole"),
    f("waterproof", "Waterproof", "Yes / water-resistant / no"),
  ],
  apparel: [
    f("fabric", "Fabric", "e.g. 100% cotton"),
    f("fit", "Fit", "e.g. relaxed, slim, true to size"),
    f("care", "Care", "e.g. hand wash cold"),
    f("sizes", "Sizes", "e.g. XS–XL"),
    f("origin", "Made in", "Country of manufacture"),
  ],
  home: [
    f("material", "Material", "e.g. 100% linen"),
    f("dimensions", "Dimensions", "e.g. Queen 90 × 90 in"),
    f("care", "Care", "e.g. machine wash warm"),
    f("certifications", "Certifications", "e.g. OEKO-TEX Standard 100"),
  ],
  // docs/category-beauty.md (founder-approved 2026-10-13)
  beauty: [
    f("shade", "Shade", "e.g. 03 Warm Beige, or the shade range"),
    f("finish", "Finish", "e.g. matte, satin, dewy"),
    f("skin_type", "Skin type", "As the brand states it, e.g. all, oily, sensitive"),
    f("key_ingredients", "Key ingredients", "e.g. hyaluronic acid, niacinamide"),
    f("free_from", "Free from", "As the brand states it, e.g. fragrance-free, vegan"),
    f("size", "Size", "e.g. 30 ml"),
  ],
  // docs/category-toys-vintage.md (founder-approved 2026-10-13)
  toys: [
    f("ages", "Ages", "As on the packaging, e.g. 3+"),
    f("safety", "Safety", "As on the packaging, e.g. no small parts"),
    f("materials", "Materials", "e.g. FSC beech, water-based paint"),
    f("batteries", "Batteries", "e.g. none, or 2 × AA included"),
    f("origin", "Made in", "Country of manufacture"),
    f("dimensions", "Dimensions", "Size of the toy or box"),
  ],
  vintage: [
    f("era", "Era", "e.g. 1960s"),
    f("maker", "Maker", "e.g. Dansk, or unmarked"),
    f("materials", "Materials", "e.g. teak, brass"),
    f("condition", "Condition", "e.g. very good; light wear on the base"),
    f("dimensions", "Dimensions", "e.g. 30 × 20 cm"),
    f("provenance", "Provenance", "Where it came from, if known"),
  ],
  // docs/category-garden.md (founder-approved 2026-10-15)
  plants: [
    f("botanical_name", "Botanical name", "e.g. Hydrangea paniculata 'Limelight'"),
    f("hardiness_zone", "Hardiness zone", "As on the grower's tag, naming the system, e.g. Zone 4 (Canada)"),
    f("light", "Light", "Full sun, part shade, shade"),
    f("water", "Water", "e.g. average; drought-tolerant once established"),
    f("mature_size", "Mature size", "Height × spread, e.g. 1.8 × 1.5 m"),
    f("bloom", "Bloom", "Colour and season, e.g. white to pink, July–September"),
    f("pot_size", "Pot size", "e.g. #2 (2 gal)"),
    f("pets_kids", "Pets & kids", "Only as a named source states, e.g. toxic to cats (ASPCA)"),
  ],
  garden_care: [
    f("type", "Type", "e.g. organic granular fertilizer, potting mix"),
    f("npk", "Analysis (N-P-K)", "As on the label, e.g. 4-4-4"),
    f("use_on", "Use on", "e.g. vegetables, lawns, containers"),
    f("coverage", "Coverage", "e.g. one bag covers 10 m²"),
    f("size", "Size", "e.g. 28 L, 2 kg"),
    f("registration", "Registration", "PCP number for pest control, as on the label"),
    f("certifications", "Certifications", "e.g. OMRI listed, peat-free"),
  ],
  general: [
    f("material", "Material", "What it's made of"),
    f("dimensions", "Dimensions", "Size or capacity"),
    f("origin", "Made in", "Country of manufacture"),
  ],
} satisfies Record<string, SpecField[]>;

export type SpecCategory = keyof typeof SPEC_TEMPLATES;
export const SPEC_CATEGORIES = Object.keys(SPEC_TEMPLATES) as SpecCategory[];

const isCategory = (c: string | null | undefined): c is SpecCategory => !!c && c in SPEC_TEMPLATES;

// First match wins, so more specific words come first. The clear cannabis words
// come first (a CBD face oil is a cannabis product in Canada), then garden care
// ("Soil Conditioner" isn't hair care), then beauty and vintage, so "Rose Gold
// Highlighter" isn't a wine and "Top Coat" isn't clothing. Plant words are broad
// ("tree", "vine"), so they come last: "Tea Tree Shampoo" stays beauty.
// Some words count only in one kind of store (docs/category-garden.md): a bare
// "flower" only in a cannabis store ("Flower Pot" isn't cannabis), and a quoted
// cultivar name only in a garden store (sneaker names are quoted too).
type Rule = [SpecCategory, RegExp, ((storeIndustry: string | null | undefined) => boolean)?];
const inGardenStore = (i: string | null | undefined) => i === "plants" || i === "garden_care";

const KEYWORDS: Rule[] = [
  ["cannabis", /\b(cannabis|pre-?rolls?|indica|sativa|thc|cbd|vape cart\w*)\b/i],
  ["cannabis", /\bflowers?\b/i, (i) => i === "cannabis"],
  ["garden_care", /\b(soils?|potting mix|compost|mulch|manure|peat|perlite|vermiculite|fertili[sz]ers?|(plant|lawn) food|insecticid\w*|herbicid\w*|fungicid\w*|pesticid\w*|weed (killer|control|preventer)|slug bait|seed starting|seed trays?)\b/i],
  ["plants", /\s['‘][A-Z][^'’]*['’]/, inGardenStore],   // Hosta 'Sum and Substance'
  ["beauty", /\b(make-?up|cosmetics?|beauty|lipsticks?|lip ?(gloss|liner|tint|balm|oil|cream|stain)s?|mascaras?|foundations?|concealers?|blush(es)?|bronzers?|highlighters?|eye ?shadows?|eyeliners?|brow (gel|pencil|pomade)|nail (polish|lacquer)|top coat|base coat|serums?|moisturi[sz]ers?|cleansers?|toners?|sunscreens?|spf|skin ?care|face (mask|oil|wash|cream|mist)s?|perfumes?|eau de (parfum|toilette)|colognes?|shampoos?|conditioners?|hair (oil|mask|serum)s?|body (lotion|wash|butter|oil|mist)s?)\b/i],
  ["vintage", /\b(vintage|antiques?|retro|mid-?century)\b/i],
  ["eyewear", /\b(sunglass\w*|eyewear|glasses|frames?)\b/i],
  ["footwear", /\b(shoes?|sneakers?|boots?|loafers?|sandals?|trainers?|footwear|chukka)\b/i],
  ["wine", /\b(wine|champagne|prosecco|ripasso|amarone|cabernet|merlot|pinot|chardonnay|riesling)\b|rosé/i],
  ["beer", /\b(beer|ipa|lager|ale|stout|pilsner|cider)\b/i],
  ["spirits", /\b(whisk(e)?y|vodka|gin|rum|tequila|mezcal|bourbon|brandy|cognac|spirits?|liqueur)\b/i],
  ["toys", /\b(toys?|puzzles?|jigsaw|blocks|plush(ies)?|stuffed animals?|dolls?|teddy|rattles?|teethers?|stacker|play ?sets?|wooden train)\b/i],
  ["home", /\b(bedding|duvet|sheets?|pillow\w*|blanket|throw|towel|furniture|lamp|rug|candle|home|pots?|planters?)\b/i],
  ["apparel", /\b(shirt|t-?shirt|top|tee|dress|skirt|pants?|trousers|jeans|jacket|coat|sweater|knit|hoodie|clothing|apparel|crewneck|cardigan)\b/i],
  ["plants", /\b(plants?(?!-based)|perennials?|annuals?|shrubs?|trees?|hedg(e|es|ing)|groundcovers?|vines?|succulents?|cact(us|i|uses)|houseplants?|hanging baskets?|bulbs?|seedlings?|seeds|seed (mix|packet)s?|grass seed|wildflowers?)\b/i],
];

export function specCategoryFor(p: { productType: string | null; title: string; override?: string | null; storeIndustry?: string | null }): SpecCategory {
  if (isCategory(p.override)) return p.override;
  const text = `${p.productType ?? ""} ${p.title}`;
  for (const [category, re, when] of KEYWORDS) if ((!when || when(p.storeIndustry)) && re.test(text)) return category;
  return isCategory(p.storeIndustry) ? p.storeIndustry : "general";
}

// Display names, for the category pickers in the admin.
export const CATEGORY_NAMES: Record<SpecCategory, string> = {
  apparel: "Apparel", footwear: "Footwear", eyewear: "Eyewear", beauty: "Beauty", cannabis: "Cannabis", wine: "Wine",
  beer: "Beer", spirits: "Spirits", toys: "Toys", vintage: "Vintage", home: "Home", plants: "Plants", garden_care: "Garden care",
  general: "General",
};

export function specFieldsFor(category: SpecCategory): SpecField[] {
  return SPEC_TEMPLATES[category];
}
