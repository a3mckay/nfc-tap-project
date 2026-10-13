import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import {
  getPool, getTagByUuid, getProductById, getStoreById,
  insertTapEvent, getEnrichmentByProductId, getProductTapCount,
  upsertCustomerTap, getApprovedReviewsByProduct, getReviewAggregateByProduct,
  getApprovedAwardsByProduct, getApplicableOffer, recordOfferDelivery,
  getBrandCollectorForCustomer, getCategoryPatternForCustomer, getUntappedSameBrandProducts,
  getProductTraining, recordStaffProductView, getProductQuestionView,
  copyFor,
  type BrandCollectorInsight, type CategoryPatternInsight, type SimilarProductSuggestion,
} from "@nfc/db";
import { resolveTagState } from "@/tag-state.js";
import { buildThemeVars, type ThemeSettings } from "@/theme.js";
import { getCurrentCustomer } from "@/lib/auth.js";
import { getCurrentStaff } from "@/lib/staff-auth.js";
import { decideTapView, trainingSections, stockNoteAge, staffViewToRecord } from "@/staff-view.js";
import { StaffShell } from "./StaffShell.js";
import { StaffViewToggle } from "./StaffViewToggle.js";
import { FallbackPage } from "./FallbackPage.js";
import { ProductShell } from "./ProductShell.js";
import { ReactionBar } from "./ReactionBar.js";
import { PicksBar, type LocalTap } from "./PicksBar.js";
import { AskBar } from "./AskBar.js";
import { suggestedQuestions } from "@/ask/client.js";
import { isAutomatedVisit } from "@/link-preview-bots.js";
import { shareMetadata } from "@/share-meta.js";
import { NotifyMe } from "./NotifyMe.js";
import { productCategory, withoutTestimonials, needsAgeGate, ageGateMetadata, AGE_COOKIE, CANNABIS_MIN_AGE } from "@/cannabis.js";
import { AgeGate } from "../../AgeGate.js";

// Customer-page headings in the product's category's words (docs/category-labels.md).
function detailLabels(category: Parameters<typeof copyFor>[0]) {
  const { fields } = copyFor(category);
  return {
    materials: fields.materials.label, fit: fields.fit_notes.label,
    care: fields.care_instructions.label, sustainability: fields.sustainability_notes.label,
  };
}

interface Props {
  params: Promise<{ tag_uuid: string }>;
  searchParams: Promise<{ view?: string }>;
}

// The title and preview shown when the link is shared, and in the browser tab.
export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { tag_uuid } = await params;
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const state = resolveTagState(await getTagByUuid(pool, tag_uuid));
  if (state.kind !== "active") return { title: "TapShelf" };
  const [product, store, enrichment] = await Promise.all([
    getProductById(pool, state.productId),
    getStoreById(pool, state.storeId),
    getEnrichmentByProductId(pool, state.productId),
  ]);
  if (!product) return { title: "TapShelf" };
  if (productCategory(product, store) === "cannabis") return ageGateMetadata(store?.name ?? "");
  return shareMetadata({
    title: product.title,
    vendor: product.vendor,
    images: (product.images ?? []) as Array<{ url: string }>,
    storeName: store?.name ?? store?.shopify_shop_domain ?? "",
    greatWhen: enrichment?.great_when ?? [],
    reasonsToBuy: enrichment?.reasons_to_buy ?? [],
  });
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
    const viewed = staffViewToRecord(view, staff, state.productId);
    if (viewed) {
      void recordStaffProductView(pool, viewed).catch((err) => console.error("[tap] recordStaffProductView failed:", err));
    }
    const [product, store, enrichment, training, questions] = await Promise.all([
      getProductById(pool, state.productId),
      getStoreById(pool, state.storeId),
      getEnrichmentByProductId(pool, state.productId),
      getProductTraining(pool, state.productId, state.storeId),
      getProductQuestionView(pool, state.storeId, state.productId),
    ]);
    if (!product) notFound();
    const { fields: f, training: tr } = copyFor(productCategory(product, store));
    const { sections, hasOwnerNotes } = trainingSections(training, enrichment, {
      fit: f.fit_notes.label, materials: f.materials.label, truth: tr.truth.label,
    });
    const theme = (store?.theme_settings ?? {}) as { primaryColor?: string };
    return (
      <StaffShell
        product={product}
        storeName={store?.name ?? store?.shopify_shop_domain ?? ""}
        primaryColor={theme.primaryColor ?? "#000000"}
        sections={sections}
        hasOwnerNotes={hasOwnerNotes}
        stockNoteAge={stockNoteAge(training?.stock_note_updated_at ?? null)}
        tagUuid={tag_uuid}
        customersAsking={(questions?.themes ?? []).filter((t) => t.id).slice(0, 5).map((t) => ({ label: t.label, count: t.count, answer: t.latest_answer }))}
        totalQuestions={(questions?.themes ?? []).reduce((n, t) => n + t.count, 0)}
      />
    );
  }
  const isPreview = view === "preview";

  const [product, store, rawEnrichment, tapCount, rawExternalReviews, rawReviewAggregate, externalAwards] = await Promise.all([
    getProductById(pool, state.productId),
    getStoreById(pool, state.storeId),
    getEnrichmentByProductId(pool, state.productId),
    getProductTapCount(pool, state.productId, 30),
    getApprovedReviewsByProduct(pool, state.productId),
    getReviewAggregateByProduct(pool, state.productId),
    getApprovedAwardsByProduct(pool, state.productId),
  ]);
  if (!product) notFound();
  const category = productCategory(product, store);
  const cookieStore = await cookies();
  if (needsAgeGate(category, cookieStore.get(AGE_COOKIE)?.value, isTeam)) {
    return <AgeGate storeName={store?.name ?? ""} minAge={CANNABIS_MIN_AGE} />;
  }
  const { enrichment, externalReviews, reviewAggregate } = withoutTestimonials(category, {
    enrichment: rawEnrichment, externalReviews: rawExternalReviews, reviewAggregate: rawReviewAggregate,
  });

  const theme = (store?.theme_settings ?? {}) as Partial<ThemeSettings>;
  const cssVars = buildThemeVars(theme);
  const primaryColor = (theme as { primaryColor?: string }).primaryColor ?? "#000000";
  const scarcityThreshold = (store as unknown as { scarcity_threshold?: number })?.scarcity_threshold ?? 5;

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
        <StaffViewToggle current="preview" tagUuid={tag_uuid} storeName={store?.name ?? store?.shopify_shop_domain ?? ""} />
      )}
      {/* Back to collection — only shown to signed-in customers */}
      {customer && !isPreview && (
        <div style={{ padding: "0.75rem 1.25rem 0" }}>
          <a href="/me" style={{ fontSize: "0.8rem", color: "#888", textDecoration: "none" }}>
            ← Your Collection
          </a>
        </div>
      )}
      {/* Extra bottom padding for the Ask bar and the picks pill */}
      <div style={{ paddingBottom: "8rem" }}>
        <ProductShell
          product={product}
          theme={theme}
          enrichment={enrichment}
          tapCount={tapCount}
          scarcityThreshold={scarcityThreshold}
          tagUuid={tag_uuid}
          storeName={store?.name ?? store?.shopify_shop_domain ?? ""}
          isAuthenticated={!!customer}
          externalReviews={externalReviews}
          reviewAggregate={reviewAggregate}
          externalAwards={externalAwards}
          offer={offer ? { code: offer.code, message: offer.message, expires_at: offer.expires_at?.toISOString() ?? null } : null}
          brandCollector={brandCollector}
          categoryPattern={categoryPattern}
          sameBrand={sameBrand}
          detailLabels={detailLabels(category)}
          afterKeyPoints={!isPreview && <ReactionBar tagId={state.tagId} sessionId={sessionId} primaryColor={primaryColor} customerId={customer?.id ?? null} />}
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
      {/* The Shelf-Side AI Assistant (PRD v4 §7 Step 15e). The team's previews aren't recorded. */}
      <AskBar
        tagUuid={tag_uuid}
        productTitle={product.title}
        storeName={store?.name ?? store?.shopify_shop_domain ?? ""}
        primaryColor={primaryColor}
        suggestions={suggestedQuestions(enrichment?.faq ?? [])}
      />
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
    if (isAutomatedVisit(ua)) return;   // link previews and crawlers aren't taps
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
