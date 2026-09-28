"use server";

import { getPool, getStoreByDomain, reviewCanonicalMatch } from "@nfc/db";
import { revalidatePath } from "next/cache";

export async function reviewMatchAction(shop: string, mapId: string): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { error: "Store not found" };

  // Verify the map entry's product belongs to this store before confirming
  const { rows } = await pool.query<{ id: string }>(
    `select pcm.id from product_canonical_map pcm
       join products p on p.id = pcm.store_product_id
      where pcm.id = $1 and p.store_id = $2`,
    [mapId, store.id],
  );
  if (!rows[0]) return { error: "Match not found" };

  await reviewCanonicalMatch(pool, mapId);
  revalidatePath("/canonical");
  return {};
}
