import Link from "next/link";
import { requestStaffSignInAction } from "./actions.js";

interface PageProps {
  searchParams: Promise<{ email?: string; sent?: string; error?: string }>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd",
  borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box",
};

const ERRORS: Record<string, string> = {
  email: "Enter a valid email address.",
  expired: "That sign-in link has expired or was already used. Send yourself a new one.",
  removed: "You're no longer on a store's staff list. Ask the store owner to add you again.",
};

export default async function StaffLoginPage({ searchParams }: PageProps) {
  const { email, sent, error } = await searchParams;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>TapShelf staff sign-in</h1>

        {sent ? (
          <>
            <p style={{ color: "#444", fontSize: "0.9rem", lineHeight: 1.6, margin: "1rem 0" }}>
              Check your email. If that address is on a store&apos;s staff list, we&apos;ve sent a sign-in link.
              It works once and expires in 15 minutes.
            </p>
            <p style={{ color: "#888", fontSize: "0.85rem", lineHeight: 1.6 }}>
              On iPhone, open the link in <strong>Safari</strong>.
            </p>
            <p style={{ marginTop: "1.5rem", fontSize: "0.85rem" }}>
              <Link href="/login/staff" style={{ color: "#555" }}>Use a different email</Link>
            </p>
          </>
        ) : (
          <>
            <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Enter the email your store added. We&apos;ll email you a sign-in link — no password needed.
            </p>
            {error && ERRORS[error] && (
              <p style={{ padding: "0.65rem 0.875rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", color: "#991b1b", marginBottom: "1rem" }}>
                {ERRORS[error]}
              </p>
            )}
            <form action={requestStaffSignInAction}>
              <input type="email" name="email" required autoFocus autoComplete="email"
                placeholder="you@example.com" defaultValue={email ?? ""} style={{ ...inputStyle, marginBottom: "1rem" }} />
              <button type="submit"
                style={{ width: "100%", padding: "0.65rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
                Email me a sign-in link
              </button>
            </form>
          </>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "#bbb", textAlign: "center" }}>
          Store owner? <Link href="/login" style={{ color: "#555" }}>Sign in here →</Link>
        </p>
      </div>
    </div>
  );
}
