import Link from "next/link";
import { getPool, getStoreByDomain, getProductById, getProductTraining, getReviewFlags, getSpecSetup, specCategoryFor, copyFor } from "@nfc/db";
import { ReviewFlags } from "../ReviewFlags.js";
import { ProductTabs } from "@/ProductTabs.js";
import { TrainingForm } from "../TrainingForm.js";

interface PageProps {
  params: Promise<{ product_id: string }>;
  searchParams: Promise<{ shop?: string }>;
}

// Staff training notes for one product (PRD v4 §7 Step 13e), on their own page.
export default async function TrainingNotesPage({ params, searchParams }: PageProps) {
  const [{ product_id }, { shop }] = await Promise.all([params, searchParams]);
  if (!shop) return <main><p style={{ color: "#666" }}>Pass <code>?shop=…</code> in the URL.</p></main>;

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;

  const [product, training, flags, specSetup] = await Promise.all([
    getProductById(pool, product_id),
    getProductTraining(pool, product_id, store.id),
    getReviewFlags(pool, store.id, product_id),
    getSpecSetup(pool, store.id, product_id),
  ]);
  // Labels and examples follow the product's category (docs/category-labels.md).
  const copy = copyFor(specSetup ? specCategoryFor(specSetup) : "general");
  if (!product || product.store_id !== store.id) {
    return <main><p style={{ color: "#c00" }}>Product not found.</p></main>;
  }

  return (
    <main>
      <p style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        <Link href={`/products?shop=${shop}`} style={{ color: "#555" }}>← All products</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 1rem" }}>{product.title}</h1>
      <ProductTabs shop={shop} productId={product_id} current="training" />
      <ReviewFlags flags={flags} />

      <TrainingForm
        shop={shop}
        productId={product_id}
        aiAvailable={!!process.env.ANTHROPIC_API_KEY}
        trainingCopy={copy.training}
        stockNoteUpdatedAt={training?.stock_note_updated_at?.toISOString() ?? null}
        initial={{
          one_line_sell: training?.one_line_sell ?? "",
          who_its_for: training?.who_its_for ?? "",
          who_its_not_for: training?.who_its_not_for ?? "",
          fit_and_sizing: training?.fit_and_sizing ?? "",
          worth_the_price: [...(training?.worth_the_price ?? []), "", "", ""].slice(0, 3),
          closest_alternative: training?.closest_alternative ?? "",
          common_questions: training?.common_questions ?? [],
          companion_products: training?.companion_products ?? "",
          brand_context: training?.brand_context ?? "",
          stock_note: training?.stock_note ?? "",
        }}
      />
    </main>
  );
}
