// PRD v4 §7 Step 15l: spec fields that depend on the product's category
// (docs/PRD-ai-assistant.md D51).
import { describe, expect, it } from "vitest";
import { SPEC_TEMPLATES, SPEC_CATEGORIES, CATEGORY_NAMES, specCategoryFor, specFieldsFor } from "../src/spec-templates.js";

describe("specCategoryFor", () => {
  it("detects the category from the product type or title", () => {
    expect(specCategoryFor({ productType: "Shoe", title: "Air Force 1" })).toBe("footwear");
    expect(specCategoryFor({ productType: "Cannabis Flower", title: "Animal Face" })).toBe("cannabis");
    expect(specCategoryFor({ productType: "Wine", title: "Campofiorin" })).toBe("wine");
    expect(specCategoryFor({ productType: "Sunglasses", title: "Erika Classic" })).toBe("eyewear");
    expect(specCategoryFor({ productType: "Clothing", title: "Easy Pointelle Shirt" })).toBe("apparel");
    expect(specCategoryFor({ productType: "Bedding", title: "Washed Linen Duvet Cover" })).toBe("home");
    expect(specCategoryFor({ productType: null, title: "Highland Single Malt Whisky" })).toBe("spirits");
    expect(specCategoryFor({ productType: null, title: "Hazy IPA 4-pack" })).toBe("beer");
  });

  it("detects beauty, toys and vintage (docs/category-beauty.md, docs/category-toys-vintage.md)", () => {
    const of = (title: string, productType: string | null = null) => specCategoryFor({ productType, title });
    for (const t of ["Soft Matte Lip Cream", "Lash Lift Mascara", "Hydrating Serum", "Daily Moisturiser SPF 30", "Eau de Parfum 50 ml", "Nail Polish", "Sheer Lip Tint"]) expect(of(t), t).toBe("beauty");
    for (const t of ["Wooden Stacking Blocks", "Hand-knit Plush Llama", "100-piece Jigsaw Puzzle", "Rag Doll"]) expect(of(t), t).toBe("toys");
    for (const t of ["Vintage Teak Sideboard", "Antique Brass Candlesticks", "Mid-Century Lounge Chair", "Retro Glass Tumblers"]) expect(of(t), t).toBe("vintage");
  });

  it("files look-alike names correctly", () => {
    const of = (title: string) => specCategoryFor({ productType: null, title });
    expect(of("Rose Gold Highlighter")).toBe("beauty");   // not wine
    expect(of("Top Coat")).toBe("beauty");                 // nail polish, not clothing ("top")
    expect(of("Provence Rosé 2024")).toBe("wine");
    expect(of("Dry Rose Wine")).toBe("wine");
    expect(of("Rose Candle")).toBe("home");                // not wine
    expect(of("CBD Face Oil")).toBe("cannabis");           // a cannabis product in Canada, not a cosmetic
  });

  it("uses the product's own setting first, then the store's industry, then general", () => {
    expect(specCategoryFor({ productType: "Shoe", title: "x", override: "apparel" })).toBe("apparel");
    expect(specCategoryFor({ productType: "Gift card", title: "Gift card", storeIndustry: "wine" })).toBe("wine");
    expect(specCategoryFor({ productType: null, title: "Mystery item" })).toBe("general");
  });
});

describe("templates", () => {
  it("cover the categories in D51 with the agreed fields", () => {
    expect(specFieldsFor("cannabis").map((f) => f.key)).toEqual(["strain_type", "thc", "cbd", "terpenes", "format", "size", "producer", "packaged_date"]);
    expect(specFieldsFor("wine").map((f) => f.key)).toEqual(["abv", "vintage", "region", "grapes", "sweetness", "allergens", "organic_vegan"]);
    expect(specFieldsFor("eyewear").map((f) => f.key)).toEqual(["lens_colour", "polarised", "uv_rating", "lens_width", "rx_compatible", "frame_material"]);
    expect(specFieldsFor("footwear").map((f) => f.key)).toEqual(["width", "upper", "sole", "waterproof"]);
    expect(specFieldsFor("beauty").map((f) => f.key)).toEqual(["shade", "finish", "skin_type", "key_ingredients", "free_from", "size"]);
    expect(specFieldsFor("toys").map((f) => f.key)).toEqual(["ages", "safety", "materials", "batteries", "origin", "dimensions"]);
    expect(specFieldsFor("vintage").map((f) => f.key)).toEqual(["era", "maker", "materials", "condition", "dimensions", "provenance"]);
    expect(Object.keys(SPEC_TEMPLATES).sort()).toEqual(["apparel", "beauty", "beer", "cannabis", "eyewear", "footwear", "general", "home", "spirits", "toys", "vintage", "wine"]);
    for (const fields of Object.values(SPEC_TEMPLATES)) for (const f of fields) expect(f.label && f.hint).toBeTruthy();
  });

  it("names every category once, for the category pickers", () => {
    expect(Object.keys(CATEGORY_NAMES).sort()).toEqual([...SPEC_CATEGORIES].sort());
    expect(CATEGORY_NAMES.beauty).toBe("Beauty");
  });
});
