import { describe, expect, it } from "vitest";
import { resolveTagState } from "../src/tag-state.js";
import type { Tag } from "../src/tag-state.js";

const baseTag: Tag = {
  id: "tag-uuid-1",
  store_id: "store-uuid-1",
  tag_uuid: "public-uuid-1",
  product_id: "product-uuid-1",
  status: "active",
  encoded_at: new Date(),
  shipped_at: null,
  deployed_at: null,
};

describe("resolveTagState", () => {
  it("returns not-found when tag is null", () => {
    expect(resolveTagState(null)).toEqual({ kind: "not-found" });
  });

  it("returns unassigned when tag status is unassigned", () => {
    const tag = { ...baseTag, status: "unassigned", product_id: null };
    expect(resolveTagState(tag)).toEqual({ kind: "unassigned" });
  });

  it("returns disabled when tag status is disabled", () => {
    const tag = { ...baseTag, status: "disabled" };
    expect(resolveTagState(tag)).toEqual({ kind: "disabled" });
  });

  it("returns oos when tag status is oos", () => {
    const tag = { ...baseTag, status: "oos" };
    expect(resolveTagState(tag)).toEqual({ kind: "oos" });
  });

  it("returns active with ids when tag is active and has a product", () => {
    const result = resolveTagState(baseTag);
    expect(result).toEqual({
      kind: "active",
      tagId: "tag-uuid-1",
      productId: "product-uuid-1",
      storeId: "store-uuid-1",
    });
  });

  it("returns not-found when tag is active but product_id is somehow null", () => {
    // Defensive: active tag with no product is a data inconsistency — treat as not-found.
    const tag = { ...baseTag, status: "active", product_id: null };
    expect(resolveTagState(tag)).toEqual({ kind: "not-found" });
  });
});
