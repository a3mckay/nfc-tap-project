"use server";

import { getPool, getStoreByDomain, setDataSharingConsent, setStorePlatform, updateStoreContactInfo, type StorePlatform } from "@nfc/db";
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

/** Strips all non-digit characters except a leading +. Returns null for empty/invalid. */
function normalizePhone(raw: string): string | null {
  const stripped = raw.replace(/[^0-9]/g, "");
  return stripped.length >= 7 ? stripped : null;
}

export async function saveContactInfoAction(
  shop: string,
  whatsappRaw: string,
  smsRaw: string,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };
  const whatsapp = normalizePhone(whatsappRaw);
  const sms      = normalizePhone(smsRaw);
  await updateStoreContactInfo(pool, store.id, whatsapp, sms);
  revalidatePath("/settings");
  return {};
}
