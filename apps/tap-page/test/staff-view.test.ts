// PRD v4 §7 Step 13d: what a signed-in staff member or owner sees on tap.
import { describe, it, expect } from "vitest";
import { decideTapView, trainingSections, stockNoteAge } from "../src/staff-view.js";

const staff = { kind: "staff", staffId: "st-1", storeId: "store-1" } as const;
const owner = { kind: "owner", storeAdminId: "a-1", storeId: "store-1" } as const;

describe("decideTapView", () => {
  it("shows customers the customer page", () => {
    expect(decideTapView(null, "store-1", undefined)).toBe("customer");
  });

  it("shows the training view by default to staff and owners of the tag's store", () => {
    expect(decideTapView(staff, "store-1", undefined)).toBe("training");
    expect(decideTapView(owner, "store-1", undefined)).toBe("training");
  });

  it("shows a customer preview when they switch with ?view=customer", () => {
    expect(decideTapView(staff, "store-1", "customer")).toBe("preview");
  });

  it("treats staff from another store as a customer", () => {
    expect(decideTapView(staff, "store-2", undefined)).toBe("customer");
    expect(decideTapView(staff, "store-2", "customer")).toBe("customer");
  });
});

const emptyTraining = {
  one_line_sell: null, who_its_for: null, who_its_not_for: null, fit_and_sizing: null,
  worth_the_price: [], closest_alternative: null, common_questions: [],
  companion_products: null, brand_context: null, stock_note: null, stock_note_updated_at: null,
};
const enrichment = {
  fit_notes: "True to size", materials: "Mesh upper", faq: [{ question: "Waterproof?", answer: "No." }],
  internal_staff_notes: null as string | null,
};

describe("trainingSections", () => {
  it("lists the owner's notes in the order they're written, skipping empty fields", () => {
    const { sections, hasOwnerNotes } = trainingSections({
      ...emptyTraining,
      one_line_sell: "The one pair that does everything.",
      who_its_not_for: "Wide feet",
      worth_the_price: ["Lasts years", "Resoleable"],
      common_questions: [{ question: "Does it crease?", answer: "Yes, normal." }],
      stock_note: "Size 9 is display only",
    }, enrichment);
    expect(hasOwnerNotes).toBe(true);
    expect(sections.map((s) => s.title)).toEqual([
      "The one-line sell", "Who it's not for", "Why it's worth the price", "Common questions", "Stock note",
    ]);
    expect(sections[2]).toMatchObject({ kind: "list", items: ["Lasts years", "Resoleable"] });
    expect(sections[3]).toMatchObject({ kind: "qa", items: [{ question: "Does it crease?", answer: "Yes, normal." }] });
  });

  it("adds the owner's internal notes at the end", () => {
    const { sections } = trainingSections({ ...emptyTraining, one_line_sell: "x" }, { ...enrichment, internal_staff_notes: "Fragile clasp" });
    expect(sections.at(-1)).toMatchObject({ title: "Internal notes", kind: "text", text: "Fragile clasp" });
  });

  it("falls back to the customer page's fit, materials and FAQ when there are no notes yet", () => {
    for (const training of [null, emptyTraining]) {
      const { sections, hasOwnerNotes } = trainingSections(training, enrichment);
      expect(hasOwnerNotes).toBe(false);
      expect(sections.map((s) => s.title)).toEqual(["Fit", "Materials", "Common questions"]);
    }
  });

  it("returns nothing to show when there's no content at all", () => {
    expect(trainingSections(null, null)).toEqual({ sections: [], hasOwnerNotes: false });
  });
});

describe("stockNoteAge", () => {
  const now = new Date("2026-09-29T12:00:00Z");
  it("says how long ago the stock note changed", () => {
    expect(stockNoteAge(new Date("2026-09-29T08:00:00Z"), now)).toBe("updated today");
    expect(stockNoteAge(new Date("2026-09-28T08:00:00Z"), now)).toBe("updated yesterday");
    expect(stockNoteAge(new Date("2026-09-19T12:00:00Z"), now)).toBe("updated 10 days ago");
    expect(stockNoteAge(null, now)).toBeNull();
  });
});
