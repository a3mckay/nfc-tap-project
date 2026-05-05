"use server";

import {
  getPool,
  getStoreByDomain,
  assignTagToProduct,
  setTagStatus,
} from "@nfc/db";
import { revalidatePath } from "next/cache";
import type { TagStatus } from "@nfc/db";

export async function assignTagAction(
  shop: string,
  tagId: string,
  productId: string | null,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  await assignTagToProduct(pool, tagId, productId || null);
  revalidatePath("/tags");
  return {};
}

export async function setTagStatusAction(
  shop: string,
  tagId: string,
  status: TagStatus,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  await setTagStatus(pool, tagId, status);
  revalidatePath("/tags");
  return {};
}
