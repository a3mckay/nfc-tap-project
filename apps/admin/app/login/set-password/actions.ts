"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPool, consumeSetPasswordToken, setStaffPassword, hashPassword } from "@nfc/db";
import { signSession, managerSession, COOKIE_NAME, STAFF_SESSION_MAX_AGE_SECONDS } from "@/admin-auth.js";
import { hashSignInToken } from "@/sign-in-token.js";
import { adminHomePath } from "@/permissions.js";
import { startTapHandoff } from "@/tap-handoff.js";
import { MIN_PASSWORD_LENGTH } from "@/staff-utils.js";

// A new manager or co-manager sets their password from the emailed link, and is
// signed in straight away.
export async function setPasswordAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const back = (error: string) => `/login/set-password?token=${encodeURIComponent(token)}&error=${error}`;

  // Check the password first, so a typo doesn't use up the link.
  if (password.length < MIN_PASSWORD_LENGTH) redirect(back("short"));
  if (password !== confirm) redirect(back("mismatch"));

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const who = token ? await consumeSetPasswordToken(pool, await hashSignInToken(token)) : null;
  if (!who) redirect("/login/set-password?error=expired");

  await setStaffPassword(pool, who.staff_id, who.store_id, await hashPassword(password));

  const session = managerSession({ staffId: who.staff_id, storeId: who.store_id, storeDomain: who.store_domain, level: who.role });
  const jar = await cookies();
  jar.set(COOKIE_NAME, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: STAFF_SESSION_MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
  redirect(await startTapHandoff(pool, { kind: "staff", staffId: who.staff_id, storeId: who.store_id }, adminHomePath(session)));
}
