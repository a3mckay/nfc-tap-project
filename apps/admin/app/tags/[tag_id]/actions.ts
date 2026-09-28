"use server";

import {
  getPool,
  assignTagToProduct,
  setTagStatus,
} from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";
import type { TagStatus } from "@nfc/db";

export async function assignTagAction(
  shop: string,
  tagId: string,
  productId: string | null,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return { error: "Store not found" };

  const updated = await assignTagToProduct(pool, tagId, store.id, productId || null);
  if (!updated) return { error: "Tag or product not found" };
  revalidatePath("/tags");
  return {};
}

export async function setTagStatusAction(
  shop: string,
  tagId: string,
  status: TagStatus,
): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return { error: "Store not found" };

  const updated = await setTagStatus(pool, tagId, store.id, status);
  if (!updated) return { error: "Tag not found" };
  revalidatePath("/tags");
  return {};
}
