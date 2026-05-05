"use server";

import { getPool, getStoreByDomain, setDataSharingConsent, setStorePlatform, type StorePlatform } from "@nfc/db";
import { revalidatePath } from "next/cache";

export async function setConsentAction(
  shop: string,
  optedIn: boolean,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
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
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };
  await setStorePlatform(pool, store.id, platform);
  revalidatePath("/settings");
  revalidatePath("/products");
  return {};
}
