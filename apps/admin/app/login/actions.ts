"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, managerSession, COOKIE_NAME } from "../../src/admin-auth.js";
import { getPool, getStoreAdminByEmail, verifyPassword, getStoreById, getManagerLoginsByEmail } from "@nfc/db";
import { adminHomePath } from "@/permissions.js";
import { startTapHandoff } from "@/tap-handoff.js";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  secure: process.env.NODE_ENV === "production",
};

export async function loginAction(formData: FormData): Promise<void> {
  const email    = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next     = String(formData.get("next") || "/stores");
  const welcome  = formData.get("welcome") === "1";

  const pool = getPool();
  const jar  = await cookies();

  // ── Store-admin path (email provided) ────────────────────────────────────
  if (email) {
    const errorRedirect = `/login?next=${encodeURIComponent(next)}&error=1${welcome ? "&welcome=1" : ""}`;
    const admin = await getStoreAdminByEmail(pool, email);
    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      await signInManager(email, password);   // redirects if it's a manager's login
      redirect(errorRedirect);
    }

    const store = await getStoreById(pool, admin.store_id);
    if (!store) {
      redirect(errorRedirect);
    }

    const value = await signSession({
      role: "store",
      storeId: store.id,
      storeDomain: store.shopify_shop_domain,
    });
    jar.set(COOKIE_NAME, value, COOKIE_OPTS);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const shopDomain = store!.shopify_shop_domain;
    const destination = welcome
      ? `/onboarding?shop=${encodeURIComponent(shopDomain)}&welcome=1`
      : `/tags?shop=${encodeURIComponent(shopDomain)}`;
    // Also sign the owner in on the tap page, so they see the staff training
    // view when they tap their own products (PRD v4 §7 Step 13c).
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    redirect(await startTapHandoff(pool, { kind: "owner", storeAdminId: admin!.id, storeId: store!.id }, destination));
  }

  // ── Super-admin path (password only) ─────────────────────────────────────
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || password !== expected) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=1`);
  }

  const value = await signSession({ role: "super" });
  jar.set(COOKIE_NAME, value, COOKIE_OPTS);
  redirect(next);
}

// Managers and co-managers sign in with their own password. If the email is on
// several stores' lists, the first whose password matches is used.
async function signInManager(email: string, password: string): Promise<void> {
  const pool = getPool();
  for (const login of await getManagerLoginsByEmail(pool, email)) {
    if (!(await verifyPassword(password, login.password_hash))) continue;
    const session = managerSession({
      staffId: login.staff_id, storeId: login.store_id, storeDomain: login.store_domain, level: login.role,
    });
    (await cookies()).set(COOKIE_NAME, await signSession(session), COOKIE_OPTS);
    redirect(await startTapHandoff(pool, { kind: "staff", staffId: login.staff_id, storeId: login.store_id }, adminHomePath(session)));
  }
}
