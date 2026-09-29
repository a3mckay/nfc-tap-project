// PRD v4 §7 Step 13e: owners write staff training notes; AI drafting is optional.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getProductById: vi.fn(),
  getEnrichmentByProductId: vi.fn(async () => null),
  getProductsWithStatus: vi.fn(async () => []),
  saveProductTraining: vi.fn(async () => true),
}));
const getActionStore = vi.hoisted(() => vi.fn());
const draftTraining = vi.hoisted(() => vi.fn());

vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/training-draft.js", () => ({ draftTraining }));
vi.mock("@anthropic-ai/sdk", () => ({ default: vi.fn() }));

const { saveTrainingAction, draftTrainingAction } = await import("../app/enrichment/[product_id]/trainingActions.js");

const SHOP = "own.myshopify.com";
const ownProduct = { id: "prod-own", store_id: "store-own", title: "Trail Runner", vendor: "Acme", product_type: "Shoes", description_html: "<p>Light</p>" };
const otherProduct = { ...ownProduct, id: "prod-other", store_id: "store-other" };
const form = {
  one_line_sell: " The one pair. ", who_its_for: "", who_its_not_for: "", fit_and_sizing: "",
  worth_the_price: ["", "", ""], closest_alternative: "", common_questions: [],
  companion_products: "", brand_context: "", stock_note: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue({ id: "store-own", shopify_shop_domain: SHOP });
  db.getProductById.mockResolvedValue(ownProduct);
  db.saveProductTraining.mockResolvedValue(true);
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("saveTrainingAction", () => {
  it("saves cleaned-up notes for the session's store", async () => {
    expect(await saveTrainingAction(SHOP, "prod-own", form)).toEqual({});
    expect(db.saveProductTraining).toHaveBeenCalledWith(
      expect.anything(), "store-own", "prod-own",
      expect.objectContaining({ one_line_sell: "The one pair.", who_its_for: null }),
    );
  });

  it("reports when the product isn't the store's", async () => {
    db.saveProductTraining.mockResolvedValue(false);
    expect(await saveTrainingAction(SHOP, "prod-other", form)).toEqual({ error: "Product not found" });
  });

  it("does nothing without a store (e.g. a staff session)", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await saveTrainingAction(SHOP, "prod-own", form)).toEqual({ error: "Store not found" });
    expect(db.saveProductTraining).not.toHaveBeenCalled();
  });
});

describe("draftTrainingAction", () => {
  const draft = {
    one_line_sell: "The one pair that does everything.", who_its_for: "Commuters", who_its_not_for: "Wide feet",
    fit_and_sizing: "", worth_the_price: ["Lasts"], closest_alternative: "", common_questions: [],
    companion_products: "Socks", brand_context: "Family-run.",
  };

  it("returns an AI draft for the owner to edit, without saving it", async () => {
    draftTraining.mockResolvedValue(draft);
    expect(await draftTrainingAction(SHOP, "prod-own")).toEqual({ draft });
    expect(draftTraining).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ title: "Trail Runner", vendor: "Acme" }));
    expect(db.saveProductTraining).not.toHaveBeenCalled();
  });

  it("refuses another store's product", async () => {
    db.getProductById.mockResolvedValue(otherProduct);
    expect(await draftTrainingAction(SHOP, "prod-other")).toEqual({ error: "Product not found" });
    expect(draftTraining).not.toHaveBeenCalled();
  });

  it("explains when AI drafting isn't set up", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(await draftTrainingAction(SHOP, "prod-own")).toEqual({ error: "AI drafting isn't set up (ANTHROPIC_API_KEY is missing)" });
  });

  it("turns a drafting failure into a message", async () => {
    draftTraining.mockRejectedValue(new Error("overloaded"));
    expect(await draftTrainingAction(SHOP, "prod-own")).toEqual({ error: "AI draft failed: overloaded" });
  });
});
