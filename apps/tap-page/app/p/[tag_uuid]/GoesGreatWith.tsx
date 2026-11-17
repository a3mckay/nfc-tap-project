import type { Pairing } from "@nfc/db";

// "Goes great with" (founder, 2026-11-16): up to three of the store's own
// products this one needs, each with the need from a source on its fact sheet.
// Editorial, not a shop widget (PRD v4 §4.3): no prices, no buttons to buy.
// Server component.
interface Props {
  pairings: Pairing[];
  primaryColor: string;
}

export function GoesGreatWith({ pairings, primaryColor }: Props) {
  if (pairings.length === 0) return null;
  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#999", marginBottom: "0.75rem" }}>
        Goes great with
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {pairings.map((p) => {
          const card = (
            <>
              <div style={{
                width: 56, height: 56, flexShrink: 0, borderRadius: 8,
                background: p.image_url ? `url(${p.image_url}) center/cover` : "#f0f0f0",
                border: `1px solid ${primaryColor}22`,
              }} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "#222", lineHeight: 1.3 }}>{p.title}</p>
                <p style={{ fontSize: "0.8rem", color: "#666", lineHeight: 1.4, marginTop: 2 }}>{p.reason}</p>
              </div>
            </>
          );
          const style = { display: "flex", gap: "0.75rem", alignItems: "center", textDecoration: "none", color: "inherit" } as const;
          return p.tag_uuid
            ? <a key={p.product_id} href={`/p/${p.tag_uuid}`} style={style}>{card}</a>
            : <div key={p.product_id} style={style}>{card}</div>;
        })}
      </div>
    </section>
  );
}
