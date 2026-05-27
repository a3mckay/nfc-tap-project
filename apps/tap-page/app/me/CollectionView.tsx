"use client";

import { useState } from "react";
import type { CustomerTapRow, CustomerOfferRow, NewProductRow } from "@nfc/db";

type Tab = "all" | "stores" | "loved";

interface Props {
  taps: CustomerTapRow[];
  offers: CustomerOfferRow[];
  newProducts: NewProductRow[];
}

export function CollectionView({ taps, offers, newProducts }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const loved = taps.filter((t) => t.reaction === "loved");

  // Group by store
  const byStore = new Map<string, { domain: string; name: string; taps: CustomerTapRow[] }>();
  for (const t of taps) {
    if (!byStore.has(t.store_domain)) {
      byStore.set(t.store_domain, { domain: t.store_domain, name: t.store_domain, taps: [] });
    }
    byStore.get(t.store_domain)!.taps.push(t);
  }

  // Set of store domains + product IDs with active offers (for badges)
  const offerStoreDomains = new Set(offers.map((o) => o.store_domain));
  const offerProductIds = new Set(offers.map((o) => o.product_id).filter(Boolean) as string[]);

  function hasOfferBadge(t: CustomerTapRow) {
    return (t.product_id && offerProductIds.has(t.product_id)) || offerStoreDomains.has(t.store_domain);
  }

  return (
    <>
      {/* ── Active Offers ── */}
      {offers.length > 0 && (
        <section style={{ marginBottom: "1.75rem" }}>
          <h2 style={sectionHeading}>🎁 Active Offers</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {offers.map((o) => (
              <OfferCard key={o.id} offer={o} />
            ))}
          </div>
        </section>
      )}

      {/* ── Tabs ── */}
      {taps.length > 0 && (
        <>
          <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem", borderBottom: "1px solid #f0f0f0", paddingBottom: "0" }}>
            {(["all", "stores", "loved"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.8rem",
                  fontWeight: tab === t ? 600 : 400,
                  color: tab === t ? "#111" : "#888",
                  background: "none",
                  border: "none",
                  borderBottom: tab === t ? "2px solid #111" : "2px solid transparent",
                  cursor: "pointer",
                  textTransform: "capitalize",
                  marginBottom: "-1px",
                }}
              >
                {t === "all" ? "All" : t === "stores" ? "By Store" : `Loved${loved.length > 0 ? ` (${loved.length})` : ""}`}
              </button>
            ))}
          </div>

          {/* Tab: All */}
          {tab === "all" && (
            <ProductGrid taps={taps} hasOfferBadge={hasOfferBadge} />
          )}

          {/* Tab: By Store */}
          {tab === "stores" && (
            <div>
              {Array.from(byStore.values()).map((store) => (
                <div key={store.domain} style={{ marginBottom: "2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <a
                        href={`/store/${store.domain}`}
                        style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111", textDecoration: "none" }}
                      >
                        {store.domain}
                      </a>
                      {offerStoreDomains.has(store.domain) && (
                        <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "99px", fontWeight: 600 }}>
                          Offer available
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "#aaa" }}>
                      {store.taps.length} {store.taps.length === 1 ? "tap" : "taps"}
                    </span>
                  </div>
                  <ProductGrid taps={store.taps} hasOfferBadge={hasOfferBadge} />
                </div>
              ))}
            </div>
          )}

          {/* Tab: Loved */}
          {tab === "loved" && (
            loved.length === 0 ? (
              <p style={{ fontSize: "0.9rem", color: "#888", textAlign: "center", padding: "2rem 0" }}>
                Tap the ♥ Love button on any product page to save it here.
              </p>
            ) : (
              <ProductGrid taps={loved} hasOfferBadge={hasOfferBadge} />
            )
          )}
        </>
      )}

      {/* ── New from stores you know ── */}
      {newProducts.length > 0 && (
        <section style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #f0f0f0" }}>
          <h2 style={sectionHeading}>✨ New from stores you know</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
            {newProducts.map((p) => (
              <a
                key={p.id}
                href={p.tag_uuid ? `/p/${p.tag_uuid}` : "#"}
                style={{ textDecoration: "none", color: "inherit", opacity: p.tag_uuid ? 1 : 0.5 }}
              >
                <div style={{
                  width: "100%", aspectRatio: "1/1", borderRadius: "8px",
                  background: p.product_image_url ? `url(${p.product_image_url}) center/cover` : "#f0f0f0",
                  marginBottom: "6px",
                }} />
                <p style={productTitle}>{p.title}</p>
                {p.vendor && <p style={productVendor}>{p.vendor}</p>}
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProductGrid({
  taps,
  hasOfferBadge,
}: {
  taps: CustomerTapRow[];
  hasOfferBadge: (t: CustomerTapRow) => boolean;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.75rem" }}>
      {taps.map((t) => (
        <a key={t.id} href={`/p/${t.tag_uuid}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div style={{
            width: "100%", aspectRatio: "1/1", borderRadius: "8px",
            background: t.product_image_url ? `url(${t.product_image_url}) center/cover` : "#f0f0f0",
            marginBottom: "6px", position: "relative",
          }}>
            {/* Loved badge */}
            {t.reaction === "loved" && (
              <span style={{
                position: "absolute", top: "6px", right: "6px",
                background: "#fff", borderRadius: "50%", width: "22px", height: "22px",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
              }}>♥</span>
            )}
            {/* Offer badge */}
            {hasOfferBadge(t) && (
              <span style={{
                position: "absolute", top: "6px", left: "6px",
                background: "#f59e0b", borderRadius: "99px",
                padding: "1px 6px", fontSize: "0.6rem", fontWeight: 700,
                color: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}>🎁</span>
            )}
          </div>
          <p style={productTitle}>{t.product_title ?? "Untitled product"}</p>
          {t.product_vendor && <p style={productVendor}>{t.product_vendor}</p>}
        </a>
      ))}
    </div>
  );
}

function OfferCard({ offer }: { offer: CustomerOfferRow }) {
  const daysLeft = offer.expires_at
    ? Math.ceil((new Date(offer.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{
      padding: "0.875rem 1rem",
      background: "#fffbeb",
      border: "1px solid #fde68a",
      borderRadius: "10px",
      display: "flex",
      alignItems: "center",
      gap: "0.875rem",
    }}>
      {offer.product_image_url && (
        <img
          src={offer.product_image_url}
          alt={offer.product_title ?? ""}
          style={{ width: "44px", height: "44px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
          {offer.store_name ?? offer.store_domain}
          {offer.product_title && ` · ${offer.product_title}`}
        </p>
        <p style={{ fontSize: "0.85rem", color: "#111", marginBottom: "4px", lineHeight: 1.3 }}>{offer.message}</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <code style={{ fontSize: "0.8rem", fontWeight: 700, color: "#111", background: "#fef3c7", padding: "1px 6px", borderRadius: "4px" }}>
            {offer.code}
          </code>
          {daysLeft !== null && (
            <span style={{ fontSize: "0.7rem", color: daysLeft <= 3 ? "#dc2626" : "#92400e" }}>
              {daysLeft <= 0 ? "Expires today" : `${daysLeft}d left`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const sectionHeading: React.CSSProperties = {
  fontSize: "0.75rem", fontWeight: 600, color: "#666",
  textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem",
};

const productTitle: React.CSSProperties = {
  fontSize: "0.78rem", fontWeight: 500, color: "#111", lineHeight: 1.3,
  overflow: "hidden", textOverflow: "ellipsis",
  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
};

const productVendor: React.CSSProperties = {
  fontSize: "0.7rem", color: "#999", marginTop: "2px",
};
