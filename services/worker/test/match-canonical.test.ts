import { describe, it, expect } from "vitest";
import { normalizeBrandSlug, normalizeProductName } from "../src/jobs/match-canonical.js";

describe("normalizeBrandSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(normalizeBrandSlug("The North Face")).toBe("the-north-face");
  });

  it("strips accents", () => {
    expect(normalizeBrandSlug("Maison Kitsuné")).toBe("maison-kitsune");
  });

  it("removes non-alphanumeric characters other than hyphens", () => {
    expect(normalizeBrandSlug("A.P.C.")).toBe("apc");
  });

  it("strips leading special words like & and The", () => {
    expect(normalizeBrandSlug("& Other Stories")).toBe("other-stories");
  });

  it("collapses multiple hyphens into one", () => {
    expect(normalizeBrandSlug("Brand  Name")).toBe("brand-name");
  });

  it("trims leading and trailing hyphens", () => {
    const result = normalizeBrandSlug("  Finisterre  ");
    expect(result).toBe("finisterre");
    expect(result.startsWith("-")).toBe(false);
    expect(result.endsWith("-")).toBe(false);
  });
});

describe("normalizeProductName", () => {
  it("lowercases the title", () => {
    expect(normalizeProductName("Merino Wool Crewneck")).toBe(
      "merino wool crewneck",
    );
  });

  it("strips content after a dash separator", () => {
    expect(normalizeProductName("Merino Wool Crewneck - Blue - XL")).toBe(
      "merino wool crewneck",
    );
  });

  it("strips content after a pipe separator", () => {
    expect(normalizeProductName("Classic Jean | Dark Wash")).toBe(
      "classic jean",
    );
  });

  it("strips parenthetical content", () => {
    expect(normalizeProductName("Black T-Shirt (Limited Edition)")).toBe(
      "black t-shirt",
    );
  });

  it("trims extra whitespace", () => {
    expect(normalizeProductName("  Premium Hoodie  ")).toBe("premium hoodie");
  });

  it("handles a plain title with no variants", () => {
    expect(normalizeProductName("Canvas Tote Bag")).toBe("canvas tote bag");
  });
});
