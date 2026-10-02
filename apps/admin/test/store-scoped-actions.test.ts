// Server actions that write by row ID must act on the store resolved from the
// verified session (getActionStore), never on IDs alone (PRD v4 §12).
import { describe, it, expect, vi, beforeEach } from "vitest";

const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  assignTagToProduct: vi.fn(async () => true),
  setTagStatus: vi.fn(async () => true),
  setReviewStatus: vi.fn(async () => {}),
  setAwardStatus: vi.fn(async () => {}),
  getProductById: vi.fn(),
  getPendingReviewsByProduct: vi.fn(async () => []),
  getPendingAwardsByProduct: vi.fn(async () => []),
}));
const getActionStore = vi.hoisted(() => vi.fn());
const runPublicReviewsForProduct = vi.hoisted(() => vi.fn());

vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../lib/public-reviews/run.js", () => ({ runPublicReviewsForProduct }));

const { assignTagAction, setTagStatusAction } = await import("../app/tags/[tag_id]/actions.js");
const { setReviewStatusAction, setAwardStatusAction } = await import("../app/reviews/pending/actions.js");
const { runPublicSearchForProductAction } = await import("../app/reviews/public/actions.js");
const { approveItemAction, rejectItemAction, getPendingItemsForProductAction } =
  await import("../app/enrichment/[product_id]/reviewActions.js");

const SHOP = "own.myshopify.com";
const store = { id: "store-own", shopify_shop_domain: SHOP };
const ownProduct = { id: "prod-own", store_id: "store-own", title: "Boot", vendor: "Acme" };
const otherProduct = { id: "prod-other", store_id: "store-other", title: "Shoe", vendor: "Acme" };

beforeEach(() => {
  vi.clearAllMocks();
  getActionStore.mockResolvedValue(store);
  db.assignTagToProduct.mockResolvedValue(true);
  db.setTagStatus.mockResolvedValue(true);
});

describe("tag actions", () => {
  it("assignTagAction scopes the write to the session's store", async () => {
    expect(await assignTagAction(SHOP, "tag-1", "prod-own")).toEqual({});
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), SHOP, "catalog");
    expect(db.assignTagToProduct).toHaveBeenCalledWith(expect.anything(), "tag-1", "store-own", "prod-own");
  });

  it("assignTagAction reports when the tag or product isn't the store's", async () => {
    db.assignTagToProduct.mockResolvedValue(false);
    expect(await assignTagAction(SHOP, "tag-x", "prod-other")).toEqual({ error: "Tag or product not found" });
  });

  it("assignTagAction does nothing without a store", async () => {
    getActionStore.mockResolvedValue(null);
    expect(await assignTagAction(SHOP, "tag-1", "prod-own")).toEqual({ error: "Store not found" });
    expect(db.assignTagToProduct).not.toHaveBeenCalled();
  });

  it("setTagStatusAction scopes the write to the session's store", async () => {
    expect(await setTagStatusAction(SHOP, "tag-1", "disabled")).toEqual({});
    expect(db.setTagStatus).toHaveBeenCalledWith(expect.anything(), "tag-1", "store-own", "disabled");
  });

  it("setTagStatusAction reports when the tag isn't the store's", async () => {
    db.setTagStatus.mockResolvedValue(false);
    expect(await setTagStatusAction(SHOP, "tag-x", "disabled")).toEqual({ error: "Tag not found" });
  });
});

describe("pending review/award actions", () => {
  it("setReviewStatusAction resolves the store and scopes the write", async () => {
    await setReviewStatusAction(SHOP, "rev-1", "approved");
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), SHOP, "content");
    expect(db.setReviewStatus).toHaveBeenCalledWith(expect.anything(), "rev-1", "store-own", "approved");
  });

  it("setAwardStatusAction resolves the store and scopes the write", async () => {
    await setAwardStatusAction(SHOP, "aw-1", "rejected");
    expect(db.setAwardStatus).toHaveBeenCalledWith(expect.anything(), "aw-1", "store-own", "rejected");
  });

  it("does nothing without a store", async () => {
    getActionStore.mockResolvedValue(null);
    await setReviewStatusAction(SHOP, "rev-1", "approved");
    await setAwardStatusAction(SHOP, "aw-1", "approved");
    expect(db.setReviewStatus).not.toHaveBeenCalled();
    expect(db.setAwardStatus).not.toHaveBeenCalled();
  });
});

describe("enrichment page review actions", () => {
  it("approveItemAction scopes review and award writes to the session's store", async () => {
    await approveItemAction(SHOP, "rev-1", "review");
    await approveItemAction(SHOP, "aw-1", "award");
    expect(db.setReviewStatus).toHaveBeenCalledWith(expect.anything(), "rev-1", "store-own", "approved");
    expect(db.setAwardStatus).toHaveBeenCalledWith(expect.anything(), "aw-1", "store-own", "approved");
  });

  it("rejectItemAction scopes the write to the session's store", async () => {
    await rejectItemAction(SHOP, "rev-1", "review");
    expect(db.setReviewStatus).toHaveBeenCalledWith(expect.anything(), "rev-1", "store-own", "rejected");
  });

  it("approve/reject do nothing without a store", async () => {
    getActionStore.mockResolvedValue(null);
    await approveItemAction(SHOP, "rev-1", "review");
    await rejectItemAction(SHOP, "aw-1", "award");
    expect(db.setReviewStatus).not.toHaveBeenCalled();
    expect(db.setAwardStatus).not.toHaveBeenCalled();
  });

  it("getPendingItemsForProductAction lists the store's own product", async () => {
    db.getProductById.mockResolvedValue(ownProduct);
    await getPendingItemsForProductAction(SHOP, "prod-own");
    expect(db.getPendingReviewsByProduct).toHaveBeenCalledWith(expect.anything(), "prod-own");
  });

  it("getPendingItemsForProductAction returns nothing for another store's product", async () => {
    db.getProductById.mockResolvedValue(otherProduct);
    expect(await getPendingItemsForProductAction(SHOP, "prod-other")).toEqual({ items: [] });
    expect(db.getPendingReviewsByProduct).not.toHaveBeenCalled();
    expect(db.getPendingAwardsByProduct).not.toHaveBeenCalled();
  });
});

describe("runPublicSearchForProductAction", () => {
  it("runs the search for the store's own product", async () => {
    db.getProductById.mockResolvedValue(ownProduct);
    runPublicReviewsForProduct.mockResolvedValue({ items_extracted: 2, items_stored: 1 });
    expect(await runPublicSearchForProductAction(SHOP, "prod-own")).toEqual({ items_found: 2, items_stored: 1 });
    expect(runPublicReviewsForProduct).toHaveBeenCalledWith(expect.anything(), "store-own", "prod-own", "Boot", "Acme");
  });

  it("refuses another store's product as if it didn't exist", async () => {
    db.getProductById.mockResolvedValue(otherProduct);
    expect(await runPublicSearchForProductAction(SHOP, "prod-other")).toEqual({
      items_found: 0, items_stored: 0, error: "Product not found",
    });
    expect(runPublicReviewsForProduct).not.toHaveBeenCalled();
  });
});
