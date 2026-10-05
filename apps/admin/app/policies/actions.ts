"use server";

// PRD v4 §7 Step 15j: owners and managers save the store's policies, which the
// AI assistant answers store-wide questions from (docs/PRD-ai-assistant.md D48).
import { getPool, saveStorePolicies } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";

const MAX_POLICY_CHARS = 1200;

export async function saveStorePoliciesAction(shop: string, policies: Record<string, string>): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "policies");
  if (!store) return { error: "Not allowed" };
  if (Object.values(policies).some((t) => (t ?? "").length > MAX_POLICY_CHARS)) {
    return { error: "Keep each policy under 1,200 characters" };
  }
  await saveStorePolicies(pool, store.id, policies);
  revalidatePath("/policies");
  return {};
}
