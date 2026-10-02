"use server";

import { getPool, setDataSharingConsent, setStorePlatform, updateStoreContactInfo, type StorePlatform } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";
import { normalizePhone } from "../../src/phone-utils.js";

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

export async function saveContactInfoAction(
  shop: string,
  whatsappRaw: string,
  smsRaw: string,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "store_settings");
  if (!store) return { error: "Store not found" };
  const whatsapp = normalizePhone(whatsappRaw);
  const sms      = normalizePhone(smsRaw);
  await updateStoreContactInfo(pool, store.id, whatsapp, sms);
  revalidatePath("/settings");
  return {};
}
