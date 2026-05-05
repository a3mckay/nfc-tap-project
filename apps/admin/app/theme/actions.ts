"use server";

import { getPool, updateThemeSettings, getStoreByDomain, saveBrandDetectUrl, clearPendingBrandSuggestion } from "@nfc/db";
import { revalidatePath } from "next/cache";

export interface ThemeFormData {
  shop: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  logoUrl: string;
  layout: "minimal" | "content-rich";
  brandDetectUrl?: string;
}

export async function saveThemeAction(data: ThemeFormData): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });

  const store = await getStoreByDomain(pool, data.shop);
  if (!store) return { error: "Store not found" };

  await updateThemeSettings(pool, store.id, {
    primaryColor: data.primaryColor,
    secondaryColor: data.secondaryColor,
    tertiaryColor: data.tertiaryColor,
    backgroundColor: data.backgroundColor,
    fontFamily: data.fontFamily,
    logoUrl: data.logoUrl || null,
    layout: data.layout,
  });

  if (data.brandDetectUrl) {
    await saveBrandDetectUrl(pool, store.id, data.brandDetectUrl);
  }

  // Clear any pending suggestion once the owner has saved
  await clearPendingBrandSuggestion(pool, store.id);

  revalidatePath("/theme");
  return {};
}
