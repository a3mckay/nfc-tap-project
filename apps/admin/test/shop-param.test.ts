import { describe, it, expect } from "vitest";
import { pinShopParam } from "../src/shop-param.js";

const OWN = "own.myshopify.com";

describe("pinShopParam", () => {
  it("leaves a URL with no ?shop= alone", () => {
    expect(pinShopParam(new URL("https://admin.test/tags"), OWN)).toBeNull();
  });

  it("leaves a URL already pinned to the admin's own shop alone", () => {
    expect(pinShopParam(new URL(`https://admin.test/tags?shop=${OWN}`), OWN)).toBeNull();
  });

  it("rewrites another store's shop to the admin's own, keeping path and other params", () => {
    const pinned = pinShopParam(
      new URL("https://admin.test/tags/export?shop=other.myshopify.com&sort=status"),
      OWN,
    );
    expect(pinned?.pathname).toBe("/tags/export");
    expect(pinned?.searchParams.getAll("shop")).toEqual([OWN]);
    expect(pinned?.searchParams.get("sort")).toBe("status");
  });

  it("collapses a repeated ?shop= that smuggles in another store", () => {
    const pinned = pinShopParam(
      new URL(`https://admin.test/settings?shop=${OWN}&shop=other.myshopify.com`),
      OWN,
    );
    expect(pinned?.searchParams.getAll("shop")).toEqual([OWN]);
  });

  it("does not mutate the URL it was given", () => {
    const url = new URL("https://admin.test/tags?shop=other.myshopify.com");
    pinShopParam(url, OWN);
    expect(url.searchParams.get("shop")).toBe("other.myshopify.com");
  });
});
