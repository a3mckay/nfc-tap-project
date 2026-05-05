"use server";

import { redirect } from "next/navigation";
import { clearCustomerCookie } from "@/lib/auth.js";

export async function signOutAction(): Promise<void> {
  await clearCustomerCookie();
  redirect("/");
}
