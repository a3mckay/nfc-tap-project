"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPool, redeemStoreClaim, hashPassword } from "@nfc/db";
import { signSession, COOKIE_NAME } from "@/admin-auth.js";
import { hashSignInToken } from "@/sign-in-token.js";
import { startTapHandoff } from "@/tap-handoff.js";
import { MIN_PASSWORD_LENGTH } from "@/staff-utils.js";

// PRD v4 §7 Step 12: a prospect claims their demo store from the kit's link by
// setting the owner's email and password, and is signed in straight away.
export async function claimStoreAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = (error: string) => `/login/claim?token=${encodeURIComponent(token)}&error=${error}`;

  // Check the form first, so a typo doesn't use up the link.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) redirect(back("email"));
  if (password.length < MIN_PASSWORD_LENGTH) redirect(back("short"));
  if (password !== confirm) redirect(back("mismatch"));

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const result = token
    ? await redeemStoreClaim(pool, await hashSignInToken(token), email, await hashPassword(password))
    : { ok: false as const, reason: "expired" as const };
  if (!result.ok) redirect(result.reason === "email_taken" ? back("taken") : "/login/claim?error=expired");

  const jar = await cookies();
  jar.set(COOKIE_NAME, await signSession({ role: "store", storeId: result.store_id, storeDomain: result.store_domain }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(await startTapHandoff(pool, { kind: "owner", storeAdminId: result.store_admin_id, storeId: result.store_id },
    `/?shop=${encodeURIComponent(result.store_domain)}`));
}
