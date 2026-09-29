import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getPool, getTagByUuid, getProductById, getStoreById,
  insertTapEvent, getEnrichmentByProductId, getProductTapCount,
  upsertCustomerTap, getApprovedReviewsByProduct, getReviewAggregateByProduct,
  getApprovedAwardsByProduct, getApplicableOffer, recordOfferDelivery,
  getBrandCollectorForCustomer, getCategoryPatternForCustomer, getUntappedSameBrandProducts,
  getProductTraining,
  type BrandCollectorInsight, type CategoryPatternInsight, type SimilarProductSuggestion,
} from "@nfc/db";
import { resolveTagState } from "@/tag-state.js";
import { buildThemeVars, type ThemeSettings } from "@/theme.js";
import { getCurrentCustomer } from "@/lib/auth.js";
import { getCurrentStaff } from "@/lib/staff-auth.js";
import { decideTapView, trainingSections, stockNoteAge } from "@/staff-view.js";
import { StaffShell } from "./StaffShell.js";
import { FallbackPage } from "./FallbackPage.js";
import { ProductShell } from "./ProductShell.js";
import { ReactionBar } from "./ReactionBar.js";
import { PicksBar, type LocalTap } from "./PicksBar.js";
import { AskUs } from "./AskUs.js";
import { NotifyMe } from "./NotifyMe.js";

interface Props {
  params: Promise<{ tag_uuid: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function TapPage({ params, searchParams }: Props) {
  const [{ tag_uuid }, { view: viewParam }] = await Promise.all([params, searchParams]);
  const pool = getPool({ connectionString: process.env.DATABASE_URL });

  const [tag, customer, staff] = await Promise.all([
    getTagByUuid(pool, tag_uuid),
    getCurrentCustomer(),
    getCurrentStaff(),
  ]);
  const state = resolveTagState(tag);

  // Staff and owners of this store never count as customer taps (PRD v4 §7 Step 13d).
  const isTeam = !!staff && !!tag && staff.storeId === tag.store_id;

  if (tag && !isTeam) {
    void recordTapEvent(pool, tag.id, tag.product_id, tag.store_id);
    if (customer && tag.product_id) {
      void upsertCustomerTap(pool, customer.id, tag.id, tag.product_id, tag.store_id, null);
    }
  }

  if (state.kind !== "active") {
    return <FallbackPage kind={state.kind} />;
  }

  const view = decideTapView(staff, state.storeId, viewParam);

  if (view === "training") {
    const [product, store, enrichment, training] = await Promise.all([
      getProductById(pool, state.productId),
      getStoreById(pool, state.storeId),
      getEnrichmentByProductId(pool, state.productId),
      getProductTraining(pool, state.productId, state.storeId),
    ]);
    if (!product) notFound();
    const { sections, hasOwnerNotes } = trainingSections(training, enrichment);
    const theme = (store?.theme_settings ?? {}) as { primaryColor?: string };
    return (
      <StaffShell
        product={product}
        storeName={store?.name ?? store?.shopify_shop_domain ?? ""}
        primaryColor={theme.primaryColor ?? "#000000"}
        sections={sections}
        hasOwnerNotes={hasOwnerNotes}
        stockNoteAge={stockNoteAge(training?.stock_note_updated_at ?? null)}
        customerViewHref={`/p/${tag_uuid}?view=customer`}
      />
    );
  }
  const isPreview = view === "preview";

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
  // Staff previewing the customer page never get (or use up) an offer.
  const offer = isPreview ? null : await getApplicableOffer(pool, state.storeId, state.productId, sessionId, customer?.id ?? null);
  if (offer) {
    void recordOfferDelivery(pool, offer, customer?.id ?? null, sessionId).catch((err) => {
      console.error("[tap] recordOfferDelivery failed:", err);
    });
  }

  // Unity / Collector — only run for identified customers.
  let brandCollector: BrandCollectorInsight | null = null;
  let categoryPattern: CategoryPatternInsight | null = null;
  let sameBrand: SimilarProductSuggestion[] = [];
  if (customer && !isPreview && product.vendor) {
    [brandCollector, sameBrand] = await Promise.all([
      getBrandCollectorForCustomer(pool, customer.id, product.vendor),
      getUntappedSameBrandProducts(pool, customer.id, state.storeId, product.vendor, state.productId),
    ]);
  }
  if (customer && !isPreview && product.product_type) {
    categoryPattern = await getCategoryPatternForCustomer(pool, customer.id, product.product_type);
  }

  // Shopify REST API uses "src"; Storefront API and manual entries use "url"
  type ProductImage = { url?: string; src?: string; altText: string | null };
  const productImages: ProductImage[] = Array.isArray(product.images) ? product.images as ProductImage[] : [];
  const primaryImageUrl =
    productImages[0]?.url ?? productImages[0]?.src ?? enrichment?.extra_images?.[0] ?? null;
  const currentTap: LocalTap = {
    tagUuid: tag_uuid,
    productTitle: product.title,
    productImageUrl: primaryImageUrl,
    tappedAt: Date.now(),
  };

  return (
    <div style={cssVars as React.CSSProperties}>
      {isPreview && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", padding: "0.7rem 1rem", background: "#111", color: "#fff" }}>
          <span style={{ fontSize: "0.75rem" }}>Customer preview · reactions and sign-ups are off</span>
          <a href={`/p/${tag_uuid}`} style={{ fontSize: "0.8rem", color: "#fff", textDecoration: "underline", whiteSpace: "nowrap" }}>← Training view</a>
        </div>
      )}
      {/* Back to collection — only shown to signed-in customers */}
      {customer && !isPreview && (
        <div style={{ padding: "0.75rem 1.25rem 0" }}>
          <a href="/me" style={{ fontSize: "0.8rem", color: "#888", textDecoration: "none" }}>
            ← Your Collection
          </a>
        </div>
      )}
      {/* Extra bottom padding for both fixed bars (PicksBar + ReactionBar) */}
      <div style={{ paddingBottom: "9rem" }}>
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
        <AskUs
          productTitle={product.title}
          storeName={store?.shopify_shop_domain ?? ""}
          whatsappNumber={store?.whatsapp_number ?? null}
          smsNumber={store?.sms_number ?? null}
        />
        {!isPreview && <NotifyMe
          storeId={state.storeId}
          productId={state.productId}
          sessionId={sessionId}
          customerId={customer?.id ?? null}
          customerPhone={customer?.phone ?? null}
          customerEmail={customer?.email ?? null}
          primaryColor={primaryColor}
        />}
      </div>
      {!isPreview && <PicksBar currentTap={currentTap} primaryColor={primaryColor} />}
      {!isPreview && <ReactionBar tagId={state.tagId} sessionId={sessionId} primaryColor={primaryColor} customerId={customer?.id ?? null} />}
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
  } catch (err) {
    console.error("[tap] recordTapEvent failed:", err);
  }
}

function classifyDevice(ua: string): string {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "mobile";
  return "desktop";
}
