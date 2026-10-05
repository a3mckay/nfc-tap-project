import { Fragment } from "react";
import type { Product } from "@nfc/db";
import type { TrainingSection } from "@/staff-view.js";
import { StaffViewToggle } from "./StaffViewToggle.js";
import { AskBar } from "./AskBar.js";

// PRD v4 §7 Step 13d: the training view staff and owners see when they tap.

interface Props {
  product: Product;
  storeName: string;
  primaryColor: string;
  sections: TrainingSection[];
  hasOwnerNotes: boolean;
  stockNoteAge: string | null;
  tagUuid: string;
  // Step 15h: the most-asked customer question themes, with counts (D13, D31).
  customersAsking: Array<{ label: string; count: number; answer: string | null }>;
  totalQuestions: number;
}

const STAFF_SUGGESTIONS = ["Who is this best for?", "How does it compare with similar products?", "What do customers ask most?"];

function CustomersAsking({ items, total, primaryColor }: { items: Props["customersAsking"]; total: number; primaryColor: string }) {
  if (!total) return null;
  return (
    <section style={{ padding: "0.9rem 1rem", border: "1px solid #eee", borderRadius: "8px" }}>
      <h2 style={label}>Customers are asking <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>· {total} question{total === 1 ? "" : "s"} so far</span></h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {items.map((t) => (
          <div key={t.label}>
            <p style={{ ...body, fontWeight: 600 }}>{t.label} <span style={{ fontWeight: 400, color: primaryColor }}>· {t.count}</span></p>
            {t.answer && <p style={{ ...body, color: "#444" }}>{t.answer}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

const label: React.CSSProperties = {
  fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#888", margin: "0 0 0.35rem",
};
const body: React.CSSProperties = { fontSize: "0.95rem", color: "#222", lineHeight: 1.55, margin: 0, whiteSpace: "pre-line" };

export function StaffShell({ product, storeName, primaryColor, sections, hasOwnerNotes, stockNoteAge, tagUuid, customersAsking, totalQuestions }: Props) {
  const image = (product.images as Array<{ url?: string; src?: string; altText?: string | null }>)[0];
  const imageUrl = image?.url ?? image?.src ?? null;
  const price = (product.variants as Array<{ price?: string }>)[0]?.price ?? null;

  return (
    <main style={{ maxWidth: "32rem", margin: "0 auto", paddingBottom: "7rem" }}>
      <StaffViewToggle current="training" tagUuid={tagUuid} storeName={storeName} />

      <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", padding: "1rem" }}>
        {imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={image?.altText ?? product.title} style={{ width: "72px", height: "72px", objectFit: "cover", borderRadius: "8px", flexShrink: 0, background: "#f3f3f3" }} />
        )}
        <div>
          {product.vendor && <p style={{ ...label, margin: 0 }}>{product.vendor}</p>}
          <h1 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0.1rem 0" }}>{product.title}</h1>
          {price && <p style={{ fontSize: "0.9rem", color: "#555", margin: 0 }}>${price}</p>}
        </div>
      </div>

      {!hasOwnerNotes && (
        <p style={{ margin: "0 1rem 1rem", padding: "0.7rem 0.9rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "0.85rem", color: "#92400e", lineHeight: 1.5 }}>
          No training notes for this product yet{sections.length ? " — here's what's on the product page" : ""}. Owners can add notes in the admin.
        </p>
      )}

      <div style={{ padding: "0 1rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
        {sections.length === 0 && <CustomersAsking items={customersAsking} total={totalQuestions} primaryColor={primaryColor} />}
        {sections.map((s, i) => (<Fragment key={s.title}>
          <section style={i === 0 && hasOwnerNotes ? { padding: "0.9rem 1rem", borderLeft: `4px solid ${primaryColor}`, background: "#fafafa", borderRadius: "4px" } : undefined}>
            <h2 style={label}>
              {s.title}
              {s.title === "Stock note" && stockNoteAge && <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}> · {stockNoteAge}</span>}
            </h2>
            {s.kind === "text" && <p style={{ ...body, ...(i === 0 && hasOwnerNotes ? { fontSize: "1.05rem", fontWeight: 600 } : {}) }}>{s.text}</p>}
            {s.kind === "list" && (
              <ul style={{ ...body, paddingLeft: "1.2rem" }}>
                {s.items.map((item, j) => <li key={j} style={{ marginBottom: "0.25rem" }}>{item}</li>)}
              </ul>
            )}
            {s.kind === "qa" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {s.items.map((q, j) => (
                  <div key={j}>
                    <p style={{ ...body, fontWeight: 600 }}>{q.question}</p>
                    {q.answer && <p style={{ ...body, color: "#444" }}>{q.answer}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
          {i === 0 && <CustomersAsking items={customersAsking} total={totalQuestions} primaryColor={primaryColor} />}
        </Fragment>))}
      </div>
      <AskBar tagUuid={tagUuid} productTitle={product.title} storeName={storeName} primaryColor={primaryColor}
        suggestions={STAFF_SUGGESTIONS} endpoint="/api/staff-ask" />
    </main>
  );
}
