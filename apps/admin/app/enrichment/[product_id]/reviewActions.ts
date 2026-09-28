"use server";

import {
  getPool,
  getProductById,
  getPendingReviewsByProduct,
  getPendingAwardsByProduct,
  setReviewStatus,
  setAwardStatus,
} from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";

export interface PendingProductItem {
  id: string;
  kind: "review" | "award";
  body: string;
  author: string | null;
  rating: number | null;
  source_label: string | null;
  source_url: string | null;
  awarding_body?: string | null;
  year?: number | null;
}

export async function getPendingItemsForProductAction(
  shop: string,
  productId: string,
): Promise<{ items: PendingProductItem[] }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return { items: [] };
  const product = await getProductById(pool, productId);
  if (!product || product.store_id !== store.id) return { items: [] };

  const [reviews, awards] = await Promise.all([
    getPendingReviewsByProduct(pool, productId),
    getPendingAwardsByProduct(pool, productId),
  ]);

  const items: PendingProductItem[] = [
    ...reviews.map((r) => ({
      id: r.id,
      kind: "review" as const,
      body: r.body,
      author: r.author,
      rating: r.rating ? parseFloat(String(r.rating)) : null,
      source_label: r.source_label,
      source_url: r.source_url,
    })),
    ...awards.map((a) => ({
      id: a.id,
      kind: "award" as const,
      body: a.title,
      author: null,
      rating: null,
      source_label: a.source_label,
      source_url: a.source_url,
      awarding_body: a.awarding_body,
      year: a.year,
    })),
  ];

  return { items };
}

export async function approveItemAction(
  shop: string,
  id: string,
  kind: "review" | "award",
): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return;

  if (kind === "review") {
    await setReviewStatus(pool, id, store.id, "approved");
  } else {
    await setAwardStatus(pool, id, store.id, "approved");
  }
  revalidatePath("/reviews/pending");
}

export async function rejectItemAction(
  shop: string,
  id: string,
  kind: "review" | "award",
): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return;

  if (kind === "review") {
    await setReviewStatus(pool, id, store.id, "rejected");
  } else {
    await setAwardStatus(pool, id, store.id, "rejected");
  }
  revalidatePath("/reviews/pending");
}
