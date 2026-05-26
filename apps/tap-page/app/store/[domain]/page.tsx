import { getPool, getStoreByDomain, type Pool } from "@nfc/db";
import { getCurrentCustomer } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ domain: string }>;
}

interface StoreProduct {
  id: string;
  title: string;
  vendor: string | null;
  product_image_url: string | null;
  tag_uuid: string | null;
  tapped: boolean;
  reaction: string | null;
}

async function getStoreProducts(pool: Pool, storeId: string, customerId: string | null): Promise<StoreProduct[]> {
  const { rows } = await pool.query<StoreProduct>(
    `select p.id, p.title, p.vendor,
            coalesce(p.images->0->>'url', p.images->0->>'src', e.extra_images->>0) as product_image_url,
            (select t.tag_uuid from tags t
              where t.product_id = p.id and t.status = 'deployed'
              limit 1) as tag_uuid,
            ($2::uuid is not null and exists (
              select 1 from customer_taps ct
               where ct.customer_id = $2 and ct.product_id = p.id
            )) as tapped,
            (select ct.reaction from customer_taps ct
              where ct.customer_id = $2 and ct.product_id = p.id
              limit 1) as reaction
     from products p
     left join enrichments e on e.product_id = p.id
     where p.store_id = $1
       and p.status = 'active'
       and p.deleted_at is null
     order by p.created_at desc`,
    [storeId, customerId],
  );
  return rows;
}

export default async function StorePage({ params }: PageProps) {
  const { domain } = await params;
  const pool = getPool({ connectionString: process.env.DATABASE_URL });

  const [store, customer] = await Promise.all([
    getStoreByDomain(pool, domain),
    getCurrentCustomer(),
  ]);

  if (!store) {
    return (
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.9rem", color: "#888" }}>Store not found.</p>
      </main>
    );
  }

  const products = await getStoreProducts(pool, store.id, customer?.id ?? null);
  const tappedCount = products.filter((p) => p.tapped).length;

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Back */}
      <a href="/me" style={{ fontSize: "0.8rem", color: "#888", textDecoration: "none", display: "inline-block", marginBottom: "1.5rem" }}>
        ← Your Collection
      </a>

      {/* Store header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111" }}>
          {(store as { name?: string | null }).name ?? domain}
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.25rem" }}>
          {tappedCount > 0
            ? `You've tapped ${tappedCount} product${tappedCount === 1 ? "" : "s"} from this store`
            : "Explore this store's products"}
        </p>
      </div>

      {/* Products grid */}
      {products.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "#888", textAlign: "center", padding: "2rem 0" }}>
          No products available yet.
        </p>
      ) : (
        <>
          {/* Tapped products first */}
          {tappedCount > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <h2 style={sectionHeading}>Your taps</h2>
              <ProductGrid products={products.filter((p) => p.tapped)} />
            </section>
          )}

          {/* Untapped products */}
          {products.filter((p) => !p.tapped).length > 0 && (
            <section>
              <h2 style={sectionHeading}>
                {tappedCount > 0 ? "More from this store" : "All products"}
              </h2>
              <ProductGrid products={products.filter((p) => !p.tapped)} />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function ProductGrid({ products }: { products: StoreProduct[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
      {products.map((p) => (
        <a
          key={p.id}
          href={p.tag_uuid ? `/p/${p.tag_uuid}` : "#"}
          style={{ textDecoration: "none", color: "inherit", opacity: p.tag_uuid ? 1 : 0.6 }}
        >
          <div style={{
            width: "100%", aspectRatio: "1/1", borderRadius: "8px",
            background: p.product_image_url ? `url(${p.product_image_url}) center/cover` : "#f0f0f0",
            marginBottom: "6px", position: "relative",
          }}>
            {p.reaction === "loved" && (
              <span style={{
                position: "absolute", top: "6px", right: "6px",
                background: "#fff", borderRadius: "50%", width: "22px", height: "22px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              }}>♥</span>
            )}
            {!p.tapped && (
              <span style={{
                position: "absolute", bottom: "6px", left: "6px",
                background: "rgba(0,0,0,0.55)", borderRadius: "99px",
                padding: "1px 6px", fontSize: "0.6rem", fontWeight: 600, color: "#fff",
              }}>New</span>
            )}
          </div>
          <p style={{
            fontSize: "0.78rem", fontWeight: 500, color: "#111", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          }}>
            {p.title ?? "Untitled product"}
          </p>
          {p.vendor && <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "2px" }}>{p.vendor}</p>}
        </a>
      ))}
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: "0.75rem", fontWeight: 600, color: "#666",
  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem",
};
