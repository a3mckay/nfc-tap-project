"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signSession, COOKIE_NAME } from "../../src/admin-auth.js";
import { getPool, getStoreAdminByEmail, verifyPassword, getStoreById } from "@nfc/db";

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
    if (welcome) {
      redirect(`/onboarding?shop=${encodeURIComponent(shopDomain)}&welcome=1`);
    }
    redirect(`/tags?shop=${encodeURIComponent(shopDomain)}`);
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
