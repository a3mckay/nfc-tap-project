import type { Pool } from "pg";

// PRD v4 §7 Step 15j: the store policies customers ask about most
// (docs/PRD-ai-assistant.md D48). Owners and managers fill in the ones that
// apply; the AI assistant answers store-wide questions from them.

export const POLICY_TYPES = [
  { key: "returns", label: "Returns and exchanges", hint: "Time limit, condition (unworn, tags on, unopened), refund or store credit, final-sale items." },
  { key: "warranty", label: "Warranty and repairs", hint: "Who covers defects (you or the brand), for how long, and how to start a claim." },
  { key: "alterations", label: "Alterations and tailoring", hint: "What you alter (hemming, sleeves), cost, and turnaround." },
  { key: "price_match", label: "Price matching", hint: "Whether you match other stores or your own website, and the conditions." },
  { key: "holds", label: "Holds and special orders", hint: "How long you hold an item, and whether you order sizes or colours you don't have." },
  { key: "delivery", label: "Delivery and shipping", hint: "Local delivery, shipping, pickup, costs and timing." },
  { key: "gifts", label: "Gift cards and gift wrap", hint: "Gift cards, gift receipts, wrapping." },
  { key: "id_age", label: "ID and age requirements", hint: "For age-restricted products such as alcohol or cannabis: ID rules, purchase limits." },
] as const;

export type PolicyKey = (typeof POLICY_TYPES)[number]["key"];

export interface StorePolicy {
  key: PolicyKey;
  label: string;
  text: string;
}

const KEYS = new Set<string>(POLICY_TYPES.map((p) => p.key));

// The store's filled-in policies, in the standard order.
export async function getStorePolicies(pool: Pool, storeId: string): Promise<StorePolicy[]> {
  const { rows } = await pool.query<{ policy_key: string; body: string }>(
    `select policy_key, body from store_policies where store_id = $1`,
    [storeId],
  );
  const byKey = new Map(rows.map((r) => [r.policy_key, r.body]));
  return POLICY_TYPES.filter((p) => byKey.has(p.key)).map((p) => ({ key: p.key, label: p.label, text: byKey.get(p.key)! }));
}

// Saves the given policies: text is trimmed, blank clears it, unknown keys are ignored.
export async function saveStorePolicies(pool: Pool, storeId: string, policies: Partial<Record<string, string>>): Promise<void> {
  for (const [key, raw] of Object.entries(policies)) {
    if (!KEYS.has(key)) continue;
    const text = (raw ?? "").trim();
    if (text) {
      await pool.query(
        `insert into store_policies (store_id, policy_key, body) values ($1, $2, $3)
         on conflict (store_id, policy_key) do update set body = excluded.body, updated_at = now()`,
        [storeId, key, text],
      );
    } else {
      await pool.query(`delete from store_policies where store_id = $1 and policy_key = $2`, [storeId, key]);
    }
  }
}
