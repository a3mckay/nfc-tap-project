// PRD v4 §7 Step 15f: grouping questions into themes right after they're saved
// (docs/PRD-ai-assistant.md D8, D25).
import { describe, it, expect, vi } from "vitest";
import { groupProductQuestions, STOCK_THEME, type GroupDeps } from "@/ask/group.js";

const deps = (over: Partial<GroupDeps> = {}): GroupDeps => ({
  getUngrouped: vi.fn(async () => [
    { id: "q1", question_text: "Does it run small?", sources: [] },
    { id: "q2", question_text: "Do you have a 10?", sources: [{ kind: "stock_reply" }] },
    { id: "q3", question_text: "Is it waterproof?", sources: [] },
  ]),
  getOptions: vi.fn(async () => ({
    productThemes: [{ id: "t1", label: "Does it run small?", kind: "fit", storeTheme: "Sizing" }],
    storeThemes: [{ id: "s1", label: "Sizing", kind: "fit" }],
  })),
  apply: vi.fn(async () => {}),
  classify: vi.fn(async () => ({
    assignments: [
      { question_id: "q1", theme_id: "t1", new_theme: null },
      { question_id: "q2", theme_id: null, new_theme: { label: "Size 10 in stock?", kind: "sizing", store_theme: "Sizing" } },
      { question_id: "q3", theme_id: null, new_theme: { label: "Is it waterproof?", kind: "features", store_theme: "Weather" } },
      { question_id: "q-unknown", theme_id: "t1", new_theme: null },
      { question_id: "q3", theme_id: "t-not-ours", new_theme: null },
    ],
  })),
  ...over,
});

describe("groupProductQuestions", () => {
  it("assigns questions to existing or new themes, ignoring unknown questions and themes", async () => {
    const d = deps();
    expect(await groupProductQuestions("store-1", "p-1", "Weekend Chukka", d)).toBe(3);
    expect(d.apply).toHaveBeenCalledWith("store-1", "p-1", [
      { questionId: "q1", themeId: "t1" },
      { questionId: "q2", newTheme: { label: STOCK_THEME.label, kind: "stock", storeTheme: STOCK_THEME.storeTheme } },
      { questionId: "q3", newTheme: { label: "Is it waterproof?", kind: "features", storeTheme: "Weather" } },
    ]);
  });

  it("sends the model the questions and the existing themes", async () => {
    const d = deps();
    await groupProductQuestions("store-1", "p-1", "Weekend Chukka", d);
    expect(d.classify).toHaveBeenCalledWith(expect.objectContaining({
      productTitle: "Weekend Chukka",
      productThemes: [{ id: "t1", label: "Does it run small?", storeTheme: "Sizing" }],
      storeThemes: ["Sizing"],
      questions: [{ id: "q1", text: "Does it run small?" }, { id: "q2", text: "Do you have a 10?" }, { id: "q3", text: "Is it waterproof?" }],
    }));
  });

  it("does nothing when everything is already grouped", async () => {
    const d = deps({ getUngrouped: vi.fn(async () => []) });
    expect(await groupProductQuestions("store-1", "p-1", "Weekend Chukka", d)).toBe(0);
    expect(d.classify).not.toHaveBeenCalled();
  });
});
