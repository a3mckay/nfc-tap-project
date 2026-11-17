// "Goes great with" (founder, 2026-11-16): the AI picks up to three of the
// store's own products a product needs or suits. Every pick must cite a fact on
// the product's fact sheet (its source of knowledge) and be in the catalog.
import { describe, it, expect, vi } from "vitest";
import { canPair, pairingPrompt, pairingsFromModel, suggestPairings, type PairingInput } from "../src/lib/pairings.js";

const input: PairingInput = {
  product: { id: "p-1", title: "Bromeliad Ocean Mist, 6\"", category: "plants" },
  facts: [
    { topic: "pests", fact: "Bromeliads can get mealybugs and scale", source_url: "https://plants.ces.ncsu.edu/plants/bromeliad/", source_kind: "reference" },
    { topic: "water", fact: "Water when the top of the soil is dry", source_url: "https://plants.ces.ncsu.edu/plants/bromeliad/", source_kind: "reference" },
    { topic: "other", fact: "The store's own tip", source_url: null, source_kind: "owner" },
  ],
  catalog: [
    { id: "soap", title: "Safer's Insecticidal Soap, 1 L", vendor: "Safer's", product_type: "Pest control", category: "garden_care", description: "Ready-to-use insecticidal soap spray." },
    { id: "meter", title: "Mini Moisture Tester", vendor: "Luster Leaf", product_type: "Garden tools", category: "general", description: "A small probe that shows how moist the soil is." },
    { id: "wine", title: "Pinot Noir 2021", vendor: "Tawse", product_type: "Wine", category: "wine", description: "" },
  ],
};

describe("canPair", () => {
  it("leaves out cannabis and alcohol (promotion rules), on either side", () => {
    for (const c of ["cannabis", "wine", "beer", "spirits"] as const) expect(canPair(c), c).toBe(false);
    for (const c of ["plants", "garden_care", "footwear", "general"] as const) expect(canPair(c), c).toBe(true);
  });
});

describe("pairingPrompt", () => {
  it("numbers the facts, lists the catalog by short key without alcohol or cannabis, and states the rules", () => {
    const prompt = pairingPrompt(input);
    expect(prompt).toContain("[1] (pests) Bromeliads can get mealybugs and scale");
    expect(prompt).toContain("[2] (water) Water when the top of the soil is dry");
    expect(prompt).toContain("c1: Safer's Insecticidal Soap, 1 L");
    expect(prompt).toContain("c2: Mini Moisture Tester");
    expect(prompt).not.toContain("Pinot Noir");
    expect(prompt).toMatch(/only .*catalog/i);
    expect(prompt).toMatch(/numbered fact/i);
    expect(prompt).toMatch(/none/i);   // returning nothing is fine
  });
});

describe("pairingsFromModel", () => {
  it("maps keys and fact numbers back, and takes the source from the cited fact", () => {
    expect(pairingsFromModel([{ item: "c1", fact: 1, reason: "Bromeliads can get mealybugs." }, { item: "c2", fact: 2, reason: "Water when the top of the soil is dry." }], input)).toEqual([
      { paired_product_id: "soap", reason: "Bromeliads can get mealybugs.", source_url: "https://plants.ces.ncsu.edu/plants/bromeliad/", source_kind: "reference" },
      { paired_product_id: "meter", reason: "Water when the top of the soil is dry.", source_url: "https://plants.ces.ncsu.edu/plants/bromeliad/", source_kind: "reference" },
    ]);
  });

  it("drops picks with an unknown product or fact, no reason, or a repeat; keeps three at most", () => {
    const out = pairingsFromModel([
      { item: "c9", fact: 1, reason: "x" },
      { item: "c1", fact: 7, reason: "x" },
      { item: "c1", fact: 1, reason: "  " },
      { item: "c1", fact: 1, reason: "Mealybugs." },
      { item: "c1", fact: 2, reason: "Again." },
      "junk",
    ], input);
    expect(out.map((p) => p.paired_product_id)).toEqual(["soap"]);
  });
});

describe("suggestPairings", () => {
  it("asks the model only when there are facts, a catalog, and the category allows it", async () => {
    const model = vi.fn(async () => [{ item: "c1", fact: 1, reason: "Mealybugs." }]);
    expect(await suggestPairings(input, model)).toHaveLength(1);
    expect(await suggestPairings({ ...input, facts: [] }, model)).toEqual([]);
    expect(await suggestPairings({ ...input, catalog: [] }, model)).toEqual([]);
    expect(await suggestPairings({ ...input, product: { ...input.product, category: "cannabis" } }, model)).toEqual([]);
    expect(model).toHaveBeenCalledTimes(1);
  });
});
