import { redirect } from "next/navigation";
import { getPool, getActiveStaffById, getStaffChecklist } from "@nfc/db";
import { reviewedLabel } from "@/progress-utils.js";
import { getAdminSession } from "@/current-store.js";

// Staff home page (PRD v4 §7 Step 13b). The only admin page a staff session can open.
export default async function TrainingHomePage() {
  const session = await getAdminSession();
  if (session?.role !== "staff") redirect("/");

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const staff = await getActiveStaffById(pool, session.staffId);
  if (!staff) redirect("/login/staff?error=removed");

  const checklist = await getStaffChecklist(pool, staff.id, staff.store_id);
  const toReview = checklist.filter((p) => !p.reviewed);
  const reviewed = checklist.filter((p) => p.reviewed);

  return (
    <div style={{ maxWidth: "420px", margin: "0 auto" }}>
      <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.25rem" }}>{staff.store_name}</p>
      <h1 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "1rem" }}>
        Hi{staff.name ? ` ${staff.name}` : ""} — you&apos;re signed in as staff
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#333", lineHeight: 1.6, marginBottom: "1rem" }}>
        Tap any product in the store to see its training notes: how to sell it, who it&apos;s for,
        how it fits, and answers to common questions.
      </p>
      <p style={{ fontSize: "0.85rem", color: "#666", lineHeight: 1.6, padding: "0.75rem 1rem", background: "#f7f7f7", borderRadius: "6px", marginBottom: "1.5rem" }}>
        On iPhone, keep using <strong>Safari</strong> — that&apos;s where tapped products open.
      </p>
      {checklist.length > 0 && (
        <section style={{ marginBottom: "1.75rem" }}>
          <p style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            {reviewedLabel(reviewed.length, checklist.length)}
          </p>
          {toReview.length > 0 && (
            <>
              <h2 style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 0.35rem" }}>
                Not reviewed yet — go tap these
              </h2>
              <ul style={{ margin: "0 0 1rem", paddingLeft: "1.2rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
                {toReview.map((p) => <li key={p.id}>{p.title}</li>)}
              </ul>
            </>
          )}
          {reviewed.length > 0 && (
            <>
              <h2 style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 0.35rem" }}>
                Reviewed
              </h2>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none", fontSize: "0.95rem", lineHeight: 1.7, color: "#666" }}>
                {reviewed.map((p) => <li key={p.id}>✓ {p.title}</li>)}
              </ul>
            </>
          )}
        </section>
      )}
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
