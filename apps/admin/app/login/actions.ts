"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signAdminCookie, COOKIE_NAME } from "../../src/admin-auth.js";

export async function loginAction(formData: FormData): Promise<void> {
  const password = formData.get("password");
  const next = String(formData.get("next") || "/stores");
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected || password !== expected) {
    redirect(`/login?next=${encodeURIComponent(next)}&error=1`);
  }

  const value = await signAdminCookie();
  const jar = await cookies();
  jar.set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });

  redirect(next);
}
