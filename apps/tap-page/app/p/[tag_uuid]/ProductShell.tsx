import Image from "next/image";
import type { Product, Enrichment, Review, FaqItem, ExternalReview, ReviewAggregate, Award, BrandCollectorInsight, CategoryPatternInsight, SimilarProductSuggestion } from "@nfc/db";
import type { ThemeSettings } from "@/theme.js";
import { DEFAULT_THEME } from "@/theme.js";
import { YourTapsStrip, type LocalTap } from "./YourTapsStrip.js";
import { AuthPromptCard } from "./AuthPromptCard.js";
import { OfferReveal } from "./OfferReveal.js";
import { ForYou } from "./ForYou.js";

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
  return (
    <span style={{ color: "#f59e0b", letterSpacing: "1px" }}>
      {"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}
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

  const currentTap: LocalTap = {
    tagUuid,
    productTitle: product.title,
    productImageUrl: primaryImage?.url ?? null,
    productVendor: product.vendor,
    storeName,
    tappedAt: Date.now(),
  };

  const embedUrl = enrichment?.video_url
    ? (getYouTubeEmbedUrl(enrichment.video_url) ?? getVimeoEmbedUrl(enrichment.video_url))
    : null;

  const extraImages = (enrichment?.extra_images ?? []).filter(Boolean);
  const reviews = enrichment?.reviews ?? [];
  const awards = enrichment?.awards ?? [];
  const faq = enrichment?.faq ?? [];

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      {logoUrl && (
        <div className="mb-6 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="Store logo" className="h-8 object-contain" />
        </div>
      )}

      {primaryImage && (
        <div className="relative mb-6 aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
          <Image src={primaryImage.url} alt={primaryImage.altText ?? product.title} fill className="object-cover" priority />
        </div>
      )}

      <div className="space-y-2 mb-6">
        {product.vendor && (
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{product.vendor}</p>
        )}
        <h1 className="text-2xl font-semibold" style={{ color: primaryColor }}>{product.title}</h1>
        {displayPrice && <p className="text-xl text-gray-700">${displayPrice}</p>}

        {/* Aggregate rating — appears above the fold for trust */}
        {reviewAggregate.count > 0 && reviewAggregate.avg_rating !== null && (
          <a href="#reviews" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", textDecoration: "none", color: "inherit", paddingTop: "0.25rem" }}>
            <Stars rating={reviewAggregate.avg_rating} />
            <span style={{ fontSize: "0.82rem", color: "#555" }}>
              {reviewAggregate.avg_rating.toFixed(1)} · {reviewAggregate.count} review{reviewAggregate.count === 1 ? "" : "s"}
            </span>
          </a>
        )}

        {/* Persuasion strip — scarcity + tap count */}
        {(showScarcity || tapCount >= 3) && (
          <div className="flex flex-wrap gap-2 pt-2">
            {showScarcity && (
              <span style={{
                fontSize: "0.72rem", fontWeight: 600,
                padding: "3px 9px", borderRadius: "9999px",
                background: "#fef2f2", color: "#991b1b",
                border: "1px solid #fecaca",
              }}>
                Only {inventoryQty} left
              </span>
            )}
            {tapCount >= 3 && (
              <span style={{
                fontSize: "0.72rem", fontWeight: 500,
                padding: "3px 9px", borderRadius: "9999px",
                background: "#f4f4f5", color: "#52525b",
                border: "1px solid #e4e4e7",
              }}>
                Tapped {tapCount} times this month
              </span>
            )}
          </div>
        )}
      </div>

      {enrichment && (
        <div className="space-y-8 border-t border-gray-100 pt-6">

          {/* Story */}
          {enrichment.backstory && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">The Story</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{enrichment.backstory}</p>
            </section>
          )}

          {/* Materials */}
          {enrichment.materials && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Materials</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{enrichment.materials}</p>
            </section>
          )}

          {/* Fit */}
          {enrichment.fit_notes && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Fit & Feel</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{enrichment.fit_notes}</p>
            </section>
          )}

          {/* Why Buy */}
          {enrichment.reasons_to_buy.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Why We Love It</h2>
              <ul className="space-y-1">
                {enrichment.reasons_to_buy.map((reason, i) => (
                  <li key={i} className="text-sm text-gray-700 flex gap-2">
                    <span style={{ color: primaryColor }} className="mt-0.5 shrink-0">✦</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Awards — manual + external merged */}
          {(awards.length > 0 || externalAwards.length > 0) && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Recognition</h2>
              <ul className="space-y-1.5">
                {externalAwards.map((a) => (
                  <li key={a.id} className="text-sm text-gray-700 flex gap-2 items-start">
                    <span style={{ color: primaryColor }} className="shrink-0 mt-0.5">◈</span>
                    <span>
                      <strong style={{ fontWeight: 600 }}>{a.title}</strong>
                      {(a.awarding_body || a.year) && (
                        <span style={{ color: "#888" }}> — {[a.awarding_body, a.year].filter(Boolean).join(", ")}</span>
                      )}
                      {a.source_url && (
                        <> · <a href={a.source_url} target="_blank" rel="noreferrer" style={{ color: "#888", textDecoration: "underline" }}>source</a></>
                      )}
                    </span>
                  </li>
                ))}
                {awards.map((award, i) => (
                  <li key={`manual-${i}`} className="text-sm text-gray-700 flex gap-2">
                    <span style={{ color: primaryColor }} className="shrink-0">◈</span>
                    <span>{award}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Video embed */}
          {embedUrl && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Watch</h2>
              <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: "8px", overflow: "hidden" }}>
                <iframe
                  src={embedUrl}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="Product video"
                />
              </div>
            </section>
          )}

          {/* Extra images */}
          {extraImages.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Details</h2>
              <div className="grid grid-cols-2 gap-2">
                {extraImages.map((url, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Detail ${i + 1}`} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Staff quote */}
          {enrichment.staff_quote && (
            <section className="rounded-lg bg-gray-50 px-4 py-4">
              <div className="flex gap-3 items-start">
                {enrichment.staff_photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={enrichment.staff_photo_url}
                    alt={enrichment.staff_name ?? "Staff"}
                    style={{ width: "44px", height: "44px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
                  />
                )}
                <div className="flex-1">
                  <blockquote className="text-sm text-gray-700 italic leading-relaxed mb-2">
                    &ldquo;{enrichment.staff_quote}&rdquo;
                  </blockquote>
                  {enrichment.staff_name && (
                    <p className="text-xs text-gray-400 font-medium">&mdash; {enrichment.staff_name}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Reviews — manual + external merged */}
          {(reviews.length > 0 || externalReviews.length > 0) && (
            <section id="reviews">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Customer Reviews</h2>
              <div className="space-y-4">
                {externalReviews.map((r) => (
                  <div key={r.id} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "1rem" }}>
                    <div className="flex items-center gap-2 mb-1">
                      {r.author_avatar_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.author_avatar_url} alt={r.author ?? ""}
                          style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
                      )}
                      {r.rating !== null && <Stars rating={parseFloat(r.rating)} />}
                      <span className="text-xs text-gray-400">
                        {r.author ?? "Customer"}
                        {r.source_label && ` · ${r.source_label}`}
                      </span>
                    </div>
                    {r.title && <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#111", marginBottom: "2px" }}>{r.title}</p>}
                    <p className="text-sm text-gray-700 leading-relaxed">{r.body}</p>
                    {r.source_url && (
                      <p style={{ marginTop: "0.5rem" }}>
                        <a href={r.source_url} target="_blank" rel="noreferrer" style={{ fontSize: "0.72rem", color: primaryColor, textDecoration: "none" }}>
                          Read full review →
                        </a>
                      </p>
                    )}
                  </div>
                ))}
                {reviews.map((r: Review, i) => (
                  <div key={`manual-${i}`} style={{ borderBottom: "1px solid #f0f0f0", paddingBottom: "1rem" }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Stars rating={r.rating} />
                      <span className="text-xs text-gray-400">{r.author}{r.source ? ` · ${r.source}` : ""}</span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{r.text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Sustainability */}
          {enrichment.sustainability_notes && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Sustainability</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{enrichment.sustainability_notes}</p>
            </section>
          )}

          {/* Care */}
          {enrichment.care_instructions && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Care</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{enrichment.care_instructions}</p>
            </section>
          )}

          {/* FAQ */}
          {faq.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Questions</h2>
              <FaqAccordion items={faq} primaryColor={primaryColor} />
            </section>
          )}

        </div>
      )}

      {/* Reciprocity — discount unlock (Phase 5) */}
      {offer && (
        <OfferReveal
          code={offer.code}
          message={offer.message}
          expiresAt={offer.expires_at}
          primaryColor={primaryColor}
        />
      )}

      {/* Unity / Collector (Phase 6) */}
      <ForYou
        brandCollector={brandCollector}
        categoryPattern={categoryPattern}
        sameBrand={sameBrand}
        primaryColor={primaryColor}
      />

      {/* Customer identity & history (Phase 2) */}
      <YourTapsStrip
        currentTap={currentTap}
        isAuthenticated={isAuthenticated}
        primaryColor={primaryColor}
      />
      <AuthPromptCard
        isAuthenticated={isAuthenticated}
        primaryColor={primaryColor}
        currentTagUuid={tagUuid}
      />
    </main>
  );
}
