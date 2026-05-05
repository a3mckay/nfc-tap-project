import Link from "next/link";
import {
  getPool,
  getStoreByDomain,
  getProductById,
  getEnrichmentByProductId,
} from "@nfc/db";
import { EnrichmentForm } from "./EnrichmentForm.js";
import { PublicSearchButton } from "./PublicSearchButton.js";
import { GenerateButton } from "./GenerateButton.js";
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

  const [product, enrichment] = await Promise.all([
    getProductById(pool, product_id),
    getEnrichmentByProductId(pool, product_id),
  ]);

  if (!product || product.store_id !== store.id) {
    return (
      <main>
        <p style={{ color: "#c00" }}>Product not found.</p>
      </main>
    );
  }

  const initial: EnrichmentFormData = {
    shop,
    product_id,
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
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
        Edit details
      </h1>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <GenerateButton shop={shop} productId={product_id} />
        <PublicSearchButton
          shop={shop}
          productId={product_id}
          publicReviewsEnabled={(store as unknown as { public_reviews_enabled?: boolean })?.public_reviews_enabled ?? false}
        />
      </div>

      <EnrichmentForm
        initial={initial}
        productTitle={product.title}
        isAiGenerated={enrichment?.ai_generated ?? false}
      />
    </main>
  );
}
