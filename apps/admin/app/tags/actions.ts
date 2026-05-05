"use server";

import { getPool, getStoreByDomain, provisionTags } from "@nfc/db";
import { revalidatePath } from "next/cache";
import { parseProvisionCount } from "../../src/tag-utils.js";

export async function provisionTagsAction(
  shop: string,
  countRaw: string,
): Promise<{ error?: string; created?: number }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  const count = parseProvisionCount(countRaw);
  await provisionTags(pool, store.id, count);
  revalidatePath("/tags");
  return { created: count };
}
