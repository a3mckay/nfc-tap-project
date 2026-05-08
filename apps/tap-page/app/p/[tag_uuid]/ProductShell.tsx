import type { Product, Enrichment, Review, FaqItem, ExternalReview, ReviewAggregate, Award, BrandCollectorInsight, CategoryPatternInsight, SimilarProductSuggestion } from "@nfc/db";
import type { ThemeSettings } from "@/theme.js";
import { DEFAULT_THEME } from "@/theme.js";
import { AuthPromptCard } from "./AuthPromptCard.js";
import { OfferReveal } from "./OfferReveal.js";
import { ForYou } from "./ForYou.js";
import { MediaGallery } from "./MediaGallery.js";

interface ShopifyImage { url: string; altText: string | null }
interface ShopifyVariant { id: string; sku: string | null; price: string; inventoryQuantity: number }

interface Props {
  product: Product;
  theme: Partial<ThemeSettings>;
  enrichment: Enrichment | null;
  tapCount: number;
  scarcityThreshold: number;
  tagUuid: string;
  storeName: string;
  isAuthenticated: boolean;
  externalReviews: ExternalReview[];
  reviewAggregate: ReviewAggregate;
  externalAwards: Award[];
  offer: { code: string; message: string; expires_at: string | null } | null;
  brandCollector: BrandCollectorInsight | null;
  categoryPattern: CategoryPatternInsight | null;
  sameBrand: SimilarProductSuggestion[];
}

function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?\s]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span style={{ color: "#f59e0b", letterSpacing: "1px", fontSize: "1rem" }}>
      {"★".repeat(full)}{"☆".repeat(5 - full)}
    </span>
  );
}

function FaqAccordion({ items, primaryColor }: { items: FaqItem[]; primaryColor: string }) {
  return (
    <div>
      {items.map((item, i) => (
        <details key={i} style={{ borderBottom: "1px solid #f0f0f0", padding: "0.75rem 0" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "0.9rem", color: "#111", listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {item.question}
            <span style={{ color: primaryColor, fontSize: "1.1rem", flexShrink: 0, marginLeft: "1rem" }}>+</span>
          </summary>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#555", lineHeight: 1.6 }}>{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

export function ProductShell({ product, theme, enrichment, tapCount, scarcityThreshold, tagUuid, storeName, isAuthenticated, externalReviews, reviewAggregate, externalAwards, offer, brandCollector, categoryPattern, sameBrand }: Props) {
  const images = product.images as ShopifyImage[];
  const variants = product.variants as ShopifyVariant[];
  const primaryImage = images[0];
  const displayPrice = variants[0]?.price ?? null;
  const logoUrl = theme.logoUrl ?? DEFAULT_THEME.logoUrl;
  const primaryColor = theme.primaryColor ?? DEFAULT_THEME.primaryColor;

  const inventoryQty = product.inventory_quantity ?? 0;
  const showScarcity = inventoryQty > 0 && inventoryQty <= scarcityThreshold;

  const embedUrl = enrichment?.video_url
    ? (getYouTubeEmbedUrl(enrichment.video_url) ?? getVimeoEmbedUrl(enrichment.video_url))
    : null;

  const extraImages = (enrichment?.extra_images ?? []).filter(Boolean) as string[];

  // Build slides: primary image first, then extra images, then video last
  const slides: Parameters<typeof MediaGallery>[0]["slides"] = [
    ...(primaryImage ? [{ type: "image" as const, url: primaryImage.url, alt: primaryImage.altText ?? product.title }] : []),
    ...extraImages.map((url, i) => ({ type: "image" as const, url, alt: `View ${i + 2}` })),
    ...(embedUrl ? [{ type: "video" as const, embedUrl }] : []),
  ];
  const reviews = (enrichment?.reviews ?? []) as Review[];
  const awards = enrichment?.awards ?? [];
  const faq = enrichment?.faq ?? [];

  const allReviews = [...externalReviews, ...reviews.map(r => ({ ...r, _manual: true }))];
  const hasReviews = allReviews.length > 0;
  const hasDetails = enrichment && (
    enrichment.backstory || enrichment.materials || enrichment.fit_notes ||
    enrichment.sustainability_notes || enrichment.care_instructions
  );

  return (
    <main className="mx-auto max-w-lg pb-12">

      {/* ── Media gallery (images + video carousel) ── */}
      <div style={{ position: "relative" }}>
        <MediaGallery slides={slides} primaryColor={primaryColor} />
        {/* Logo overlay — top left of gallery */}
        {logoUrl && (
          <div style={{ position: "absolute", top: "0.75rem", left: "0.75rem", zIndex: 10, background: "rgba(255,255,255,0.88)", borderRadius: "6px", padding: "4px 10px", backdropFilter: "blur(4px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Store" style={{ height: "20px", objectFit: "contain", display: "block" }} />
          </div>
        )}
      </div>

      <div className="px-4 pt-5 space-y-6">

        {/* ── Product header ── */}
        <div className="space-y-1">
          {product.vendor && (
            <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#aaa" }}>{product.vendor}</p>
          )}
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111", lineHeight: 1.2 }}>{product.title}</h1>
          {displayPrice && (
            <p style={{ fontSize: "1.25rem", color: "#333", fontWeight: 500 }}>${displayPrice}</p>
          )}

          {/* Rating link */}
          {reviewAggregate.count > 0 && reviewAggregate.avg_rating !== null && (
            <a href="#reviews" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", color: "inherit", paddingTop: "0.2rem" }}>
              <Stars rating={reviewAggregate.avg_rating} />
              <span style={{ fontSize: "0.82rem", color: "#666" }}>
                {reviewAggregate.avg_rating.toFixed(1)} · {reviewAggregate.count} review{reviewAggregate.count === 1 ? "" : "s"}
              </span>
            </a>
          )}

          {/* Persuasion badges */}
          {(showScarcity || tapCount >= 3) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", paddingTop: "0.4rem" }}>
              {showScarcity && (
                <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "9999px", background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>
                  Only {inventoryQty} left
                </span>
              )}
              {tapCount >= 3 && (
                <span style={{ fontSize: "0.72rem", fontWeight: 500, padding: "3px 10px", borderRadius: "9999px", background: "#f4f4f5", color: "#52525b", border: "1px solid #e4e4e7" }}>
                  Tapped {tapCount}× this month
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Why We Love It ── */}
        {enrichment && enrichment.reasons_to_buy.length > 0 && (
          <section>
            <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "0.6rem" }}>Why We Love It</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(enrichment.reasons_to_buy as string[]).map((reason, i) => (
                <li key={i} style={{ display: "flex", gap: "0.6rem", alignItems: "flex-start", fontSize: "0.9rem", color: "#222" }}>
                  <span style={{ color: primaryColor, flexShrink: 0, marginTop: "1px", fontWeight: 700 }}>✦</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Staff quote ── */}
        {enrichment?.staff_quote && (
          <section style={{ background: "#fafafa", borderLeft: `3px solid ${primaryColor}`, borderRadius: "0 8px 8px 0", padding: "0.875rem 1rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              {enrichment.staff_photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={enrichment.staff_photo_url}
                  alt={enrichment.staff_name ?? "Staff"}
                  style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div>
                <blockquote style={{ fontSize: "0.875rem", color: "#333", fontStyle: "italic", lineHeight: 1.55, margin: 0, marginBottom: enrichment.staff_name ? "0.35rem" : 0 }}>
                  &ldquo;{enrichment.staff_quote}&rdquo;
                </blockquote>
                {enrichment.staff_name && (
                  <p style={{ fontSize: "0.72rem", color: "#999", fontWeight: 600, margin: 0 }}>&mdash; {enrichment.staff_name}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Reviews ── */}
        {hasReviews && (
          <section id="reviews">
            <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "0.75rem" }}>
              Customer Reviews
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {externalReviews.slice(0, 4).map((r) => (
                <div key={r.id} style={{ background: "#fafafa", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    {r.author_avatar_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.author_avatar_url} alt={r.author ?? ""} style={{ width: "22px", height: "22px", borderRadius: "50%", objectFit: "cover" }} />
                    )}
                    {r.rating !== null && <Stars rating={parseFloat(String(r.rating))} />}
                    <span style={{ fontSize: "0.75rem", color: "#888" }}>
                      {r.author ?? "Customer"}{r.source_label ? ` · ${r.source_label}` : ""}
                    </span>
                  </div>
                  {r.title && <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#111", marginBottom: "0.25rem" }}>{r.title}</p>}
                  <p style={{ fontSize: "0.875rem", color: "#444", lineHeight: 1.55, margin: 0 }}>{r.body}</p>
                </div>
              ))}
              {reviews.slice(0, Math.max(0, 4 - externalReviews.length)).map((r, i) => (
                <div key={`m-${i}`} style={{ background: "#fafafa", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
                    <Stars rating={r.rating} />
                    <span style={{ fontSize: "0.75rem", color: "#888" }}>{r.author}{r.source ? ` · ${r.source}` : ""}</span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "#444", lineHeight: 1.55, margin: 0 }}>{r.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Awards ── */}
        {(awards.length > 0 || externalAwards.length > 0) && (
          <section>
            <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "0.6rem" }}>Recognition</h2>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {externalAwards.map((a) => (
                <li key={a.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "0.875rem", color: "#333" }}>
                  <span style={{ color: primaryColor, flexShrink: 0 }}>◈</span>
                  <span>
                    <strong>{a.title}</strong>
                    {(a.awarding_body || a.year) && <span style={{ color: "#888" }}> — {[a.awarding_body, a.year].filter(Boolean).join(", ")}</span>}
                  </span>
                </li>
              ))}
              {(awards as string[]).map((award, i) => (
                <li key={`ma-${i}`} style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem", color: "#333" }}>
                  <span style={{ color: primaryColor }}>◈</span>
                  <span>{award}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Product Details (collapsed) ── */}
        {hasDetails && (
          <details style={{ borderTop: "1px solid #eee", borderBottom: "1px solid #eee" }}>
            <summary style={{
              cursor: "pointer", padding: "0.875rem 0",
              fontWeight: 600, fontSize: "0.9rem", color: "#333",
              listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              Product Details
              <span style={{ color: primaryColor, fontSize: "1.1rem" }}>+</span>
            </summary>
            <div style={{ paddingBottom: "1rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {enrichment!.backstory && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb", marginBottom: "0.35rem" }}>The Story</p>
                  <p style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.6, margin: 0 }}>{enrichment!.backstory}</p>
                </div>
              )}
              {enrichment!.materials && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb", marginBottom: "0.35rem" }}>Materials</p>
                  <p style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.6, margin: 0 }}>{enrichment!.materials}</p>
                </div>
              )}
              {enrichment!.fit_notes && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb", marginBottom: "0.35rem" }}>Fit & Feel</p>
                  <p style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.6, margin: 0 }}>{enrichment!.fit_notes}</p>
                </div>
              )}
              {enrichment!.sustainability_notes && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb", marginBottom: "0.35rem" }}>Sustainability</p>
                  <p style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.6, margin: 0 }}>{enrichment!.sustainability_notes}</p>
                </div>
              )}
              {enrichment!.care_instructions && (
                <div>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#bbb", marginBottom: "0.35rem" }}>Care</p>
                  <p style={{ fontSize: "0.875rem", color: "#555", lineHeight: 1.6, margin: 0 }}>{enrichment!.care_instructions}</p>
                </div>
              )}
            </div>
          </details>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <section>
            <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "0.25rem" }}>Questions</h2>
            <FaqAccordion items={faq as FaqItem[]} primaryColor={primaryColor} />
          </section>
        )}

        {/* ── Offer ── */}
        {offer && (
          <OfferReveal
            code={offer.code}
            message={offer.message}
            expiresAt={offer.expires_at}
            primaryColor={primaryColor}
          />
        )}

        {/* ── For You / Collector ── */}
        <ForYou
          brandCollector={brandCollector}
          categoryPattern={categoryPattern}
          sameBrand={sameBrand}
          primaryColor={primaryColor}
        />

        {/* ── Auth ── */}
        <AuthPromptCard
          isAuthenticated={isAuthenticated}
          primaryColor={primaryColor}
          currentTagUuid={tagUuid}
        />

      </div>
    </main>
  );
}
