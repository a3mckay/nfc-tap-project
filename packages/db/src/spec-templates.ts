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
  general: [
    f("material", "Material", "What it's made of"),
    f("dimensions", "Dimensions", "Size or capacity"),
    f("origin", "Made in", "Country of manufacture"),
  ],
} satisfies Record<string, SpecField[]>;

export type SpecCategory = keyof typeof SPEC_TEMPLATES;
export const SPEC_CATEGORIES = Object.keys(SPEC_TEMPLATES) as SpecCategory[];

const isCategory = (c: string | null | undefined): c is SpecCategory => !!c && c in SPEC_TEMPLATES;

// First match wins, so more specific words come first.
const KEYWORDS: Array<[SpecCategory, RegExp]> = [
  ["cannabis", /\b(cannabis|flower|pre-?rolls?|indica|sativa|thc|cbd|vape cart\w*)\b/i],
  ["eyewear", /\b(sunglass\w*|eyewear|glasses|frames?)\b/i],
  ["footwear", /\b(shoes?|sneakers?|boots?|loafers?|sandals?|trainers?|footwear|chukka)\b/i],
  ["wine", /\b(wine|champagne|prosecco|ripasso|amarone|cabernet|merlot|pinot|chardonnay|riesling|ros[eé])\b/i],
  ["beer", /\b(beer|ipa|lager|ale|stout|pilsner|cider)\b/i],
  ["spirits", /\b(whisk(e)?y|vodka|gin|rum|tequila|mezcal|bourbon|brandy|cognac|spirits?|liqueur)\b/i],
  ["home", /\b(bedding|duvet|sheets?|pillow\w*|blanket|throw|towel|furniture|lamp|rug|candle|home)\b/i],
  ["apparel", /\b(shirt|t-?shirt|top|tee|dress|skirt|pants?|trousers|jeans|jacket|coat|sweater|knit|hoodie|clothing|apparel|crewneck|cardigan)\b/i],
];

export function specCategoryFor(p: { productType: string | null; title: string; override?: string | null; storeIndustry?: string | null }): SpecCategory {
  if (isCategory(p.override)) return p.override;
  const text = `${p.productType ?? ""} ${p.title}`;
  for (const [category, re] of KEYWORDS) if (re.test(text)) return category;
  return isCategory(p.storeIndustry) ? p.storeIndustry : "general";
}

export function specFieldsFor(category: SpecCategory): SpecField[] {
  return SPEC_TEMPLATES[category];
}
