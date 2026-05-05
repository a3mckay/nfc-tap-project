"use server";

import { getPool, setReviewStatus, setAwardStatus, type ReviewStatus } from "@nfc/db";
import { revalidatePath } from "next/cache";

export async function setReviewStatusAction(id: string, status: ReviewStatus): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  await setReviewStatus(pool, id, status);
  revalidatePath("/reviews/pending");
}

export async function setAwardStatusAction(id: string, status: ReviewStatus): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  await setAwardStatus(pool, id, status);
  revalidatePath("/reviews/pending");
}
