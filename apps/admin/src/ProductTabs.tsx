// Tabs at the top of a product's edit pages: the customer-facing content and
// the staff training notes each have their own page.

interface Props {
  shop: string;
  productId: string;
  current: "customer" | "training";
}

const tab = (active: boolean): React.CSSProperties => ({
  padding: "0.5rem 1.1rem",
  borderRadius: "999px",
  fontSize: "0.875rem",
  fontWeight: 600,
  textDecoration: "none",
  color: active ? "#fff" : "#444",
  background: active ? "#111" : "transparent",
});

export function ProductTabs({ shop, productId, current }: Props) {
  const q = `?shop=${encodeURIComponent(shop)}`;
  return (
    <nav aria-label="Product sections" style={{ display: "inline-flex", gap: "4px", padding: "4px", background: "#f1f1f1", borderRadius: "999px", marginBottom: "1.5rem" }}>
      <a href={`/enrichment/${productId}${q}`} aria-current={current === "customer" ? "page" : undefined} style={tab(current === "customer")}>Customer page</a>
      <a href={`/enrichment/${productId}/training${q}`} aria-current={current === "training" ? "page" : undefined} style={tab(current === "training")}>Staff training</a>
    </nav>
  );
}
