import { loginAction } from "./actions.js";

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string; email?: string; welcome?: string }>;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #ddd",
  borderRadius: "6px", fontSize: "0.95rem", fontFamily: "inherit", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#444",
  textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const { next, error, email, welcome } = await searchParams;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.25rem" }}>TapShelf Admin</h1>
        <p style={{ color: "#888", fontSize: "0.875rem", marginBottom: welcome ? "1rem" : "2rem" }}>Sign in to continue</p>

        {welcome && (
          <div style={{
            padding: "0.65rem 0.875rem",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            borderRadius: "6px",
            marginBottom: "1.5rem",
            fontSize: "0.875rem",
            color: "#166534",
          }}>
            🎉 Your store is ready! Sign in with the password you just created.
          </div>
        )}

        <form action={loginAction}>
          <input type="hidden" name="next" value={next ?? "/stores"} />

          {/* Email — leave blank for super-admin (password only) */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>Email <span style={{ fontWeight: 400, color: "#aaa", textTransform: "none", letterSpacing: 0 }}>(leave blank for super-admin)</span></label>
            <input
              type="email"
              name="email"
              autoFocus
              autoComplete="email"
              placeholder="you@yourstore.com"
              defaultValue={email ?? ""}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "1.25rem" }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              style={{ ...inputStyle, ...(error ? { borderColor: "#fca5a5" } : {}) }}
            />
            {error && <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#c00" }}>Incorrect email or password</p>}
          </div>

          <button
            type="submit"
            style={{ width: "100%", padding: "0.65rem", background: "#111", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
          >
            Sign in
          </button>
        </form>

        <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "#bbb", textAlign: "center" }}>
          New store? <a href="https://tapshelf.co/stores/new" style={{ color: "#555" }}>Create an account →</a>
        </p>
      </div>
    </div>
  );
}
