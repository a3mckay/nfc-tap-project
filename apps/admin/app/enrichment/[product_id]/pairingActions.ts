"use server";

// "Goes great with" (founder, 2026-11-16): the owner can remove a pairing (it
// stays removed) or ask the AI to find pairings again, e.g. after adding products.
import { getPool, getProductById, removePairing } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { refreshPairings } from "@/lib/refresh-pairings.js";
import { revalidatePath } from "next/cache";

type Result = { error?: string };

const pool = () => getPool({ connectionString: process.env.DATABASE_URL });

export async function removePairingAction(shop: string, productId: string, pairedProductId: string): Promise<Result> {
  const store = await getActionStore(pool(), shop, "content");
  if (!store) return { error: "Not allowed" };
  if (!(await removePairing(pool(), store.id, productId, pairedProductId))) return { error: "Pairing not found" };
  revalidatePath(`/enrichment/${productId}`);
  return {};
}

export async function findPairingsAction(shop: string, productId: string): Promise<Result> {
  const store = await getActionStore(pool(), shop, "content");
  if (!store) return { error: "Not allowed" };
  const product = await getProductById(pool(), productId);
  if (!product || product.store_id !== store.id) return { error: "Product not found" };
  await refreshPairings(pool(), store.id, productId);
  revalidatePath(`/enrichment/${productId}`);
  return {};
}
