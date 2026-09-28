"use server";

import { getPool, setReviewStatus, setAwardStatus, type ReviewStatus } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";

export async function setReviewStatusAction(shop: string, id: string, status: ReviewStatus): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return;

  await setReviewStatus(pool, id, store.id, status);
  revalidatePath("/reviews/pending");
}

export async function setAwardStatusAction(shop: string, id: string, status: ReviewStatus): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return;

  await setAwardStatus(pool, id, store.id, status);
  revalidatePath("/reviews/pending");
}
