import { getPool, getStoreByDomain, getReviewSourcesByStore, getPendingReviewsByStore, getPendingAwardsByStore } from "@nfc/db";
import { ReviewsManager } from "./ReviewsManager.js";
import { PublicReviewsSection } from "./PublicReviewsSection.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return <main><p style={{ color: "#666" }}>Pass <code>?shop=</code> to continue.</p></main>;
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) {
    return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;
  }

  const [sources, pendingReviews, pendingAwards] = await Promise.all([
    getReviewSourcesByStore(pool, store.id),
    getPendingReviewsByStore(pool, store.id),
    getPendingAwardsByStore(pool, store.id),
  ]);
  const publicReviewsEnabled = (store as unknown as { public_reviews_enabled?: boolean })?.public_reviews_enabled ?? false;

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Reviews</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Connect your review provider to automatically display real customer reviews on tap pages.
      </p>
      <PublicReviewsSection
        shop={shop}
        initialEnabled={publicReviewsEnabled}
        pendingCount={pendingReviews.length + pendingAwards.length}
      />
      <ReviewsManager shop={shop} initialSources={sources} platform={store.platform} />
    </main>
  );
}
