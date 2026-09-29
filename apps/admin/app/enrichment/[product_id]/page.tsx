import Link from "next/link";
import {
  getPool,
  getStoreByDomain,
  getProductById,
  getEnrichmentByProductId,
  getProductTraining,
} from "@nfc/db";
import { EnrichmentPageClient } from "./EnrichmentPageClient.js";
import { TrainingForm } from "./TrainingForm.js";
import type { EnrichmentFormData } from "./actions.js";
import {
  formatReasonsForEdit,
  formatExtraImagesForEdit,
} from "../../../src/enrichment-utils.js";

interface PageProps {
  params: Promise<{ product_id: string }>;
  searchParams: Promise<{ shop?: string }>;
}

export default async function EnrichmentEditPage({ params, searchParams }: PageProps) {
  const { product_id } = await params;
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <p style={{ color: "#666" }}>Pass <code>?shop=…</code> in the URL.</p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </main>
    );
  }

  const [product, enrichment, training] = await Promise.all([
    getProductById(pool, product_id),
    getEnrichmentByProductId(pool, product_id),
    getProductTraining(pool, product_id, store.id),
  ]);

  if (!product || product.store_id !== store.id) {
    return (
      <main>
        <p style={{ color: "#c00" }}>Product not found.</p>
      </main>
    );
  }

  const productImages = product.images as Array<{ url: string; altText: string | null }> | null;

  const initial: EnrichmentFormData = {
    shop,
    product_id,
    is_manual: product.is_manual,
    product_title: product.title ?? "",
    primary_image_url: productImages?.[0]?.url ?? "",
    backstory: enrichment?.backstory ?? "",
    fit_notes: enrichment?.fit_notes ?? "",
    materials: enrichment?.materials ?? "",
    care_instructions: enrichment?.care_instructions ?? "",
    sustainability_notes: enrichment?.sustainability_notes ?? "",
    reasons_to_buy_text: formatReasonsForEdit(enrichment?.reasons_to_buy ?? []),
    staff_quote: enrichment?.staff_quote ?? "",
    staff_name: enrichment?.staff_name ?? "",
    staff_photo_url: enrichment?.staff_photo_url ?? "",
    video_url: enrichment?.video_url ?? "",
    extra_images_text: formatExtraImagesForEdit(enrichment?.extra_images ?? []),
    reviews: enrichment?.reviews ?? [],
    awards_text: formatReasonsForEdit(enrichment?.awards ?? []),
    faq: enrichment?.faq ?? [],
    internal_staff_notes: enrichment?.internal_staff_notes ?? "",
  };

  return (
    <main>
      <p style={{ marginBottom: "1rem", fontSize: "0.85rem" }}>
        <Link href={`/products?shop=${shop}`} style={{ color: "#555" }}>
          ← All products
        </Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          Edit details
        </h1>
        <a href="#staff-training" style={{ fontSize: "0.85rem", color: "#555" }}>Staff training ↓</a>
      </div>

      <EnrichmentPageClient
        shop={shop}
        productId={product_id}
        initial={initial}
        productTitle={product.title}
        isAiGenerated={enrichment?.ai_generated ?? false}
        publicReviewsEnabled={(store as unknown as { public_reviews_enabled?: boolean })?.public_reviews_enabled ?? false}
      />

      <TrainingForm
        shop={shop}
        productId={product_id}
        aiAvailable={!!process.env.ANTHROPIC_API_KEY}
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
