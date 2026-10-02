"use server";

import { getPool, approveStaffEmail, revokeStaff, getStaffMember, setStaffRole, createSetPasswordToken, type StaffRole } from "@nfc/db";
import { newSignInToken } from "@/sign-in-token.js";
import { getActionStore } from "@/current-store.js";
import { normalizeStaffEmail } from "@/staff-utils.js";
import { sendEmail } from "@nfc/email";
import { headers } from "next/headers";
import { adminBaseUrl } from "@/public-url.js";
import { staffInviteEmailHtml, setPasswordEmailHtml } from "@/staff-emails.js";
import { revalidatePath } from "next/cache";

export async function approveStaffAction(
  shop: string,
  email: string,
  name: string,
): Promise<{ error?: string; warning?: string }> {
  const normalized = normalizeStaffEmail(email);
  if (!normalized) return { error: "Enter a valid email address" };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "staff");
  if (!store) return { error: "Not allowed" };

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

// Managers can remove staff and co-managers; only the owner can remove a manager.
export async function removeStaffAction(shop: string, id: string): Promise<{ error?: string }> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "staff");
  if (!store) return { error: "Not allowed" };

  const member = await getStaffMember(pool, id, store.id);
  if (!member) return { error: "Staff member not found" };
  if (member.role === "manager" && !(await getActionStore(pool, shop, "assign_manager"))) {
    return { error: "Only the owner can do that" };
  }

  const removed = await revokeStaff(pool, id, store.id);
  if (!removed) return { error: "Staff member not found" };
  revalidatePath("/staff");
  return {};
}

const ROLES: StaffRole[] = ["staff", "co_manager", "manager"];
const SET_PASSWORD_TTL_MINUTES = 72 * 60;

// Owners can set any role. Managers can move people between staff and
// co-manager, but can't make a manager or change one (themselves included).
export async function setStaffRoleAction(
  shop: string,
  id: string,
  role: StaffRole,
): Promise<{ error?: string; warning?: string }> {
  if (!ROLES.includes(role)) return { error: "Unknown role" };

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "assign_co_manager");
  if (!store) return { error: "Not allowed" };

  const member = await getStaffMember(pool, id, store.id);
  if (!member) return { error: "Staff member not found" };
  if ((member.role === "manager" || role === "manager") && !(await getActionStore(pool, shop, "assign_manager"))) {
    return { error: "Only the owner can do that" };
  }

  if (!(await setStaffRole(pool, id, store.id, role))) return { error: "Staff member not found" };
  revalidatePath("/staff");

  // Newly promoted from staff, or never set a password: they need one to sign
  // in to the admin.
  if (role !== "staff" && (member.role === "staff" || !member.has_password)) {
    try {
      const { token, hash } = await newSignInToken();
      await createSetPasswordToken(pool, id, hash, SET_PASSWORD_TTL_MINUTES);
      const h = await headers();
      const url = `${adminBaseUrl((n) => h.get(n))}/login/set-password?token=${token}`;
      const storeName = store.name ?? store.shopify_shop_domain;
      const roleLabel = role === "manager" ? "manager" : "co-manager";
      await sendEmail({
        to: member.email,
        subject: `You're now a ${roleLabel} at ${storeName} on TapShelf`,
        html: setPasswordEmailHtml(storeName, roleLabel, url),
      });
    } catch (err) {
      console.error("[staff] set-password email failed:", err);
      return { warning: "Role changed, but the password email couldn't be sent" };
    }
  }
  return {};
}
