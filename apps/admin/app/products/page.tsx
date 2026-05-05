import { getPool, getStoreByDomain, getProductsWithStatus } from "@nfc/db";
import type { ProductWithStatus } from "@nfc/db";
import Link from "next/link";
import { PreviewButton } from "./PreviewButton.js";
import { SyncButton } from "./SyncButton.js";
import { InventoryCell } from "./InventoryCell.js";

interface PageProps {
  searchParams: Promise<{ shop?: string; archived?: string }>;
}

const TAP_PAGE_URL = process.env.TAP_PAGE_CDN_URL ?? "http://localhost:3001";

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "0.72rem",
  fontWeight: 600,
  color: "#888",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  padding: "0.5rem 0.75rem",
  borderBottom: "2px solid #eee",
};
const tdStyle: React.CSSProperties = { padding: "0.75rem", verticalAlign: "middle", borderBottom: "1px solid #f4f4f4" };
const linkStyle: React.CSSProperties = { fontSize: "0.78rem", color: "#555", textDecoration: "none" };

function InfoCell({ p, shop }: { p: ProductWithStatus; shop: string }) {
  const href = `/enrichment/${p.id}?shop=${shop}`;
  return (
    <Link href={href} style={linkStyle}>
      {p.enrichment_id ? "Edit →" : "Add →"}
    </Link>
  );
}

function TagIdCell({ p, shop }: { p: ProductWithStatus; shop: string }) {
  if (!p.active_tag_uuid || !p.active_tag_id) {
    return <span style={{ fontSize: "0.78rem", color: "#bbb" }}>No tag</span>;
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#555", background: "#f5f5f5", padding: "2px 6px", borderRadius: "3px" }}>
        {p.active_tag_uuid}
      </span>
      <Link href={`/tags/${p.active_tag_id}?shop=${shop}`} style={linkStyle}>Edit →</Link>
    </div>
  );
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { shop, archived } = await searchParams;
  const showArchived = archived === "1";

  if (!shop) {
    return (
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Products</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to view products.</p>
      </div>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <div>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Products</h1>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </div>
    );
  }

  const isNonShopify = store.platform !== "shopify";
  const products = await getProductsWithStatus(pool, store.id, showArchived);
  const activeCount = products.filter((p) => !p.is_archived).length;
  const archivedCount = products.filter((p) => p.is_archived).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Products</h1>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>
            {activeCount} product{activeCount !== 1 ? "s" : ""}
            {archivedCount > 0 && (
              <>
                {" · "}
                <Link href={`/products?shop=${shop}${showArchived ? "" : "&archived=1"}`}
                  style={{ color: "#888", fontSize: "0.85rem" }}>
                  {showArchived ? "Hide archived" : `${archivedCount} archived`}
                </Link>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {store.platform === "shopify" ? (
            <SyncButton shop={shop} />
          ) : (
            <Link href={`/products/import?shop=${shop}`}
              style={{
                padding: "0.45rem 1rem", background: "#fff", color: "#111",
                border: "1px solid #ddd", borderRadius: "4px", fontSize: "0.82rem", fontWeight: 600,
                textDecoration: "none", whiteSpace: "nowrap",
              }}>
              Import CSV
            </Link>
          )}
          <Link href={`/products/new?shop=${shop}`}
            style={{
              padding: "0.45rem 1rem", background: "#111", color: "#fff",
              borderRadius: "4px", fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", whiteSpace: "nowrap",
            }}>
            + Add Product
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          No products yet.{" "}
          <Link href={`/products/new?shop=${shop}`} style={{ color: "#555" }}>Add one manually</Link>
          {isNonShopify
            ? <> or <Link href={`/products/import?shop=${shop}`} style={{ color: "#555" }}>import via CSV</Link>.</>
            : " or use Sync with Shopify to import your catalog."}
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr>
                <th style={thStyle}>Product</th>
                <th style={thStyle}>Product Information</th>
                <th style={thStyle}>Tag ID</th>
                {isNonShopify && <th style={thStyle}>Stock</th>}
                <th style={thStyle}>Preview</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ opacity: p.is_archived ? 0.5 : 1 }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 500, color: "#111" }}>{p.title}</span>
                      {p.is_manual && (
                        <span style={{ fontSize: "0.62rem", padding: "1px 5px", background: "#f0f0f0", color: "#666", borderRadius: "3px", fontWeight: 600 }}>
                          Manual
                        </span>
                      )}
                      {p.is_archived && (
                        <span style={{ fontSize: "0.62rem", padding: "1px 5px", background: "#fef2f2", color: "#991b1b", borderRadius: "3px", fontWeight: 600 }}>
                          Archived
                        </span>
                      )}
                    </div>
                    {p.vendor && <div style={{ fontSize: "0.78rem", color: "#888", marginTop: "2px" }}>{p.vendor}</div>}
                  </td>
                  <td style={tdStyle}><InfoCell p={p} shop={shop} /></td>
                  <td style={tdStyle}><TagIdCell p={p} shop={shop} /></td>
                  {isNonShopify && (
                    <td style={tdStyle}>
                      <InventoryCell productId={p.id} shop={shop} initialQty={p.inventory_quantity} />
                    </td>
                  )}
                  <td style={tdStyle}>
                    {p.active_tag_uuid
                      ? <PreviewButton tagUuid={p.active_tag_uuid} tapPageUrl={TAP_PAGE_URL} />
                      : <span style={{ fontSize: "0.78rem", color: "#bbb" }}>No active tag</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
