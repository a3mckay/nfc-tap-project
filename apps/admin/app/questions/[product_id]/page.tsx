import Link from "next/link";
import { getPool, getStoreByDomain, getProductQuestionView, markProductReviewed } from "@nfc/db";
import { QuestionsView } from "./QuestionsView.js";

// PRD v4 §7 Step 15g: one product's questions, grouped by theme by default with a
// verbatim view (D8). Opening it clears the product's "new" badge.
interface PageProps {
  params: Promise<{ product_id: string }>;
  searchParams: Promise<{ shop?: string }>;
}

export default async function ProductQuestionsPage({ params, searchParams }: PageProps) {
  const [{ product_id }, { shop }] = await Promise.all([params, searchParams]);
  if (!shop) return <main><p style={{ color: "#666" }}>Pass <code>?shop=…</code> in the URL.</p></main>;
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;
  const view = await getProductQuestionView(pool, store.id, product_id);
  if (!view) return <main><p style={{ color: "#c00" }}>Product not found.</p></main>;
  await markProductReviewed(pool, store.id, product_id);

  return (
    <main style={{ maxWidth: "860px" }}>
      <p style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        <Link href={`/questions?shop=${encodeURIComponent(shop)}`} style={{ color: "#555" }}>← All questions</Link>
      </p>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 1rem" }}>{view.product.title}</h1>
      <QuestionsView
        shop={shop}
        productId={product_id}
        themes={view.themes.map((t) => ({ ...t, last_asked: new Date(t.last_asked).toISOString() }))}
        questions={view.questions.map((q) => ({ ...q, created_at: new Date(q.created_at).toISOString() }))}
        answers={view.answers.map((a) => ({ id: a.id, scope: a.product_id ? "product" : "store", question: a.question, answer: a.answer }))}
      />
    </main>
  );
}
