import Link from "next/link";
import { getPool, getStoreByDomain, listQuestionProducts } from "@nfc/db";

// PRD v4 §7 Step 15g: every product customers have asked about (D7).
interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

const th: React.CSSProperties = { textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", padding: "0.5rem 0.6rem", borderBottom: "1px solid #eee" };
const td: React.CSSProperties = { padding: "0.65rem 0.6rem", borderBottom: "1px solid #f3f3f3", fontSize: "0.88rem", color: "#333", verticalAlign: "top" };
const badge = (bg: string, fg: string): React.CSSProperties => ({ display: "inline-block", padding: "1px 8px", borderRadius: "99px", fontSize: "0.72rem", fontWeight: 600, background: bg, color: fg });

function ago(d: Date): string {
  const mins = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

export default async function QuestionsPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;
  if (!shop) return <main><p style={{ color: "#666" }}>Pass <code>?shop=…</code> in the URL.</p></main>;
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;
  const rows = await listQuestionProducts(pool, store.id);

  return (
    <main style={{ maxWidth: "860px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.35rem" }}>Questions</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
        What customers ask the AI assistant at the shelf. Open a product to see its questions grouped by theme, and answer
        anything the assistant couldn&apos;t. Your answers are used for future questions.
      </p>
      {rows.length === 0 ? (
        <p style={{ color: "#888", fontSize: "0.9rem" }}>No questions yet. Products appear here as soon as a customer asks about one.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr><th style={th}>Product</th><th style={th}>Questions</th><th style={th}>Top theme</th><th style={th}>Last asked</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product_id}>
                <td style={td}>
                  <Link href={`/questions/${r.product_id}?shop=${encodeURIComponent(shop)}`} style={{ color: "#111", fontWeight: 600, textDecoration: "none" }}>{r.title}</Link>
                </td>
                <td style={td}>
                  <span style={{ marginRight: "0.5rem" }}>{r.total}</span>
                  {r.new_count > 0 && <span style={{ ...badge("#e0f2fe", "#0369a1"), marginRight: "0.35rem" }}>{r.new_count} new</span>}
                  {r.unanswered > 0 && <span style={badge("#fef3c7", "#92400e")}>{r.unanswered} unanswered</span>}
                </td>
                <td style={{ ...td, color: r.top_theme ? "#333" : "#aaa" }}>{r.top_theme ?? "Not grouped yet"}</td>
                <td style={{ ...td, color: "#888" }}>{ago(r.last_asked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
