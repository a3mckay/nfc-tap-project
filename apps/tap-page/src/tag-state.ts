export interface Tag {
  id: string;
  store_id: string;
  tag_uuid: string;
  product_id: string | null;
  status: string;
  encoded_at: Date | null;
  shipped_at: Date | null;
  deployed_at: Date | null;
}

export type TagState =
  | { kind: "not-found" }
  | { kind: "unassigned" }
  | { kind: "disabled" }
  | { kind: "oos" }
  | { kind: "active"; tagId: string; productId: string; storeId: string };

export function resolveTagState(tag: Tag | null): TagState {
  if (!tag) return { kind: "not-found" };

  switch (tag.status) {
    case "unassigned":
      return { kind: "unassigned" };
    case "disabled":
      return { kind: "disabled" };
    case "oos":
      return { kind: "oos" };
    case "active":
      if (!tag.product_id) return { kind: "not-found" };
      return {
        kind: "active",
        tagId: tag.id,
        productId: tag.product_id,
        storeId: tag.store_id,
      };
    default:
      return { kind: "not-found" };
  }
}
