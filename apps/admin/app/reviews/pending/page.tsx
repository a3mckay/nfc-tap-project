import Link from "next/link";
import { getPool, getStoreByDomain, getPendingReviewsByStore, getPendingAwardsByStore } from "@nfc/db";
import { PendingItem } from "./PendingItem.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function PendingPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;
  if (!shop) return <main><p>Pass <code>?shop=</code></p></main>;

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;

  const [reviews, awards] = await Promise.all([
    getPendingReviewsByStore(pool, store.id),
    getPendingAwardsByStore(pool, store.id),
  ]);

  return (
    <main>
      <p style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        <Link href={`/reviews?shop=${shop}`} style={{ color: "#555" }}>← Reviews</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Pending approvals</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Reviews and awards we found from public web search. Approve to display on your tap pages.
      </p>

      {reviews.length === 0 && awards.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>
          Nothing pending. Run a public search from a product&apos;s edit page to find reviews and awards.
        </p>
      ) : (
        <>
          {reviews.length > 0 && (
            <section style={{ marginBottom: "2rem" }}>
              <h2 style={{ fontSize: "0.78rem", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                Reviews ({reviews.length})
              </h2>
              {reviews.map((r) => (
                <PendingItem
                  key={r.id}
                  kind="review"
                  id={r.id}
                  productTitle={r.product_title}
                  sourceLabel={r.source_label}
                  sourceUrl={r.source_url}
                  body={r.body}
                  rating={r.rating}
                  author={r.author}
                />
              ))}
            </section>
          )}
          {awards.length > 0 && (
            <section>
              <h2 style={{ fontSize: "0.78rem", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
                Awards ({awards.length})
              </h2>
              {awards.map((a) => (
                <PendingItem
                  key={a.id}
                  kind="award"
                  id={a.id}
                  productTitle={a.product_title}
                  sourceLabel={a.source_label}
                  sourceUrl={a.source_url}
                  body={a.title}
                  awardingBody={a.awarding_body}
                  year={a.year}
                />
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
