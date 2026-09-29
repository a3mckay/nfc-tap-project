import { describe, it, expect } from "vitest";
import { normalizeTrainingForm, type TrainingFormData } from "../src/training-utils.js";

const blank: TrainingFormData = {
  one_line_sell: "", who_its_for: "", who_its_not_for: "", fit_and_sizing: "",
  worth_the_price: ["", "", ""], closest_alternative: "", common_questions: [],
  companion_products: "", brand_context: "", stock_note: "",
};

describe("normalizeTrainingForm", () => {
  it("turns an empty form into all-empty notes (every field is optional)", () => {
    expect(normalizeTrainingForm(blank)).toEqual({
      one_line_sell: null, who_its_for: null, who_its_not_for: null, fit_and_sizing: null,
      worth_the_price: [], closest_alternative: null, common_questions: [],
      companion_products: null, brand_context: null, stock_note: null,
    });
  });

  it("trims text and treats whitespace-only as empty", () => {
    const out = normalizeTrainingForm({ ...blank, one_line_sell: "  The one pair.  ", brand_context: "   " });
    expect(out.one_line_sell).toBe("The one pair.");
    expect(out.brand_context).toBeNull();
  });

  it("keeps up to 3 non-empty reasons it's worth the price", () => {
    const out = normalizeTrainingForm({ ...blank, worth_the_price: [" Lasts years ", "", "Ages well", "Resale value", "Extra"] });
    expect(out.worth_the_price).toEqual(["Lasts years", "Ages well", "Resale value"]);
  });

  it("keeps up to 5 questions, dropping ones with no question text", () => {
    const qs = [
      { question: " Does it crease? ", answer: " Yes, normal. " },
      { question: "", answer: "orphan answer" },
      ...Array.from({ length: 6 }, (_, i) => ({ question: `Q${i}`, answer: "" })),
    ];
    const out = normalizeTrainingForm({ ...blank, common_questions: qs });
    expect(out.common_questions).toHaveLength(5);
    expect(out.common_questions[0]).toEqual({ question: "Does it crease?", answer: "Yes, normal." });
    expect(out.common_questions.map((q) => q.question)).not.toContain("");
  });
});

describe("fillEmptyFromDraft", () => {
  const draft = {
    one_line_sell: "AI sell", who_its_for: "AI for", who_its_not_for: "", fit_and_sizing: "AI fit",
    worth_the_price: ["AI 1", "AI 2"], closest_alternative: "AI alt",
    common_questions: [{ question: "AI Q", answer: "AI A" }], companion_products: "AI socks", brand_context: "AI brand",
  };

  it("fills only fields the owner left empty and never touches the stock note", async () => {
    const { fillEmptyFromDraft } = await import("../src/training-utils.js");
    const mine = { ...blank, one_line_sell: "Owner's own line", stock_note: "Size 9 display only", worth_the_price: ["Owner reason", "", ""] };
    const out = fillEmptyFromDraft(mine, draft);
    expect(out.one_line_sell).toBe("Owner's own line");
    expect(out.who_its_for).toBe("AI for");
    expect(out.who_its_not_for).toBe("");
    expect(out.worth_the_price).toEqual(["Owner reason", "", ""]);
    expect(out.common_questions).toEqual([{ question: "AI Q", answer: "AI A" }]);
    expect(out.stock_note).toBe("Size 9 display only");
  });

  it("fills reasons when the owner has none, padded to three boxes", async () => {
    const { fillEmptyFromDraft } = await import("../src/training-utils.js");
    expect(fillEmptyFromDraft(blank, draft).worth_the_price).toEqual(["AI 1", "AI 2", ""]);
  });
});
