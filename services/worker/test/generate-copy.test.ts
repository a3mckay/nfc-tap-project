import { describe, it, expect } from "vitest";
import { buildCopyPrompt, parseCopyResponse } from "../src/jobs/generate-copy.js";
import type { ProductForEnrichment } from "@nfc/db";

const MINIMAL_PRODUCT: ProductForEnrichment = {
  id: "abc-123",
  title: "Merino Wool Crewneck",
  description_html: "<p>Soft merino wool sweater in a classic crewneck cut.</p>",
  vendor: "Finisterre",
  product_type: "Knitwear",
};

const SPARSE_PRODUCT: ProductForEnrichment = {
  id: "def-456",
  title: "Black T-Shirt",
  description_html: null,
  vendor: null,
  product_type: null,
};

describe("buildCopyPrompt", () => {
  it("includes the product title in the user message", () => {
    const msg = buildCopyPrompt(MINIMAL_PRODUCT);
    expect(msg).toContain("Merino Wool Crewneck");
  });

  it("includes vendor when present", () => {
    const msg = buildCopyPrompt(MINIMAL_PRODUCT);
    expect(msg).toContain("Finisterre");
  });

  it("includes product_type when present", () => {
    const msg = buildCopyPrompt(MINIMAL_PRODUCT);
    expect(msg).toContain("Knitwear");
  });

  it("strips HTML tags from description_html", () => {
    const msg = buildCopyPrompt(MINIMAL_PRODUCT);
    expect(msg).toContain("Soft merino wool sweater");
    expect(msg).not.toContain("<p>");
  });

  it("handles null vendor and product_type gracefully", () => {
    expect(() => buildCopyPrompt(SPARSE_PRODUCT)).not.toThrow();
    const msg = buildCopyPrompt(SPARSE_PRODUCT);
    expect(msg).toContain("Black T-Shirt");
  });

  it("handles null description_html gracefully", () => {
    const msg = buildCopyPrompt(SPARSE_PRODUCT);
    expect(msg).toContain("Black T-Shirt");
  });

  it("returns a non-empty string", () => {
    const msg = buildCopyPrompt(MINIMAL_PRODUCT);
    expect(msg.length).toBeGreaterThan(20);
  });
});

describe("parseCopyResponse", () => {
  it("maps all fields from Claude tool input", () => {
    const toolInput = {
      backstory: "Founded in Cornwall, Finisterre makes gear for cold-water surfers.",
      fit_notes: "True to size. Relaxed through the chest.",
      materials: "100% Zque-certified merino wool.",
      reasons_to_buy: [
        "Ethically sourced merino",
        "Warm yet breathable",
        "Lifetime repair guarantee",
      ],
    };
    const result = parseCopyResponse(toolInput);
    expect(result.backstory).toBe(toolInput.backstory);
    expect(result.fit_notes).toBe(toolInput.fit_notes);
    expect(result.materials).toBe(toolInput.materials);
    expect(result.reasons_to_buy).toEqual(toolInput.reasons_to_buy);
  });

  it("coerces missing optional fields to null", () => {
    const toolInput = {
      backstory: null,
      fit_notes: null,
      materials: null,
      reasons_to_buy: ["Great value"],
    };
    const result = parseCopyResponse(toolInput);
    expect(result.backstory).toBeNull();
    expect(result.fit_notes).toBeNull();
    expect(result.materials).toBeNull();
  });

  it("always returns reasons_to_buy as an array", () => {
    const toolInput = {
      backstory: "A story.",
      fit_notes: null,
      materials: null,
      reasons_to_buy: [],
    };
    const result = parseCopyResponse(toolInput);
    expect(Array.isArray(result.reasons_to_buy)).toBe(true);
  });
});
