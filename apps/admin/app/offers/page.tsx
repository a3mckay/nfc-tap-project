import { getPool, getStoreByDomain, getStoreOffersByStore, getProductsWithStatus } from "@nfc/db";
import { OffersManager } from "./OffersManager.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function OffersPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;
  if (!shop) return <main><p>Pass <code>?shop=</code></p></main>;

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;

  const [offers, products] = await Promise.all([
    getStoreOffersByStore(pool, store.id),
    getProductsWithStatus(pool, store.id),
  ]);

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Offers</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Reward customers when they tap. Codes appear as a slide-up card on the tap page.
      </p>
      <OffersManager
        shop={shop}
        offers={offers}
        products={products.filter((p) => !p.is_archived).map((p) => ({ id: p.id, title: p.title }))}
      />
    </main>
  );
}
