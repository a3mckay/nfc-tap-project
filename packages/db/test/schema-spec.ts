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
      // PRD v4 §7 Step 15a: up to 3 problem-first key points ("Great when…")
      { name: "great_when", type: "json", nullable: false },
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
  // PRD v4 §7 Step 13a: staff emails approved by the store admin
  {
    name: "store_staff",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "email", type: "text" },
      { name: "name", type: "text", nullable: true },
      { name: "created_at", type: "timestamp" },
      { name: "revoked_at", type: "timestamp", nullable: true },
      { name: "role", type: "text" },
      { name: "password_hash", type: "text", nullable: true },
    ],
  },
  // PRD v4 §7 Step 13b: single-use staff sign-in links (hash only)
  {
    name: "staff_auth_tokens",
    columns: [
      { name: "token_hash", type: "text" },
      { name: "staff_id", type: "uuid" },
      { name: "purpose", type: "text" },
      { name: "expires_at", type: "timestamp" },
      { name: "used_at", type: "timestamp", nullable: true },
      { name: "created_at", type: "timestamp" },
    ],
  },
  // PRD v4 §7 Step 13e: staff training notes per product (all optional)
  {
    name: "product_training",
    columns: [
      { name: "product_id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "one_line_sell", type: "text", nullable: true },
      { name: "who_its_for", type: "text", nullable: true },
      { name: "who_its_not_for", type: "text", nullable: true },
      { name: "fit_and_sizing", type: "text", nullable: true },
      { name: "closest_alternative", type: "text", nullable: true },
      { name: "companion_products", type: "text", nullable: true },
      { name: "brand_context", type: "text", nullable: true },
      { name: "stock_note", type: "text", nullable: true },
      { name: "stock_note_updated_at", type: "timestamp", nullable: true },
      { name: "updated_at", type: "timestamp" },
    ],
  },
  // PRD v4 §7 Step 13c: single-use handoff from the admin to the tap page
  {
    name: "tap_handoff_tokens",
    columns: [
      { name: "token_hash", type: "text" },
      { name: "store_id", type: "uuid" },
      { name: "staff_id", type: "uuid", nullable: true },
      { name: "store_admin_id", type: "uuid", nullable: true },
      { name: "return_path", type: "text" },
      { name: "expires_at", type: "timestamp" },
      { name: "used_at", type: "timestamp", nullable: true },
      { name: "created_at", type: "timestamp" },
    ],
  },
  // PRD v4 §7 Step 13f: which products each staff member has opened in the training view
  {
    name: "staff_product_views",
    columns: [
      { name: "id", type: "uuid" },
      { name: "staff_id", type: "uuid" },
      { name: "store_id", type: "uuid" },
      { name: "product_id", type: "uuid" },
      { name: "viewed_at", type: "timestamp" },
    ],
  },
  // PRD v4 §7 Step 15a: Shelf-Side AI Assistant (docs/PRD-ai-assistant.md §5)
  {
    name: "product_questions",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid", nullable: false },
      { name: "product_id", type: "uuid", nullable: false },
      { name: "tag_id", type: "uuid", nullable: true },
      { name: "session_id", type: "text", nullable: true },
      { name: "asked_by", type: "text", nullable: false },
      { name: "staff_id", type: "uuid", nullable: true },
      { name: "question_text", type: "text", nullable: false },
      { name: "pii_removed", type: "json", nullable: false },
      { name: "answer_text", type: "text", nullable: true },
      { name: "sources", type: "json", nullable: false },
      { name: "status", type: "text", nullable: false },
      { name: "theme_id", type: "uuid", nullable: true },
      { name: "language", type: "text", nullable: true },
      { name: "created_at", type: "timestamp", nullable: false },
    ],
  },
  {
    name: "question_themes",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid", nullable: false },
      { name: "product_id", type: "uuid", nullable: true },
      { name: "parent_id", type: "uuid", nullable: true },
      { name: "label", type: "text", nullable: false },
      { name: "kind", type: "text", nullable: true },
      { name: "created_at", type: "timestamp", nullable: false },
      { name: "updated_at", type: "timestamp", nullable: false },
    ],
  },
  {
    name: "product_answers",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid", nullable: false },
      { name: "product_id", type: "uuid", nullable: true },
      { name: "theme_id", type: "uuid", nullable: true },
      { name: "question", type: "text", nullable: false },
      { name: "answer", type: "text", nullable: false },
      { name: "author_role", type: "text", nullable: false },
      { name: "author_admin_id", type: "uuid", nullable: true },
      { name: "author_staff_id", type: "uuid", nullable: true },
      { name: "created_at", type: "timestamp", nullable: false },
      { name: "updated_at", type: "timestamp", nullable: false },
      { name: "retired_at", type: "timestamp", nullable: true },
    ],
  },
  {
    name: "product_facts",
    columns: [
      { name: "id", type: "uuid" },
      { name: "store_id", type: "uuid", nullable: false },
      { name: "product_id", type: "uuid", nullable: false },
      { name: "topic", type: "text", nullable: false },
      { name: "fact", type: "text", nullable: false },
      { name: "source_url", type: "text", nullable: true },
      { name: "source_kind", type: "text", nullable: false },
      { name: "owner_edited", type: "boolean", nullable: false },
      { name: "created_at", type: "timestamp", nullable: false },
      { name: "updated_at", type: "timestamp", nullable: false },
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
