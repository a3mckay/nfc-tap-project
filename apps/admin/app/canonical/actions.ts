"use server";

import { getPool, reviewCanonicalMatch } from "@nfc/db";
import { revalidatePath } from "next/cache";

export async function reviewMatchAction(mapId: string): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  await reviewCanonicalMatch(pool, mapId);
  revalidatePath("/canonical");
  return {};
}
