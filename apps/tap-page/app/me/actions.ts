"use server";

import { redirect } from "next/navigation";
import { clearCustomerCookie, getCurrentCustomer } from "@/lib/auth.js";
import {
  getPool, updateCustomerProfile, updateNotificationPrefs,
  getOrCreateNotificationPrefs,
  type NotificationPrefs,
} from "@nfc/db";

export async function signOutAction(): Promise<void> {
  await clearCustomerCookie();
  redirect("/me");
}

// ── Profile (display name, phone, preferred channel) ────────────────────────

export async function saveProfileAction(opts: {
  displayName: string;
  phone: string;
  preferredChannel: "sms" | "whatsapp" | "email";
}): Promise<{ error?: string }> {
  const customer = await getCurrentCustomer();
  if (!customer) return { error: "Not signed in." };

  // Normalise phone: strip non-digits, require ≥7 digits or empty
  const rawPhone = opts.phone.trim();
  let phone: string | null = null;
  if (rawPhone) {
    const digits = rawPhone.replace(/\D/g, "");
    if (digits.length < 7) return { error: "Phone number looks too short." };
    // Re-add leading + if the user typed one
    phone = rawPhone.startsWith("+") ? `+${digits}` : digits;
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  await updateCustomerProfile(pool, customer.id, {
    displayName: opts.displayName.trim() || null,
    phone,
    preferredChannel: opts.preferredChannel,
  });
  return {};
}

// ── Notification preferences (3×3 matrix) ────────────────────────────────────

export async function saveNotificationPrefsAction(
  prefs: Partial<Omit<NotificationPrefs, "customer_id">>,
): Promise<{ error?: string }> {
  const customer = await getCurrentCustomer();
  if (!customer) return { error: "Not signed in." };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  // Ensure a row exists before updating
  await getOrCreateNotificationPrefs(pool, customer.id);
  await updateNotificationPrefs(pool, customer.id, prefs);
  return {};
}

export { getOrCreateNotificationPrefs };
