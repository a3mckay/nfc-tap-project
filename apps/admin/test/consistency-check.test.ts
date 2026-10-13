// PRD v4 §7 Step 15k: finding contradictions between a product's customer copy,
// staff training notes and research facts (docs/PRD-ai-assistant.md D49).
import { describe, it, expect, vi } from "vitest";
import { describeProductNotes, runConsistencyCheck } from "../src/lib/consistency-check.js";

const notes = {
  title: "Air Force 1",
  productType: "Shoe",
  customer: { fit_notes: "Runs true to size; half a size up if between sizes.", materials: "Full-grain leather", backstory: null, care_instructions: null, great_when: [] as string[], faq: [] },
  training: { fit_and_sizing: "Fits larger than its size, wider.", who_its_for: null, who_its_not_for: null, closest_alternative: null, common_questions: [] },
  facts: [{ topic: "materials", fact: "Synthetic leather upper" }],
};

describe("describeProductNotes", () => {
  it("labels where each note comes from and leaves out empty fields", () => {
    const text = describeProductNotes(notes);
    expect(text).toContain("Customer copy – fit notes: Runs true to size");
    expect(text).toContain("Staff training – fit and sizing: Fits larger");
    expect(text).toContain("Research fact (materials): Synthetic leather upper");
    expect(text).not.toContain("backstory");
  });

  it("names the notes in the product's category's words (e.g. a wine's), so its findings do too", () => {
    const text = describeProductNotes({
      ...notes,
      labels: { fit: "Tasting notes", materials: "Winemaking", care: "Serving & storage", truth: "Style and serving truth" },
    });
    expect(text).toContain("Customer copy – tasting notes: Runs true to size");
    expect(text).toContain("Customer copy – winemaking: Full-grain leather");
    expect(text).toContain("Staff training – style and serving truth: Fits larger");
    expect(text).not.toMatch(/fit notes|fit and sizing/);
  });
});

describe("runConsistencyCheck", () => {
  it("saves what the model finds as contradiction flags", async () => {
    const save = vi.fn(async () => {});
    const model = vi.fn(async () => ["Fit notes say true to size; staff training says it fits larger."]);
    await runConsistencyCheck(notes, { model, save });
    expect(model).toHaveBeenCalledWith(expect.stringContaining("Air Force 1"));
    expect(save).toHaveBeenCalledWith(["Fit notes say true to size; staff training says it fits larger."]);
  });

  it("clears old flags when there's too little to compare, without calling the model", async () => {
    const save = vi.fn(async () => {});
    const model = vi.fn(async () => []);
    await runConsistencyCheck({ ...notes, customer: { ...notes.customer, fit_notes: null, materials: null }, training: null, facts: [] }, { model, save });
    expect(model).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledWith([]);
  });

  it("keeps the old flags if the model fails", async () => {
    const save = vi.fn(async () => {});
    await runConsistencyCheck(notes, { model: vi.fn(async () => { throw new Error("down"); }), save });
    expect(save).not.toHaveBeenCalled();
  });
});
