"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPool, getActiveStaffByEmail, createStaffSignInToken } from "@nfc/db";
import { sendEmail } from "@nfc/email";
import { normalizeStaffEmail } from "@/staff-utils.js";
import { newSignInToken, STAFF_SIGN_IN_TTL_MINUTES } from "@/sign-in-token.js";
import { adminBaseUrl } from "@/public-url.js";
import { staffSignInEmailHtml } from "@/staff-emails.js";

// Emails a sign-in link for every store the address is approved at. The page
// looks the same whether or not the email is approved, so it can't be used to
// find out who's on a team.
export async function requestStaffSignInAction(formData: FormData): Promise<void> {
  const email = normalizeStaffEmail(String(formData.get("email") ?? ""));
  if (!email) redirect("/login/staff?error=email");

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const staff = await getActiveStaffByEmail(pool, email);

  if (staff.length > 0) {
    const h = await headers();
    const base = adminBaseUrl((name) => h.get(name));
    const links = [];
    for (const s of staff) {
      const { token, hash } = await newSignInToken();
      await createStaffSignInToken(pool, s.id, hash, STAFF_SIGN_IN_TTL_MINUTES);
      links.push({ storeName: s.store_name, url: `${base}/login/staff/verify?token=${token}` });
    }
    try {
      await sendEmail({ to: email, subject: "Your TapShelf staff sign-in link", html: staffSignInEmailHtml(links) });
    } catch (err) {
      console.error("[login/staff] sendEmail failed:", err);
    }
  }

  redirect("/login/staff?sent=1");
}
