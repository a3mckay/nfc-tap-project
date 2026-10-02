// The tag CSV export resolves its store from the verified session and the
// "catalog" permission, like every server action — not from ?shop= alone.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getActionStore = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({
  getPool: vi.fn(() => ({})),
  getTagsByStore: vi.fn(async () => [{ tag_number: 1, tag_uuid: "u-1", product_title: "Boot", status: "active" }]),
}));
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));

const { GET } = await import("../app/tags/export/route.js");
const get = (shop = "own.myshopify.com") => GET(new NextRequest(new URL(`/tags/export?shop=${shop}`, "https://admin.test")));

beforeEach(() => vi.clearAllMocks());

describe("GET /tags/export", () => {
  it("exports the tags of the store the session may manage", async () => {
    getActionStore.mockResolvedValue({ id: "store-1", shopify_shop_domain: "own.myshopify.com" });
    const res = await get();
    expect(res.status).toBe(200);
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "own.myshopify.com", "catalog");
    expect(db.getTagsByStore).toHaveBeenCalledWith(expect.anything(), "store-1");
    expect(await res.text()).toContain("u-1");
  });

  it("refuses when the session may not manage tags (e.g. a removed or co-manager)", async () => {
    getActionStore.mockResolvedValue(null);
    const res = await get();
    expect(res.status).toBe(403);
    expect(db.getTagsByStore).not.toHaveBeenCalled();
  });
});
