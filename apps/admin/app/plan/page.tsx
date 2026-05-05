import { getPool, getStoreByDomain } from "@nfc/db";
import { tierLabel, TIER_LIMITS } from "../../src/tier-utils.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function PlanPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Plan</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to view your plan.</p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Plan</h1>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </main>
    );
  }

  const tier = store.tier;
  const limits = TIER_LIMITS[tier];

  const row = (label: string, value: string) => (
    <tr style={{ borderBottom: "1px solid #f4f4f4" }}>
      <td style={{ padding: "0.6rem 1rem 0.6rem 0", color: "#666", fontSize: "0.875rem" }}>{label}</td>
      <td style={{ padding: "0.6rem 0", fontWeight: 600, fontSize: "0.875rem" }}>{value}</td>
    </tr>
  );

  const fmt = (n: number) => (n === Infinity ? "Unlimited" : String(n));

  return (
    <main style={{ maxWidth: "480px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Plan</h1>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.9rem" }}>{shop}</p>

      <div style={{ display: "inline-block", padding: "0.4rem 1rem", background: tier === "free" ? "#f3f4f6" : "#dcfce7", borderRadius: "99px", fontSize: "0.9rem", fontWeight: 700, color: tier === "free" ? "#374151" : "#166534", marginBottom: "1.5rem" }}>
        {tierLabel(tier)}
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "2rem" }}>
        <tbody>
          {row("AI copy generations", fmt(limits.ai_copy))}
          {row("NFC tags", fmt(limits.tags))}
          {row("Analytics history", limits.analytics_days === Infinity ? "Unlimited" : `${limits.analytics_days} days`)}
        </tbody>
      </table>

      {store.tier_expires_at && (
        <p style={{ fontSize: "0.8rem", color: "#888", marginBottom: "1.5rem" }}>
          Renews {new Date(store.tier_expires_at).toLocaleDateString()}
        </p>
      )}

      {tier === "free" && (
        <p style={{ fontSize: "0.875rem", color: "#555", background: "#f9fafb", padding: "1rem", borderRadius: "6px" }}>
          To upgrade your plan, contact us or set up a Stripe subscription via the billing portal.{" "}
          <span style={{ color: "#999" }}>(Billing portal link — see ACTION_ITEMS.md)</span>
        </p>
      )}
    </main>
  );
}
