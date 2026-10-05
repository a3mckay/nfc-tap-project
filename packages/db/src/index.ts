export * from "./stores.js";
export * from "./store-admins.js";
export * from "./store-staff.js";
export * from "./staff-auth.js";
export * from "./product-training.js";
export * from "./tap-handoff.js";
export * from "./staff-progress.js";
export * from "./manager-auth.js";
export * from "./pii.js";
export * from "./product-questions.js";
export * from "./product-facts.js";
export * from "./store-policies.js";
export * from "./question-themes.js";
export * from "./question-insights.js";
export * from "./home-summary.js";
export * from "./review-flags.js";
export * from "./spec-templates.js";
export * from "./product-specs.js";
export * from "./reactions.js";
export * from "./products.js";
export * from "./tags.js";
export * from "./tap_events.js";
export * from "./enrichments.js";
export * from "./analytics.js";
export * from "./canonical.js";
export * from "./governance.js";
export * from "./customers.js";
export * from "./auth_tokens.js";
export * from "./reviews.js";
export * from "./awards.js";
export * from "./offers.js";
export * from "./customer_insights.js";
export * from "./notifications.js";
import { Pool, type PoolConfig } from "pg";
export type { Pool, PoolConfig } from "pg";

let pool: Pool | undefined;

export function getPool(config?: PoolConfig): Pool {
  if (!pool) {
    const connectionString = config?.connectionString ?? process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({ connectionString, ...config });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
