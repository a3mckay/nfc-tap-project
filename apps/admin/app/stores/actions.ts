"use server";

import { getPool, createManualStore, type StorePlatform } from "@nfc/db";
import { revalidatePath } from "next/cache";

export async function createStoreAction(formData: FormData): Promise<{ error?: string }> {
  const domain = String(formData.get("domain") ?? "").trim().toLowerCase();
  const platform = String(formData.get("platform") ?? "other") as StorePlatform;

  if (!domain) return { error: "Domain is required" };
  if (!/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return { error: "Enter a valid domain (e.g. mystore.myshopify.com or mystore.com)" };
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  await createManualStore(pool, domain, platform);
  revalidatePath("/stores");
  return {};
}
