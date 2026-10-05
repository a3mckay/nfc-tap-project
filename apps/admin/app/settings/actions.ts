"use server";

import { getPool, setDataSharingConsent, setStorePlatform, setStoreIndustry, setStoreName, SPEC_CATEGORIES, type StorePlatform } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";

export async function setConsentAction(
  shop: string,
  optedIn: boolean,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "store_settings");
  if (!store) return { error: "Store not found" };
  await setDataSharingConsent(pool, store.id, optedIn);
  revalidatePath("/settings");
  return {};
}

export async function setPlatformAction(
  shop: string,
  platform: StorePlatform,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "store_settings");
  if (!store) return { error: "Store not found" };
  await setStorePlatform(pool, store.id, platform);
  revalidatePath("/settings");
  revalidatePath("/products");
  return {};
}

// PRD v4 §7 Step 15l: the store's main industry, the fallback spec category for
// products whose type doesn't say (D51).
export async function setIndustryAction(shop: string, industry: string): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "store_settings");
  if (!store) return { error: "Store not found" };
  if (industry && !(SPEC_CATEGORIES as string[]).includes(industry)) return { error: "Unknown industry" };
  await setStoreIndustry(pool, store.id, industry || null);
  revalidatePath("/settings");
  return {};
}

const MAX_STORE_NAME = 60;

// The store's display name, shown to customers on tap pages, in the chat and
// in link previews.
export async function setStoreNameAction(shop: string, name: string): Promise<{ error?: string }> {
  if (name.trim().length > MAX_STORE_NAME) return { error: `Keep the name to ${MAX_STORE_NAME} characters or fewer.` };
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "store_settings");
  if (!store) return { error: "Store not found" };
  await setStoreName(pool, store.id, name);
  revalidatePath("/settings");
  return {};
}
