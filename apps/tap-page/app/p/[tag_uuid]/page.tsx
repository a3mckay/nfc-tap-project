import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getPool, getTagByUuid, getProductById, getStoreById,
  insertTapEvent, getEnrichmentByProductId, getProductTapCount,
  upsertCustomerTap, getApprovedReviewsByProduct, getReviewAggregateByProduct,
  getApprovedAwardsByProduct, getApplicableOffer, recordOfferDelivery,
  getBrandCollectorForCustomer, getCategoryPatternForCustomer, getUntappedSameBrandProducts,
  type BrandCollectorInsight, type CategoryPatternInsight, type SimilarProductSuggestion,
} from "@nfc/db";
import { resolveTagState } from "@/tag-state.js";
import { buildThemeVars, type ThemeSettings } from "@/theme.js";
import { getCurrentCustomer } from "@/lib/auth.js";
import { FallbackPage } from "./FallbackPage.js";
import { ProductShell } from "./ProductShell.js";
import { ReactionBar } from "./ReactionBar.js";

interface Props {
  params: Promise<{ tag_uuid: string }>;
}

export default async function TapPage({ params }: Props) {
  const { tag_uuid } = await params;
  const pool = getPool({ connectionString: process.env.DATABASE_URL });

  const [tag, customer] = await Promise.all([
    getTagByUuid(pool, tag_uuid),
    getCurrentCustomer(),
  ]);
  const state = resolveTagState(tag);

  if (tag) {
    void recordTapEvent(pool, tag.id, tag.product_id, tag.store_id);
    if (customer && tag.product_id) {
      void upsertCustomerTap(pool, customer.id, tag.id, tag.product_id, tag.store_id, null);
    }
  }

  if (state.kind !== "active") {
    return <FallbackPage kind={state.kind} />;
  }

  const [product, store, enrichment, tapCount, externalReviews, reviewAggregate, externalAwards] = await Promise.all([
    getProductById(pool, state.productId),
    getStoreById(pool, state.storeId),
    getEnrichmentByProductId(pool, state.productId),
    getProductTapCount(pool, state.productId, 30),
    getApprovedReviewsByProduct(pool, state.productId),
    getReviewAggregateByProduct(pool, state.productId),
    getApprovedAwardsByProduct(pool, state.productId),
  ]);
  if (!product) notFound();

  const theme = (store?.theme_settings ?? {}) as Partial<ThemeSettings>;
  const cssVars = buildThemeVars(theme);
  const primaryColor = (theme as { primaryColor?: string }).primaryColor ?? "#000000";
  const scarcityThreshold = (store as unknown as { scarcity_threshold?: number })?.scarcity_threshold ?? 5;

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("nfc_session")?.value ?? "unknown";

  // Check for any applicable discount offer for this product/customer/session.
  const offer = await getApplicableOffer(pool, state.storeId, state.productId, sessionId, customer?.id ?? null);
  if (offer) {
    void recordOfferDelivery(pool, offer, customer?.id ?? null, sessionId).catch(() => {});
  }

  // Unity / Collector — only run for identified customers.
  let brandCollector: BrandCollectorInsight | null = null;
  let categoryPattern: CategoryPatternInsight | null = null;
  let sameBrand: SimilarProductSuggestion[] = [];
  if (customer && product.vendor) {
    [brandCollector, sameBrand] = await Promise.all([
      getBrandCollectorForCustomer(pool, customer.id, product.vendor),
      getUntappedSameBrandProducts(pool, customer.id, state.storeId, product.vendor, state.productId),
    ]);
  }
  if (customer && product.product_type) {
    categoryPattern = await getCategoryPatternForCustomer(pool, customer.id, product.product_type);
  }

  return (
    <div style={cssVars as React.CSSProperties}>
      <div style={{ paddingBottom: "4rem" }}>
        <ProductShell
          product={product}
          theme={theme}
          enrichment={enrichment}
          tapCount={tapCount}
          scarcityThreshold={scarcityThreshold}
          tagUuid={tag_uuid}
          storeName={store?.shopify_shop_domain ?? ""}
          isAuthenticated={!!customer}
          externalReviews={externalReviews}
          reviewAggregate={reviewAggregate}
          externalAwards={externalAwards}
          offer={offer ? { code: offer.code, message: offer.message, expires_at: offer.expires_at?.toISOString() ?? null } : null}
          brandCollector={brandCollector}
          categoryPattern={categoryPattern}
          sameBrand={sameBrand}
        />
      </div>
      <ReactionBar tagId={state.tagId} sessionId={sessionId} primaryColor={primaryColor} customerId={customer?.id ?? null} />
    </div>
  );
}

async function recordTapEvent(
  pool: ReturnType<typeof getPool>,
  tagId: string,
  productId: string | null,
  storeId: string,
): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("nfc_session")?.value ?? "unknown";
    const headerStore = await headers();
    const ua = headerStore.get("user-agent") ?? null;
    const deviceType = ua ? classifyDevice(ua) : null;
    await insertTapEvent(pool, { tag_id: tagId, product_id: productId, store_id: storeId, session_id: sessionId, device_type: deviceType });
  } catch {
    // Never let analytics failures surface to the customer
  }
}

function classifyDevice(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  return "desktop";
}
