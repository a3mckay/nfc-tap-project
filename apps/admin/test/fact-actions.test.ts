// PRD v4 §7 Step 15b: owners, managers and co-managers ("content" permission)
// can correct the research fact sheet and the brand's website.
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getProductById: vi.fn(),
  updateFact: vi.fn(async () => true),
  addOwnerFact: vi.fn(async () => true),
  deleteFact: vi.fn(async () => true),
  setBrandWebsite: vi.fn(async () => {}),
}));
const getActionStore = vi.hoisted(() => vi.fn());
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { updateFactAction, addFactAction, deleteFactAction, setBrandWebsiteAction } =
  await import("../app/enrichment/[product_id]/factActions.js");

const store = { id: "store-1", shopify_shop_domain: "own.myshopify.com" };

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue(store);
  db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-1", vendor: "Northfield" });
});

describe("fact sheet actions", () => {
  it("need the content permission", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await updateFactAction("own.myshopify.com", "p-1", "f-1", "care", "Brush it")).toEqual({ error: "Not allowed" });
    expect(await addFactAction("own.myshopify.com", "p-1", "fit", "Runs large")).toEqual({ error: "Not allowed" });
    expect(await deleteFactAction("own.myshopify.com", "p-1", "f-1")).toEqual({ error: "Not allowed" });
    expect(await setBrandWebsiteAction("own.myshopify.com", "p-1", "northfield.com")).toEqual({ error: "Not allowed" });
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "own.myshopify.com", "content");
    expect(db.updateFact).not.toHaveBeenCalled();
  });

  it("edits, adds and deletes facts in the acting store only", async () => {
    expect(await updateFactAction("own.myshopify.com", "p-1", "f-1", "care", "  Brush it  ")).toEqual({});
    expect(db.updateFact).toHaveBeenCalledWith(expect.anything(), "store-1", "f-1", { topic: "care", fact: "Brush it" });
    expect(await addFactAction("own.myshopify.com", "p-1", "fit", "Runs large")).toEqual({});
    expect(db.addOwnerFact).toHaveBeenCalledWith(expect.anything(), "store-1", "p-1", { topic: "fit", fact: "Runs large" });
    expect(await deleteFactAction("own.myshopify.com", "p-1", "f-1")).toEqual({});
    expect(db.deleteFact).toHaveBeenCalledWith(expect.anything(), "store-1", "f-1");
  });

  it("rejects empty facts and unknown topics", async () => {
    expect(await addFactAction("own.myshopify.com", "p-1", "fit", "   ")).toEqual({ error: "Write the fact first" });
    expect(await addFactAction("own.myshopify.com", "p-1", "vibes", "x")).toEqual({ error: "Unknown topic" });
    expect(db.addOwnerFact).not.toHaveBeenCalled();
  });

  it("reports a fact that isn't this store's", async () => {
    db.updateFact.mockResolvedValueOnce(false);
    expect(await updateFactAction("own.myshopify.com", "p-1", "f-x", "care", "x")).toEqual({ error: "Fact not found" });
  });
});

describe("setBrandWebsiteAction", () => {
  it("saves a confirmed website for the product's brand, normalized to https", async () => {
    expect(await setBrandWebsiteAction("own.myshopify.com", "p-1", " www.Northfield.com/shop ")).toEqual({});
    expect(db.setBrandWebsite).toHaveBeenCalledWith(expect.anything(), "store-1", "Northfield", "https://northfield.com", true);
  });

  it("rejects something that isn't a website, and products without a brand", async () => {
    expect(await setBrandWebsiteAction("own.myshopify.com", "p-1", "not a site")).toEqual({ error: "Enter a website like northfield.com" });
    db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-1", vendor: null });
    expect(await setBrandWebsiteAction("own.myshopify.com", "p-1", "northfield.com")).toEqual({ error: "This product has no brand" });
    expect(db.setBrandWebsite).not.toHaveBeenCalled();
  });

  it("won't act on another store's product", async () => {
    db.getProductById.mockResolvedValue({ id: "p-1", store_id: "store-2", vendor: "Northfield" });
    expect(await setBrandWebsiteAction("own.myshopify.com", "p-1", "northfield.com")).toEqual({ error: "Product not found" });
  });
});
