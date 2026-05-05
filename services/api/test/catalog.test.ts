import { describe, expect, it, vi } from "vitest";
import { mapShopifyProduct, paginateProducts } from "../src/shopify/catalog.js";

// A realistic Shopify GraphQL product node.
const makeShopifyProduct = (overrides: Record<string, unknown> = {}) => ({
  id: "gid://shopify/Product/123",
  title: "Air Max 90",
  descriptionHtml: "<p>Classic silhouette.</p>",
  vendor: "Nike",
  productType: "Sneakers",
  status: "ACTIVE",
  updatedAt: "2024-01-15T10:00:00Z",
  images: {
    edges: [
      { node: { url: "https://cdn.shopify.com/img1.jpg", altText: "Side view" } },
    ],
  },
  variants: {
    edges: [
      { node: { id: "gid://shopify/ProductVariant/1", sku: "AM90-BLK-10", price: "149.99", inventoryQuantity: 5 } },
      { node: { id: "gid://shopify/ProductVariant/2", sku: "AM90-BLK-11", price: "149.99", inventoryQuantity: 3 } },
    ],
  },
  ...overrides,
});

describe("mapShopifyProduct", () => {
  it("maps core text fields from Shopify to DB shape", () => {
    const result = mapShopifyProduct(makeShopifyProduct(), "store-uuid");
    expect(result.store_id).toBe("store-uuid");
    expect(result.shopify_product_id).toBe("123"); // numeric id extracted from GID
    expect(result.title).toBe("Air Max 90");
    expect(result.description_html).toBe("<p>Classic silhouette.</p>");
    expect(result.vendor).toBe("Nike");
    expect(result.product_type).toBe("Sneakers");
  });

  it("maps status to lowercase", () => {
    expect(mapShopifyProduct(makeShopifyProduct({ status: "ACTIVE" }), "s").status).toBe("active");
    expect(mapShopifyProduct(makeShopifyProduct({ status: "DRAFT" }), "s").status).toBe("draft");
    expect(mapShopifyProduct(makeShopifyProduct({ status: "ARCHIVED" }), "s").status).toBe("archived");
  });

  it("maps images to array of {url, altText}", () => {
    const result = mapShopifyProduct(makeShopifyProduct(), "s");
    expect(result.images).toEqual([
      { url: "https://cdn.shopify.com/img1.jpg", altText: "Side view" },
    ]);
  });

  it("maps variants to array of {id, sku, price, inventoryQuantity}", () => {
    const result = mapShopifyProduct(makeShopifyProduct(), "s");
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toMatchObject({
      id: "1",
      sku: "AM90-BLK-10",
      price: "149.99",
      inventoryQuantity: 5,
    });
  });

  it("sums variant inventory quantities into inventory_quantity", () => {
    const result = mapShopifyProduct(makeShopifyProduct(), "s");
    expect(result.inventory_quantity).toBe(8); // 5 + 3
  });

  it("treats null inventoryQuantity as 0 when summing", () => {
    const product = makeShopifyProduct({
      variants: {
        edges: [
          { node: { id: "gid://shopify/ProductVariant/1", sku: "X", price: "10.00", inventoryQuantity: null } },
        ],
      },
    });
    expect(mapShopifyProduct(product, "s").inventory_quantity).toBe(0);
  });
});

describe("paginateProducts", () => {
  it("calls the fetcher once and returns all products when there is no next page", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce({
      products: {
        edges: [{ node: makeShopifyProduct() }],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });

    const products = await paginateProducts(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(null); // first page: no cursor
    expect(products).toHaveLength(1);
  });

  it("follows cursors across multiple pages and returns all products", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({
        products: {
          edges: [{ node: makeShopifyProduct({ id: "gid://shopify/Product/1" }) }],
          pageInfo: { hasNextPage: true, endCursor: "cursor_page_1" },
        },
      })
      .mockResolvedValueOnce({
        products: {
          edges: [{ node: makeShopifyProduct({ id: "gid://shopify/Product/2" }) }],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      });

    const products = await paginateProducts(fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(1, null);
    expect(fetcher).toHaveBeenNthCalledWith(2, "cursor_page_1");
    expect(products).toHaveLength(2);
  });
});
