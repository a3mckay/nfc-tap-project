import { cookies } from "next/headers";
import { getPool, isTapPrincipalActive, type TapPrincipal } from "@nfc/db";
import { STAFF_COOKIE, verifyStaffCookie } from "./staff-session.js";

// The staff member or store owner signed in on the tap page, if any. Re-checked
// against the database on every request, so removing someone in the admin takes
// effect on their next tap.
export async function getCurrentStaff(): Promise<TapPrincipal | null> {
  const cookieStore = await cookies();
  const principal = verifyStaffCookie(cookieStore.get(STAFF_COOKIE)?.value);
  if (!principal) return null;

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  return (await isTapPrincipalActive(pool, principal)) ? principal : null;
}
