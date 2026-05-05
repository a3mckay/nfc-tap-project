/**
 * Source of truth: PRD §7.2 (core tables) + §13.6 (data-intelligence tables and column additions).
 * If the PRD changes, this file changes; migrations follow.
 */

export type ColumnType =
  | "uuid"
  | "text"
  | "varchar"
  | "boolean"
  | "integer"
  | "bigint"
  | "numeric"
  | "json"
  | "date"
  | "timestamp"
  | "double";

export interface ColumnSpec {
  name: string;
  type: ColumnType;
  nullable?: boolean;
}

export interface TableSpec {
  name: string;
  columns: ColumnSpec[];
}

export const SCHEMA_SPEC: TableSpec[] = [
  {
    name: "stores",
    columns: [
      { name: "id", type: "uuid" },
      { name: "shopify_shop_domain", type: "text" },
      { name: "shopify_access_token", type: "text" },
      { name: "theme_settings", type: "json" },
      { name: "created_at", type: "timestamp" },
      { name: "data_sharing_opted_in", type: "boolean" },
      { name: "store_city", type: "text", nullable: true },
      { name: "store_neighborhood", type: "text", nullable: true },
      { name: "store_lat", type: "double", nullable: true },
      { name: "store_lng", type: "double", nullable: true },
    ],
  },
  {
    name: "products",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "shopify_product_id", type: "text" },
      { name: "title", type: "text" },
      { name: "description_html", type: "text", nullable: true },
      { name: "vendor", type: "text", nullable: true },
      { name: "product_type", type: "text", nullable: true },
      { name: "images", type: "json" },
      { name: "variants", type: "json" },
      { name: "inventory_quantity", type: "integer" },
      { name: "status", type: "text" },
      { name: "shopify_updated_at", type: "timestamp" },
    ],
  },
  {
    name: "enrichments",
    columns: [
      { name: "id", type: "uuid" },
      { name: "product_id", type: "uuid" },
      { name: "fit_notes", type: "text", nullable: true },
      { name: "materials", type: "text", nullable: true },
      { name: "backstory", type: "text", nullable: true },
      { name: "reasons_to_buy", type: "json" },
      { name: "staff_quote", type: "text", nullable: true },
      { name: "staff_name", type: "text", nullable: true },
      { name: "video_url", type: "text", nullable: true },
      { name: "extra_images", type: "json" },
      { name: "internal_staff_notes", type: "text", nullable: true },
      { name: "ai_generated", type: "boolean" },
      { name: "updated_at", type: "timestamp" },
    ],
  },
  {
    name: "tags",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "tag_uuid", type: "uuid" },
      { name: "product_id", type: "uuid", nullable: true },
      { name: "status", type: "text" },
      { name: "encoded_at", type: "timestamp", nullable: true },
      { name: "shipped_at", type: "timestamp", nullable: true },
      { name: "deployed_at", type: "timestamp", nullable: true },
    ],
  },
  {
    name: "tap_events",
    columns: [
      { name: "id", type: "bigint" },
      { name: "tag_id", type: "uuid" },
      { name: "product_id", type: "uuid", nullable: true },
      { name: "store_id", type: "uuid" },
      { name: "session_id", type: "text" },
      { name: "timestamp", type: "timestamp" },
      { name: "device_type", type: "text", nullable: true },
      { name: "dwell_seconds", type: "integer", nullable: true },
      { name: "canonical_product_id", type: "uuid", nullable: true },
      { name: "brand_id", type: "uuid", nullable: true },
      { name: "price_tier", type: "varchar", nullable: true },
      { name: "enriched_at", type: "timestamp", nullable: true },
    ],
  },
  {
    name: "orders_cache",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "shopify_order_id", type: "text" },
      { name: "line_items", type: "json" },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    name: "brands",
    columns: [
      { name: "id", type: "uuid" },
      { name: "name", type: "text" },
      { name: "slug", type: "text" },
      { name: "category", type: "text", nullable: true },
      { name: "tier", type: "text", nullable: true },
      { name: "website", type: "text", nullable: true },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    name: "canonical_products",
    columns: [
      { name: "id", type: "uuid" },
      { name: "brand_id", type: "uuid" },
      { name: "name_normalized", type: "text" },
      { name: "product_type", type: "text", nullable: true },
      { name: "sku_patterns", type: "json" },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    name: "product_canonical_map",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_product_id", type: "uuid" },
      { name: "canonical_product_id", type: "uuid" },
      { name: "match_method", type: "text" },
      { name: "confidence_score", type: "numeric" },
      { name: "reviewed", type: "boolean" },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    name: "daily_product_taps",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "product_id", type: "uuid" },
      { name: "canonical_product_id", type: "uuid", nullable: true },
      { name: "date", type: "date" },
      { name: "tap_count", type: "integer" },
      { name: "unique_tap_count", type: "integer" },
      { name: "avg_dwell_seconds", type: "numeric" },
      { name: "oos_tap_count", type: "integer" },
    ],
  },
  {
    name: "weekly_brand_taps",
    columns: [
      { name: "id", type: "uuid" },
      { name: "brand_id", type: "uuid" },
      { name: "week_start", type: "date" },
      { name: "network_tap_count", type: "integer" },
      { name: "unique_store_count", type: "integer" },
      { name: "avg_dwell_seconds", type: "numeric" },
    ],
  },
  {
    name: "brand_dashboard_subscriptions",
    columns: [
      { name: "id", type: "uuid" },
      { name: "brand_id", type: "uuid" },
      { name: "brand_name", type: "text" },
      { name: "brand_email", type: "text" },
      { name: "tier", type: "text" },
      { name: "active", type: "boolean" },
      { name: "created_at", type: "timestamp" },
    ],
  },
  {
    name: "data_access_audit",
    columns: [
      { name: "id", type: "uuid" },
      { name: "accessor_type", type: "text" },
      { name: "accessor_id", type: "text", nullable: true },
      { name: "query_description", type: "text" },
      { name: "accessed_at", type: "timestamp" },
    ],
  },
];

const TYPE_TO_PG: Record<ColumnType, string[]> = {
  uuid: ["uuid"],
  text: ["text"],
  varchar: ["character varying", "text"],
  boolean: ["boolean"],
  integer: ["integer"],
  bigint: ["bigint"],
  numeric: ["numeric"],
  json: ["json", "jsonb"],
  date: ["date"],
  timestamp: ["timestamp without time zone", "timestamp with time zone"],
  double: ["double precision", "numeric"],
};

export function pgTypesFor(type: ColumnType): string[] {
  return TYPE_TO_PG[type];
}
