import type { BrandCollectorInsight, CategoryPatternInsight, SimilarProductSuggestion } from "@nfc/db";

interface Props {
  brandCollector: BrandCollectorInsight | null;
  categoryPattern: CategoryPatternInsight | null;
  sameBrand: SimilarProductSuggestion[];
  primaryColor: string;
}

// Surfaces patterns from the customer's tap history. Renders nothing if there's no signal.
// Server component — receives precomputed insights from the page.
export function ForYou({ brandCollector, categoryPattern, sameBrand, primaryColor }: Props) {
  const hasAnything = brandCollector || categoryPattern || sameBrand.length > 0;
  if (!hasAnything) return null;

  return (
    <section style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid #f0f0f0" }}>
      <h2 style={{ fontSize: "0.72rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "0.875rem" }}>
        For you
      </h2>

      {brandCollector && (
        <p style={{ fontSize: "0.9rem", color: "#444", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          You&apos;ve tapped <strong>{brandCollector.count}</strong> {brandCollector.vendor} pieces — a true collector.
        </p>
      )}

      {categoryPattern && (
        <p style={{ fontSize: "0.9rem", color: "#444", marginBottom: "0.875rem", lineHeight: 1.5 }}>
          You keep coming back to <strong>{categoryPattern.product_type}</strong>.
        </p>
      )}

      {sameBrand.length > 0 && (
        <div>
          <p style={{ fontSize: "0.78rem", color: "#666", marginBottom: "0.75rem" }}>
            More from {sameBrand[0]?.vendor ?? "this brand"} in-store:
          </p>
          <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem", marginLeft: "-1rem", paddingLeft: "1rem", marginRight: "-1rem", paddingRight: "1rem" }}>
            {sameBrand.map((p) => (
              <a key={p.product_id} href={`/p/${p.tag_uuid}`}
                style={{ flexShrink: 0, width: "92px", textDecoration: "none", color: "inherit" }}>
                <div style={{
                  width: "92px", height: "92px", borderRadius: "8px",
                  background: p.image_url ? `url(${p.image_url}) center/cover` : "#f0f0f0",
                  marginBottom: "6px", border: `1px solid ${primaryColor}22`,
                }} />
                <p style={{ fontSize: "0.7rem", color: "#444", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                  {p.title}
                </p>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
