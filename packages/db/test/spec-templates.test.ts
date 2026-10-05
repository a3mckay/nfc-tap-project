// PRD v4 §7 Step 15l: spec fields that depend on the product's category
// (docs/PRD-ai-assistant.md D51).
import { describe, expect, it } from "vitest";
import { SPEC_TEMPLATES, specCategoryFor, specFieldsFor } from "../src/spec-templates.js";

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
    expect(Object.keys(SPEC_TEMPLATES).sort()).toEqual(["apparel", "beer", "cannabis", "eyewear", "footwear", "general", "home", "spirits", "wine"]);
    for (const fields of Object.values(SPEC_TEMPLATES)) for (const f of fields) expect(f.label && f.hint).toBeTruthy();
  });
});
