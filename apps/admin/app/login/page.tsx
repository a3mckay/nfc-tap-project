import { loginAction } from "./actions.js";

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, error } = await searchParams;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>NFC Admin</h1>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: "2rem" }}>Sign in to continue</p>

        <form action={loginAction}>
          <input type="hidden" name="next" value={next ?? "/stores"} />
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              autoFocus
              required
              style={{ width: "100%", padding: "0.6rem 0.75rem", border: error ? "1px solid #fca5a5" : "1px solid #ddd", borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box" }}
            />
            {error && <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#c00" }}>Incorrect password</p>}
          </div>
          <button
            type="submit"
            style={{ width: "100%", padding: "0.65rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
