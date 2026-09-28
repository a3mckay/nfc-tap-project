"use server";

import { getPool, approveStaffEmail, revokeStaff } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { normalizeStaffEmail } from "@/staff-utils.js";
import { sendEmail } from "@nfc/email";
import { headers } from "next/headers";
import { adminBaseUrl } from "@/public-url.js";
import { staffInviteEmailHtml } from "@/staff-emails.js";
import { revalidatePath } from "next/cache";

export async function approveStaffAction(
  shop: string,
  email: string,
  name: string,
): Promise<{ error?: string; warning?: string }> {
  const normalized = normalizeStaffEmail(email);
  if (!normalized) return { error: "Enter a valid email address" };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop);
  if (!store) return { error: "Store not found" };

  await approveStaffEmail(pool, store.id, normalized, name.trim() || null);
  revalidatePath("/staff");

  const storeName = store.name ?? store.shopify_shop_domain;
  const h = await headers();
  const signInUrl = `${adminBaseUrl((n) => h.get(n))}/login/staff?email=${encodeURIComponent(normalized)}`;
  try {
    await sendEmail({
      to: normalized,
      subject: `You've been added to the team at ${storeName} on TapShelf`,
      html: staffInviteEmailHtml(storeName, signInUrl),
    });
  } catch (err) {
    console.error("[staff] invite email failed:", err);
    return { warning: "Added, but the invite email couldn't be sent" };
  }
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
