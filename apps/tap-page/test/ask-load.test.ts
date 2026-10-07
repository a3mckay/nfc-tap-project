// PRD v4 §7 Step 15c: what the customer-facing assistant is given. Internal
// staff notes never reach it; only live tags are answerable.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getTagByUuid: vi.fn(),
  getProductById: vi.fn(),
  getStoreById: vi.fn(),
  getEnrichmentByProductId: vi.fn(),
  getProductTraining: vi.fn(),
  getProductFacts: vi.fn(async () => [{ topic: "origin", fact: "Made in Portugal", source_kind: "brand" }]),
  getActiveAnswers: vi.fn(async () => [
    { id: "a1", product_id: "p-1", question: "Made in Canada?", answer: "No, Portugal." },
    { id: "a2", product_id: null, question: "Returns?", answer: "30 days." },
  ]),
  getApprovedReviewsByProduct: vi.fn(async () => [{ rating: "4.0", body: "Comfy" }]),
  getStorePolicies: vi.fn(async () => [{ key: "returns", label: "Returns and exchanges", text: "30 days." }]),
  getProductSpecs: vi.fn(async () => [{ key: "thc", value: "22%", source_url: null, source_kind: "owner", owner_edited: true }]),
  specCategoryFor: vi.fn(() => "footwear"),
  specFieldsFor: vi.fn(() => [{ key: "thc", label: "THC", hint: "" }, { key: "cbd", label: "CBD", hint: "" }]),
  getRecentQuestions: vi.fn(async () => [{ question_text: "Does it run small?", answer_text: "True to size." }]),
}));
vi.mock("@nfc/db", async (importOriginal) => ({ copyFor: (await importOriginal<typeof import("@nfc/db")>()).copyFor, ...db }));

const { loadAnswerContext } = await import("@/ask/load.js");

beforeEach(() => {
  vi.clearAllMocks();
  db.getTagByUuid.mockResolvedValue({ id: "t-1", store_id: "s-1", tag_uuid: "u", product_id: "p-1", status: "active" });
  db.getProductById.mockResolvedValue({
    id: "p-1", store_id: "s-1", title: "Weekend Chukka", vendor: "Northfield", product_type: "Boots",
    description_html: "<p>Suede <b>chukka</b></p>", variants: [{ title: "9 / Brown", price: "245.00" }, { title: "10 / Brown" }],
  });
  db.getStoreById.mockResolvedValue({ id: "s-1", name: "Queen West Shoes", shopify_shop_domain: "q.myshopify.com" });
  db.getEnrichmentByProductId.mockResolvedValue({
    great_when: ["you need one boot"], reasons_to_buy: [], backstory: null, materials: "Suede", fit_notes: null,
    care_instructions: null, sustainability_notes: null, faq: [], reviews: [{ author: "A", text: "Great", rating: 5, source: "manual" }],
    internal_staff_notes: "SECRET: margin is 60%",
  });
  db.getProductTraining.mockResolvedValue({
    who_its_for: "Smart-casual", who_its_not_for: null, fit_and_sizing: null, closest_alternative: null,
    worth_the_price: ["Resoleable"], companion_products: null, common_questions: [], stock_note: "SECRET stock note",
  });
});

describe("loadAnswerContext", () => {
  it("maps the product's data, answers, facts and reviews", async () => {
    const loaded = await loadAnswerContext({} as never, "u");
    expect(loaded).toMatchObject({ storeId: "s-1", productId: "p-1", tagId: "t-1" });
    expect(loaded!.context.storeName).toBe("Queen West Shoes");
    expect(loaded!.context.product).toEqual({
      title: "Weekend Chukka", vendor: "Northfield", productType: "Boots",
      description: "Suede chukka Price: $245.00", variants: ["9 / Brown", "10 / Brown"], specs: [{ label: "THC", value: "22%" }],
    });
    expect(loaded!.context.answers.map((a) => a.scope)).toEqual(["product", "store"]);
    expect(loaded!.context.enrichment?.aiDraft).toBe(false);
    expect(loaded!.context.policies).toEqual([{ label: "Returns and exchanges", text: "30 days." }]);
    expect(loaded!.context.reviews).toEqual([{ rating: 4, text: "Comfy" }, { rating: 5, text: "Great" }]);
  });

  it("gives no reviews for cannabis products, and marks their category (Cannabis Act: no testimonials)", async () => {
    db.specCategoryFor.mockReturnValueOnce("cannabis");
    const loaded = await loadAnswerContext({} as never, "u");
    expect(loaded!.context.category).toBe("cannabis");
    expect(loaded!.context.reviews).toEqual([]);
  });

  it("gives the assistant the category's labels", async () => {
    db.specCategoryFor.mockReturnValueOnce("wine");
    const loaded = await loadAnswerContext({} as never, "u");
    expect(loaded!.context.labels).toEqual({ materials: "Winemaking", fit: "Tasting notes", care: "Serving & storage", sustainability: "Farming", truth: "Style and serving truth" });
  });

  it("never includes internal staff notes or the stock note", async () => {
    expect(JSON.stringify(await loadAnswerContext({} as never, "u"))).not.toContain("SECRET");
  });

  it("adds internal notes and recent questions for staff only", async () => {
    const staff = await loadAnswerContext({} as never, "u", "staff");
    expect(staff!.context.staff).toEqual({ internalNotes: "SECRET: margin is 60%", recentQuestions: [{ question: "Does it run small?", answer: "True to size." }] });
    expect((await loadAnswerContext({} as never, "u"))!.context.staff).toBeUndefined();
  });

  it("returns null for tags that aren't live", async () => {
    db.getTagByUuid.mockResolvedValue({ id: "t-1", store_id: "s-1", tag_uuid: "u", product_id: null, status: "unassigned" });
    expect(await loadAnswerContext({} as never, "u")).toBeNull();
  });
});
