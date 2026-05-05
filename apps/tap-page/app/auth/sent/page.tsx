import Link from "next/link";

export default function SentPage() {
  return (
    <main style={{ maxWidth: "420px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>📨</div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem", color: "#111" }}>
        Check your inbox
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#666", lineHeight: 1.6, marginBottom: "2rem" }}>
        We've sent you a sign-in link. Click it on this device to access your collection.
      </p>
      <p style={{ fontSize: "0.85rem", color: "#999" }}>
        The link expires in 15 minutes.
      </p>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/" style={{ fontSize: "0.85rem", color: "#666" }}>← Back</Link>
      </p>
    </main>
  );
}
