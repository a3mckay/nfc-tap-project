// Category labels and examples (docs/category-labels.md, founder-approved
// 2026-10-07): every place that describes a product uses its category's words.
import { describe, it, expect } from "vitest";
import { CATEGORY_COPY, copyFor, ALL_FACT_TOPICS, SPEC_CATEGORIES } from "../src/index.js";

const strings = (v: unknown): string[] =>
  typeof v === "string" ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === "object" ? Object.values(v).flatMap(strings) : [];

describe("CATEGORY_COPY", () => {
  it("has complete copy for every spec category", () => {
    for (const c of SPEC_CATEGORIES) {
      const copy = CATEGORY_COPY[c];
      expect(strings(copy).every((s) => s.trim().length > 0), c).toBe(true);
      expect(copy.greatWhenExample, c).toHaveLength(3);
      expect(copy.facts.topics, c).toContain("other");
      expect(copy.facts.topics, c).toContain(copy.facts.defaultTopic);
    }
  });

  it("never uses clothing or footwear words for drinks or cannabis (founder: never footwear labels on a wine)", () => {
    const clothing = /\b(shoes?|boots?|sneakers?|fit|fits|sizing|wash|fabric|merino|stylist|clasp|wear|worn|cotton|leather|suede)\b/i;
    for (const c of ["wine", "beer", "spirits", "cannabis"] as const) {
      const hit = strings(CATEGORY_COPY[c]).find((s) => clothing.test(s));
      expect(hit, `${c}: "${hit}"`).toBeUndefined();
    }
  });

  it("keeps today's clothing labels for apparel", () => {
    expect(copyFor("apparel").fields.materials.label).toBe("Materials & construction");
    expect(copyFor("apparel").fields.fit_notes.label).toBe("Fit & feel");
  });

  it("uses the approved labels for cannabis and wine", () => {
    expect(Object.values(copyFor("cannabis").fields).map((f) => f.label)).toEqual(["Grow & cure", "Aroma & flavour", "Storage", "Packaging"]);
    expect(Object.values(copyFor("wine").fields).map((f) => f.label)).toEqual(["Winemaking", "Tasting notes", "Serving & storage", "Farming"]);
  });

  it("knows every category's fact topics, so a fact keeps a valid topic when the category changes", () => {
    for (const c of SPEC_CATEGORIES) for (const t of CATEGORY_COPY[c].facts.topics) expect(ALL_FACT_TOPICS).toContain(t);
    expect(new Set(ALL_FACT_TOPICS).size).toBe(ALL_FACT_TOPICS.length);
  });
});
