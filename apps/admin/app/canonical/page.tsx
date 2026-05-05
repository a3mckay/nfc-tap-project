import { getPool, getStoreByDomain, getProductsWithCanonicalStatus } from "@nfc/db";
import { ConfirmButton } from "./ConfirmButton.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function CanonicalPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Canonical Matching</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to review matches.</p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Canonical Matching</h1>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </main>
    );
  }

  const products = await getProductsWithCanonicalStatus(pool, store.id);
  const unreviewed = products.filter((p) => p.map_id && !p.reviewed);
  const matched = products.filter((p) => p.map_id && p.reviewed);
  const unmatched = products.filter((p) => !p.map_id);

  const th: React.CSSProperties = { padding: "0.5rem 0.75rem 0.5rem 0", textAlign: "left", fontWeight: 600, fontSize: "0.8rem" };
  const td: React.CSSProperties = { padding: "0.5rem 0.75rem 0.5rem 0", fontSize: "0.85rem", verticalAlign: "middle" };

  return (
    <main style={{ maxWidth: "800px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Canonical Matching</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        {shop} &mdash; {products.length} product{products.length !== 1 ? "s" : ""}:{" "}
        {matched.length} confirmed, {unreviewed.length} pending review, {unmatched.length} unmatched
      </p>

      {unreviewed.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem", background: "#fef3c7", padding: "0.4rem 0.75rem", borderRadius: "4px", display: "inline-block" }}>
            {unreviewed.length} pending review
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={th}>Product</th>
                <th style={th}>Matched to</th>
                <th style={th}>Brand</th>
                <th style={{ ...th, paddingLeft: "0.75rem" }}></th>
              </tr>
            </thead>
            <tbody>
              {unreviewed.map((p) => (
                <tr key={p.product_id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={td}>{p.product_title}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: "0.8rem", color: "#555" }}>{p.canonical_name}</td>
                  <td style={td}>{p.brand_name}</td>
                  <td style={{ ...td, paddingLeft: "0.75rem" }}>
                    <ConfirmButton mapId={p.map_id!} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {unmatched.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            {unmatched.length} unmatched — run the worker to process these
          </p>
          <ul style={{ fontSize: "0.85rem", color: "#888", listStyle: "disc", paddingLeft: "1.25rem" }}>
            {unmatched.map((p) => (
              <li key={p.product_id}>{p.product_title} {p.vendor ? `(${p.vendor})` : ""}</li>
            ))}
          </ul>
        </section>
      )}

      {matched.length > 0 && (
        <section>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#166534", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            {matched.length} confirmed
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={th}>Product</th>
                <th style={th}>Canonical name</th>
                <th style={th}>Brand</th>
              </tr>
            </thead>
            <tbody>
              {matched.map((p) => (
                <tr key={p.product_id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={td}>{p.product_title}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: "0.8rem", color: "#555" }}>{p.canonical_name}</td>
                  <td style={td}>{p.brand_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {products.length === 0 && (
        <p style={{ color: "#999" }}>No products found. Import the catalog via Shopify OAuth first.</p>
      )}
    </main>
  );
}
