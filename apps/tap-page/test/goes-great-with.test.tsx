// "Goes great with" (founder, 2026-11-16): up to three of the store's own
// products the product needs, each with its reason. Editorial, not a shop
// widget (PRD v4 §4.3): no prices, no "add" buttons.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GoesGreatWith } from "../app/p/[tag_uuid]/GoesGreatWith.js";

const pairing = (over: Partial<Parameters<typeof GoesGreatWith>[0]["pairings"][number]> = {}) => ({
  product_id: "soap", title: "Safer's Insecticidal Soap", image_url: "https://img.example/soap.jpg", tag_uuid: "t-soap",
  reason: "Bromeliads can get mealybugs.", source_url: "https://plants.ces.ncsu.edu/x/", source_kind: "reference" as const, ...over,
});

describe("GoesGreatWith", () => {
  it("shows each paired product with its reason, linking to its tap page", () => {
    const html = renderToStaticMarkup(<GoesGreatWith pairings={[pairing()]} primaryColor="#5b2d8e" />);
    expect(html).toContain("Goes great with");
    expect(html).toContain("Safer&#x27;s Insecticidal Soap");
    expect(html).toContain("Bromeliads can get mealybugs.");
    expect(html).toContain('href="/p/t-soap"');
    expect(html).not.toMatch(/\$|add to|buy/i);
  });

  it("shows a product without a tag, but doesn't link it", () => {
    const html = renderToStaticMarkup(<GoesGreatWith pairings={[pairing({ tag_uuid: null })]} primaryColor="#000" />);
    expect(html).toContain("Safer&#x27;s Insecticidal Soap");
    expect(html).not.toContain("href=");
  });

  it("renders nothing without pairings", () => {
    expect(renderToStaticMarkup(<GoesGreatWith pairings={[]} primaryColor="#000" />)).toBe("");
  });
});
