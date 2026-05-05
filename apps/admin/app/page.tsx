import Link from "next/link";

export default function AdminHome() {
  return (
    <main>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "1rem" }}>Admin</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        <Link href="/onboarding" style={{ display: "inline-block", marginBottom: "1.5rem", padding: "0.5rem 1rem", background: "#111", color: "#fff", borderRadius: "4px", fontWeight: 600, fontSize: "0.9rem", textDecoration: "none" }}>
        Getting started checklist →
      </Link>

      Available now:
      </p>
      <ul style={{ listStyle: "disc", paddingLeft: "1.5rem" }}>
        <li><Link href="/theme">Theme Settings</Link></li>
        <li><Link href="/enrichment">Content Enrichment</Link></li>
        <li><Link href="/tags">Tag Management</Link></li>
        <li><Link href="/analytics">Analytics</Link></li>
        <li><Link href="/canonical">Canonical Matching</Link></li>
        <li><Link href="/settings">Settings</Link></li>
        <li><Link href="/plan">Plan & Billing</Link></li>
      </ul>
    </main>
  );
}
