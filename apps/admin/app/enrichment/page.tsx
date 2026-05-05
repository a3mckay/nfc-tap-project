import Link from "next/link";
import { getPool, getStoreByDomain, getProductsWithEnrichmentStatus } from "@nfc/db";
import { BulkGenerateButton } from "./BulkGenerateButton.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function EnrichmentPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Content Enrichment</h1>
        <p style={{ color: "#666" }}>
          Pass <code>?shop=your-store.myshopify.com</code> to manage a store&apos;s product copy.
        </p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Content Enrichment</h1>
        <p style={{ color: "#c00" }}>Store not found — connect it via Shopify OAuth first.</p>
      </main>
    );
  }

  const products = await getProductsWithEnrichmentStatus(pool, store.id);

  const enriched = products.filter((p) => p.enrichment_id !== null);
  const unenriched = products.filter((p) => p.enrichment_id === null);

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Content Enrichment</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        {shop} &mdash; {products.length} product{products.length !== 1 ? "s" : ""},{" "}
        {enriched.length} enriched
      </p>

      {unenriched.length > 0 && (
        <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", background: "#fef3c7", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.85rem", color: "#b45309" }}>
            {unenriched.length} product{unenriched.length !== 1 ? "s" : ""} still need copy.
          </p>
          <BulkGenerateButton shop={shop} productIds={unenriched.map((p) => p.id)} />
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #eee", textAlign: "left" }}>
            <th style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>Product</th>
            <th style={{ padding: "0.5rem 0.75rem" }}>Status</th>
            <th style={{ padding: "0.5rem 0" }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const badge = p.enrichment_id === null
              ? { label: "Missing", color: "#c00", bg: "#fff0f0" }
              : p.ai_generated
                ? { label: "AI generated", color: "#0369a1", bg: "#e0f2fe" }
                : { label: "Staff edited", color: "#166534", bg: "#dcfce7" };

            return (
              <tr key={p.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={{ padding: "0.6rem 0.75rem 0.6rem 0" }}>
                  <span style={{ fontWeight: 500 }}>{p.title}</span>
                  {p.vendor && (
                    <span style={{ color: "#888", marginLeft: "0.5rem", fontSize: "0.8rem" }}>{p.vendor}</span>
                  )}
                </td>
                <td style={{ padding: "0.6rem 0.75rem" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "99px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: badge.color,
                    background: badge.bg,
                  }}>
                    {badge.label}
                  </span>
                </td>
                <td style={{ padding: "0.6rem 0" }}>
                  <Link
                    href={`/enrichment/${p.id}?shop=${shop}`}
                    style={{ fontSize: "0.85rem", color: "#555" }}
                  >
                    {p.enrichment_id ? "Edit" : "Add"} copy →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {products.length === 0 && (
        <p style={{ color: "#999", marginTop: "1rem" }}>
          No products found. Import the catalog via Shopify OAuth first.
        </p>
      )}
    </main>
  );
}
