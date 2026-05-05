import Link from "next/link";
import { getPool, getAllStores } from "@nfc/db";
import { CreateStoreForm } from "./CreateStoreForm.js";

interface PageProps {
  searchParams: Promise<{ add?: string }>;
}

const PLATFORM_LABELS: Record<string, string> = {
  shopify: "Shopify",
  woocommerce: "WooCommerce",
  squarespace: "Squarespace",
  other: "Other",
};

export default async function StoresPage({ searchParams }: PageProps) {
  const { add } = await searchParams;
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const stores = await getAllStores(pool);

  return (
    <div style={{ maxWidth: "600px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>All Stores</h1>
          <p style={{ color: "#666", fontSize: "0.9rem" }}>{stores.length} store{stores.length !== 1 ? "s" : ""}</p>
        </div>
        {!add && <CreateStoreForm />}
      </div>

      {add && <CreateStoreForm defaultOpen />}

      {stores.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>No stores yet. Add one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/products?shop=${store.shopify_shop_domain}`}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0.875rem 1rem", border: "1px solid #eee", borderRadius: "8px",
                background: "#fff", textDecoration: "none", color: "inherit",
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "2px" }}>{store.shopify_shop_domain}</p>
                <p style={{ fontSize: "0.75rem", color: "#aaa" }}>
                  {PLATFORM_LABELS[store.platform] ?? store.platform}
                  {" · Added "}
                  {new Date(store.created_at).toLocaleDateString()}
                </p>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#bbb" }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
