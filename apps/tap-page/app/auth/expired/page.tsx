import Link from "next/link";

export default function ExpiredPage() {
  return (
    <main style={{ maxWidth: "420px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem", color: "#111" }}>
        Link expired
      </h1>
      <p style={{ fontSize: "0.95rem", color: "#666", lineHeight: 1.6, marginBottom: "2rem" }}>
        Sign-in links are single-use and expire after 15 minutes. Tap any product again to request a new one.
      </p>
      <Link href="/" style={{ fontSize: "0.85rem", color: "#666" }}>← Back</Link>
    </main>
  );
}
