// PRD v4 §7 Step 15g: answering, dismissing and promoting from the Questions tab.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  answerQuestions: vi.fn(async () => ({ id: "a-1", question: "Q", answer: "A" })),
  dismissQuestion: vi.fn(async () => true),
  retireAnswer: vi.fn(async () => true),
  addAnswerToFaq: vi.fn(async () => true),
  addAnswerToTraining: vi.fn(async () => true),
}));
const getActionStore = vi.hoisted(() => vi.fn());
const getCurrentAdminSession = vi.hoisted(() => vi.fn());
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore, getCurrentAdminSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { answerAction, dismissQuestionAction, retireAnswerAction, promoteAction } = await import("../app/questions/actions.js");

const store = { id: "store-1" };
beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue(store);
  getCurrentAdminSession.mockResolvedValue({ role: "manager", level: "co_manager", staffId: "st-9", storeId: "store-1", storeDomain: "d", exp: Date.now() + 1e6 });
});

describe("Questions tab actions", () => {
  it("need the questions permission", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await answerAction("shop", "p-1", { themeId: "t-1", questionId: null, question: "Q", answer: "A" })).toEqual({ error: "Not allowed" });
    expect(await dismissQuestionAction("shop", "p-1", "q-1")).toEqual({ error: "Not allowed" });
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "shop", "questions");
    expect(db.answerQuestions).not.toHaveBeenCalled();
  });

  it("records who answered: a co-manager here", async () => {
    expect(await answerAction("shop", "p-1", { themeId: "t-1", questionId: null, question: " Q ", answer: " A " })).toEqual({});
    expect(db.answerQuestions).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", {
      themeId: "t-1", questionId: null, question: "Q", answer: "A", author: { role: "co_manager", staffId: "st-9" },
    });
  });

  it("records an owner as the owner", async () => {
    getCurrentAdminSession.mockResolvedValue({ role: "store", storeId: "store-1", storeDomain: "d" });
    await answerAction("shop", "p-1", { themeId: null, questionId: "q-1", question: "Q", answer: "A" });
    expect(db.answerQuestions).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", expect.objectContaining({ author: { role: "owner", staffId: null } }));
  });

  it("needs both a question and an answer", async () => {
    expect(await answerAction("shop", "p-1", { themeId: null, questionId: null, question: "Q", answer: "  " })).toEqual({ error: "Write an answer first" });
  });

  it("dismisses, retires and promotes in the acting store", async () => {
    expect(await dismissQuestionAction("shop", "p-1", "q-1")).toEqual({});
    expect(db.dismissQuestion).toHaveBeenCalledWith(expect.anything(), "store-1", "q-1");
    expect(await retireAnswerAction("shop", "p-1", "a-1")).toEqual({});
    expect(db.retireAnswer).toHaveBeenCalledWith(expect.anything(), "store-1", "a-1");
    expect(await promoteAction("shop", "p-1", "faq", "Q", "A")).toEqual({});
    expect(db.addAnswerToFaq).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", "Q", "A");
    expect(await promoteAction("shop", "p-1", "training", "Q", "A")).toEqual({});
    expect(db.addAnswerToTraining).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", "Q", "A");
  });
});
