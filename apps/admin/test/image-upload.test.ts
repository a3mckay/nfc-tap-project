// Photo upload (founder, 2026-11-16): an owner, manager or co-manager uploads a
// product photo; the store comes from the verified session ("content"), never ?shop= alone.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getActionStore = vi.hoisted(() => vi.fn());
const db = vi.hoisted(() => ({ getPool: vi.fn(() => ({})), saveUploadedImage: vi.fn() }));
vi.mock("@nfc/db", () => db);
vi.mock("@/current-store.js", () => ({ getActionStore }));

const { POST } = await import("../app/api/images/route.js");
function post(file: Blob | null, shop = "own.myshopify.com") {
  const form = new FormData();
  if (file) form.append("file", file, "photo.jpg");
  return POST(new NextRequest(new URL(`/api/images?shop=${shop}`, "https://admin.test"), { method: "POST", body: form }));
}
const jpeg = () => new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2])], { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TAP_PAGE_CDN_URL = "https://tapshelf.store";
});

describe("POST /api/images", () => {
  it("saves the photo for the session's store and returns its tap-page address", async () => {
    getActionStore.mockResolvedValue({ id: "store-1" });
    db.saveUploadedImage.mockResolvedValue({ ok: true, id: "img-1" });
    const res = await post(jpeg());
    expect(res.status).toBe(200);
    expect(getActionStore).toHaveBeenCalledWith(expect.anything(), "own.myshopify.com", "content");
    expect(db.saveUploadedImage).toHaveBeenCalledWith(expect.anything(), "store-1", expect.any(Buffer));
    expect(await res.json()).toEqual({ url: "https://tapshelf.store/img/img-1" });
  });

  it("refuses a session that may not edit product content", async () => {
    getActionStore.mockResolvedValue(null);
    expect((await post(jpeg())).status).toBe(403);
    expect(db.saveUploadedImage).not.toHaveBeenCalled();
  });

  it("says why a file was refused", async () => {
    getActionStore.mockResolvedValue({ id: "store-1" });
    expect((await post(null)).status).toBe(400);
    db.saveUploadedImage.mockResolvedValue({ ok: false, error: "not_an_image" });
    const res = await post(jpeg());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/JPEG, PNG or WebP/);
  });
});
