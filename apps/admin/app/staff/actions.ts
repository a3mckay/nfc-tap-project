"use server";

import { getPool, approveStaffEmail, revokeStaff } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { normalizeStaffEmail } from "@/staff-utils.js";
import { revalidatePath } from "next/cache";

export async function approveStaffAction(
  shop: string,
  email: string,
  name: string,
): Promise<{ error?: string }> {
  const normalized = normalizeStaffEmail(email);
  if (!normalized) return { error: "Enter a valid email address" };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return { error: "Store not found" };

  await approveStaffEmail(pool, store.id, normalized, name.trim() || null);
  revalidatePath("/staff");
  return {};
}

export async function removeStaffAction(shop: string, id: string): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return { error: "Store not found" };

  const removed = await revokeStaff(pool, id, store.id);
  if (!removed) return { error: "Staff member not found" };
  revalidatePath("/staff");
  return {};
}
