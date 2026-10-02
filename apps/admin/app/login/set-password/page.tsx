import Link from "next/link";
import { setPasswordAction } from "./actions.js";
import { MIN_PASSWORD_LENGTH } from "@/staff-utils.js";

interface PageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd",
  borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "0.9rem",
};

const ERRORS: Record<string, string> = {
  short: `Use at least ${MIN_PASSWORD_LENGTH} characters.`,
  mismatch: "The two passwords don't match.",
  expired: "This link has expired or was already used. Ask your store owner or manager to send a new one.",
};

export default async function SetPasswordPage({ searchParams }: PageProps) {
  const { token, error } = await searchParams;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>Set your password</h1>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
          You&apos;ll use your email and this password to sign in to the TapShelf admin.
        </p>
        {error && ERRORS[error] && (
          <p style={{ padding: "0.65rem 0.875rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", color: "#991b1b", marginBottom: "1rem" }}>
            {ERRORS[error]}
          </p>
        )}
        {token ? (
          <form action={setPasswordAction}>
            <input type="hidden" name="token" value={token} />
            <input type="password" name="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="New password" aria-label="New password" style={inputStyle} />
            <input type="password" name="confirm" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="Type it again" aria-label="Confirm password" style={inputStyle} />
            <button type="submit" style={{ width: "100%", padding: "0.65rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
              Set password and sign in
            </button>
          </form>
        ) : (
          <p style={{ fontSize: "0.85rem" }}><Link href="/login" style={{ color: "#555" }}>Go to sign in →</Link></p>
        )}
      </div>
    </div>
  );
}
