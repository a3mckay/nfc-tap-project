// Photo upload (founder, 2026-11-16): the tap page serves uploaded product photos.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ getPool: vi.fn(() => ({})), getUploadedImage: vi.fn() }));
vi.mock("@nfc/db", () => db);

const { GET } = await import("../app/img/[id]/route.js");
const get = (id: string) => GET(new NextRequest(new URL(`/img/${id}`, "https://tapshelf.test")), { params: Promise.resolve({ id }) });

beforeEach(() => vi.clearAllMocks());

describe("GET /img/[id]", () => {
  it("serves the photo with its type, cached for a year (an id never changes its bytes)", async () => {
    db.getUploadedImage.mockResolvedValue({ contentType: "image/jpeg", bytes: Buffer.from([0xff, 0xd8, 0xff]) });
    const res = await get("img-1");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xd8, 0xff]));
  });

  it("returns 404 for an unknown photo", async () => {
    db.getUploadedImage.mockResolvedValue(null);
    expect((await get("nope")).status).toBe(404);
  });
});
