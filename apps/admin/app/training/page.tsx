import { redirect } from "next/navigation";
import { getPool, getActiveStaffById } from "@nfc/db";
import { getAdminSession } from "@/current-store.js";

// Staff home page (PRD v4 §7 Step 13b). The only admin page a staff session can open.
export default async function TrainingHomePage() {
  const session = await getAdminSession();
  if (session?.role !== "staff") redirect("/");

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const staff = await getActiveStaffById(pool, session.staffId);
  if (!staff) redirect("/login/staff?error=removed");

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto" }}>
      <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>{staff.store_name}</p>
      <h1 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "1rem" }}>
        Hi{staff.name ? ` ${staff.name}` : ""} — you&apos;re signed in as staff
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#333", lineHeight: 1.6, marginBottom: "1rem" }}>
        You&apos;re all set up. Soon, tapping any product in the store will show its training notes:
        how it fits, how to sell it, and answers to common questions.
      </p>
      <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.6, padding: "0.75rem 1rem", background: "#f7f7f7", borderRadius: "6px", marginBottom: "1.5rem" }}>
        On iPhone, keep using <strong>Safari</strong> — that&apos;s where tapped products open.
      </p>
      <p style={{ fontSize: "0.8rem", color: "#999", marginBottom: "2rem" }}>
        Signed in as {staff.email}. You&apos;ll stay signed in for 30 days.
      </p>
      <form action="/api/logout" method="POST">
        <button type="submit"
          style={{ padding: "0.5rem 1rem", background: "transparent", color: "#555", border: "1px solid #ddd", borderRadius: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
          Sign out
        </button>
      </form>
    </div>
  );
}
