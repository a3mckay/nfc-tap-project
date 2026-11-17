// Photo upload (founder, 2026-11-16): the browser shrinks a photo to 1600 px on
// its longest side before uploading it.
import { describe, it, expect, vi } from "vitest";
import { targetSize, uploadImage } from "../src/image-upload.js";

describe("targetSize", () => {
  it("shrinks the longest side to 1600 px, keeping the shape", () => {
    expect(targetSize(1500, 2000)).toEqual({ width: 1200, height: 1600 });
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
  });

  it("never enlarges a small photo", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});

describe("uploadImage", () => {
  it("posts the photo for the store and returns its address", async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ url: "https://tapshelf.store/img/1" }), { status: 200 }));
    expect(await uploadImage("own.myshopify.com", new Blob(["x"]), fetchFn)).toEqual({ url: "https://tapshelf.store/img/1" });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/images?shop=own.myshopify.com");
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("passes on the server's reason, or a plain one if the request fails", async () => {
    const refused = vi.fn(async () => new Response(JSON.stringify({ error: "Upload a JPEG, PNG or WebP image." }), { status: 400 }));
    expect(await uploadImage("s", new Blob(["x"]), refused)).toEqual({ error: "Upload a JPEG, PNG or WebP image." });
    const offline = vi.fn(async () => { throw new Error("offline"); });
    expect(await uploadImage("s", new Blob(["x"]), offline)).toEqual({ error: "The upload didn't go through. Check your connection and try again." });
  });
});
