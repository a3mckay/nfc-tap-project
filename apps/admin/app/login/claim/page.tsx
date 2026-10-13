import Link from "next/link";
import { getPool, getOpenStoreClaim } from "@nfc/db";
import { hashSignInToken } from "@/sign-in-token.js";
import { MIN_PASSWORD_LENGTH } from "@/staff-utils.js";
import { claimStoreAction } from "./actions.js";

// PRD v4 §7 Step 12: the claim link in a prospect's kit. They set the owner's
// email and password for their demo store; the link then stops working.

interface PageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd",
  borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "0.9rem",
};

const ERRORS: Record<string, string> = {
  email: "Enter your email address.",
  short: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`,
  mismatch: "The two passwords don't match.",
  taken: "That email already has a TapShelf login. Use another email, or sign in with it.",
};

export default async function ClaimStorePage({ searchParams }: PageProps) {
  const { token, error } = await searchParams;
  const claim = token
    ? await getOpenStoreClaim(getPool({ connectionString: process.env.DATABASE_URL }), await hashSignInToken(token))
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "0 1rem" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {claim ? (
          <>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Set up your login{claim.store_name ? ` for ${claim.store_name}` : ""}
            </h1>
            <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              Choose the email and password you&apos;ll use to sign in to your TapShelf dashboard. This link works once.
            </p>
            {error && ERRORS[error] && (
              <p role="alert" style={{ padding: "0.65rem 0.875rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", fontSize: "0.85rem", color: "#991b1b", marginBottom: "1rem" }}>
                {ERRORS[error]}
              </p>
            )}
            <form action={claimStoreAction}>
              <input type="hidden" name="token" value={token} />
              <input type="email" name="email" required autoComplete="email" placeholder="you@company.com" aria-label="Email" style={inputStyle} />
              <input type="password" name="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="Password" aria-label="Password" style={inputStyle} />
              <input type="password" name="confirm" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" placeholder="Type it again" aria-label="Confirm password" style={inputStyle} />
              <button type="submit" style={{ width: "100%", padding: "0.65rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
                Create my login
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>This link has expired or was already used</h1>
            <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.5 }}>
              If you&apos;ve already set up your login, <Link href="/login" style={{ color: "#111" }}>sign in here</Link>.
              Otherwise, email <a href="mailto:hello@tapshelf.co" style={{ color: "#111" }}>hello@tapshelf.co</a> for a new link.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
