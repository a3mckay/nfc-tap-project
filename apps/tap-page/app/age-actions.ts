"use server";

// The 19+ age gate's "yes" (founder decision, 2026-10-07): remembered for a day.
import { cookies } from "next/headers";
import { AGE_COOKIE } from "@/cannabis.js";

export async function confirmAgeAction(): Promise<void> {
  (await cookies()).set(AGE_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}
