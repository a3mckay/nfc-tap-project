// Link previews: a shared tap-page link shows the product, not "Product Detail".
import { describe, it, expect } from "vitest";
import { shareMetadata } from "@/share-meta.js";

const base = {
  title: "Air Force 1",
  vendor: "Nike",
  images: [{ url: "https://cdn.example.com/af1.jpg", altText: null }],
  storeName: "Queen West Shoes",
  greatWhen: [] as string[],
  reasonsToBuy: [] as string[],
};

describe("shareMetadata", () => {
  it("names the product and the store, with the first key point and the product photo", () => {
    const m = shareMetadata({ ...base, greatWhen: ["you want one sneaker for everything", "x"] });
    expect(m.title).toBe("Air Force 1 · Queen West Shoes");
    expect(m.description).toBe("Nike. Great when you want one sneaker for everything.");
    expect(m.openGraph).toMatchObject({
      title: "Air Force 1 · Queen West Shoes",
      description: "Nike. Great when you want one sneaker for everything.",
      siteName: "Queen West Shoes",
      images: ["https://cdn.example.com/af1.jpg"],
    });
    expect(m.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("falls back to the first reason to buy, then to where to find it", () => {
    expect(shareMetadata({ ...base, reasonsToBuy: ["One of the most versatile sneakers ever made."] }).description)
      .toBe("Nike. One of the most versatile sneakers ever made.");
    expect(shareMetadata({ ...base, vendor: null }).description).toBe("See it at Queen West Shoes.");
  });

  it("copes with no photo, no store name and very long text", () => {
    const m = shareMetadata({ ...base, images: [], storeName: "", reasonsToBuy: ["a".repeat(400)] });
    expect(m.title).toBe("Air Force 1");
    expect(m.openGraph?.images).toBeUndefined();
    expect((m.description as string).length).toBeLessThanOrEqual(200);
    expect(m.description).toMatch(/…$/);
  });
});
