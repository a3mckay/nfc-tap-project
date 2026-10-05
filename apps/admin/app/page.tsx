import Link from "next/link";
import { headers } from "next/headers";
import { getPool, getStoreByDomain, getHomeSummary } from "@nfc/db";
import { getCurrentAdminSession } from "@/current-store.js";
import { can } from "@/permissions.js";
import { weekChange, questionsHeadline } from "@/home-utils.js";

// PRD v4 §7 Step 15i: the admin home page (D44, D45). Tap activity and customer
// questions at a glance; where owners, managers and co-managers land after
// signing in. Each card shows only what the viewer's role can open.
interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

const card: React.CSSProperties = { border: "1px solid #eee", borderRadius: "10px", padding: "1.1rem 1.25rem", marginBottom: "1rem", background: "#fff" };
const kicker: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 0.5rem" };
const big: React.CSSProperties = { fontSize: "1.8rem", fontWeight: 700, color: "#111", margin: 0, lineHeight: 1.1 };
const muted: React.CSSProperties = { fontSize: "0.85rem", color: "#777", margin: "0.3rem 0 0" };

export default async function AdminHome({ searchParams }: PageProps) {
  const { shop: shopParam } = await searchParams;
  const shop = shopParam ?? (await headers()).get("x-current-shop") ?? "";
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const [session, store] = await Promise.all([getCurrentAdminSession(pool), shop ? getStoreByDomain(pool, shop) : null]);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.5rem" }}>Home</h1>
        <p style={{ color: "#666" }}>Choose a store from the menu to see its activity.</p>
      </main>
    );
  }

  const summary = await getHomeSummary(pool, store.id);
  const q = summary.questions;
  const t = summary.taps;
  const enc = encodeURIComponent(store.shopify_shop_domain);

  return (
    <main style={{ maxWidth: "720px" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 600, margin: "0 0 0.25rem" }}>Home</h1>
      <p style={{ color: "#888", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>{store.name ?? store.shopify_shop_domain} · last 7 days</p>

      {can(session, "questions") && (
        <section style={card} aria-labelledby="home-questions">
          <p id="home-questions" style={kicker}>Customer questions</p>
          <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "#111", margin: 0 }}>{questionsHeadline(q.thisWeek, q.topTheme)}</p>
          {q.mostAsked && (
            <p style={muted}>
              Most asked about: <Link href={`/questions/${q.mostAsked.productId}?shop=${enc}`} style={{ color: "#111" }}>{q.mostAsked.title}</Link> ({q.mostAsked.count})
            </p>
          )}
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.88rem" }}>
            {q.unanswered > 0
              ? <Link href={`/questions?shop=${enc}`} style={{ color: "#92400e", fontWeight: 600 }}>{q.unanswered} unanswered question{q.unanswered === 1 ? "" : "s"} to review →</Link>
              : <Link href={`/questions?shop=${enc}`} style={{ color: "#555" }}>See all questions →</Link>}
          </p>
        </section>
      )}

      {can(session, "analytics") && (
        <section style={card} aria-labelledby="home-taps">
          <p id="home-taps" style={kicker}>Taps</p>
          <p style={big}>{t.thisWeek}</p>
          <p style={muted}>{weekChange(t.thisWeek, t.lastWeek) ?? "No taps yet"}</p>
          {t.topProducts.length > 0 && (
            <ol style={{ margin: "0.85rem 0 0", paddingLeft: "1.2rem", fontSize: "0.9rem", color: "#333" }}>
              {t.topProducts.map((p) => <li key={p.title} style={{ marginBottom: "0.2rem" }}>{p.title} <span style={{ color: "#999" }}>· {p.taps}</span></li>)}
            </ol>
          )}
          <p style={{ margin: "0.75rem 0 0", fontSize: "0.88rem" }}><Link href={`/analytics?shop=${enc}`} style={{ color: "#555" }}>Full analytics →</Link></p>
        </section>
      )}
    </main>
  );
}
