import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { getPool, getCustomerById, type Customer } from "@nfc/db";
import { CUSTOMER_COOKIE, signCustomerCookie, verifyCustomerCookie } from "./cookies.js";

export function generateMagicToken(): string {
  return randomBytes(32).toString("hex");
}

// Server-side: read the current customer from the signed cookie, if any.
export async function getCurrentCustomer(): Promise<Customer | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(CUSTOMER_COOKIE)?.value;
  const customerId = verifyCustomerCookie(raw);
  if (!customerId) return null;

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  return getCustomerById(pool, customerId);
}

export async function setCustomerCookie(customerId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_COOKIE, signCustomerCookie(customerId), {
    httpOnly: true,
    sameSite: "lax",
    // 1 year — long enough that customers don't have to re-auth often
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}

export async function clearCustomerCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_COOKIE);
}
