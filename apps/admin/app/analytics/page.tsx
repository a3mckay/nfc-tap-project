import {
  getPool,
  getStoreByDomain,
  getTapSummary,
  getTopProducts,
  getDeviceBreakdown,
  getDailyTaps,
  getStoreReactionTotals,
  getTopReactedProducts,
  getCustomerSummary,
} from "@nfc/db";
import {
  formatCount,
  pctOf,
  fillDailyGaps,
  buildSparklinePath,
} from "../../src/analytics-utils.js";

interface PageProps {
  searchParams: Promise<{ shop?: string; days?: string }>;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: "8px", padding: "1rem 1.25rem", flex: 1, minWidth: "140px" }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>{label}</p>
      <p style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: "0.8rem", color: "#999", marginTop: "0.25rem" }}>{sub}</p>}
    </div>
  );
}

function Sparkline({ path, width = 320, height = 48 }: { path: string; width?: number; height?: number }) {
  if (!path) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", fontSize: "0.8rem" }}>
        No data yet
      </div>
    );
  }
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <path d={path} fill="none" stroke="#111" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#888", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
      {children}
    </p>
  );
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { shop, days: daysParam } = await searchParams;
  const days = daysParam === "30" ? 30 : 7;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Analytics</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to view analytics.</p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Analytics</h1>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </main>
    );
  }

  const [summary, topProducts, deviceBreakdown, dailyRaw, reactions, topReacted, customers] = await Promise.all([
    getTapSummary(pool, store.id),
    getTopProducts(pool, store.id, days),
    getDeviceBreakdown(pool, store.id, days),
    getDailyTaps(pool, store.id, days),
    getStoreReactionTotals(pool, store.id, days),
    getTopReactedProducts(pool, store.id, days),
    getCustomerSummary(pool, store.id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - (days - 1) * 86400_000).toISOString().slice(0, 10);
  const daily = fillDailyGaps(dailyRaw, startDate, today);
  const sparkPath = buildSparklinePath(daily, 320, 48);

  const totalDeviceTaps = deviceBreakdown.reduce((s, d) => s + d.tap_count, 0);
  const totalTaps = days === 7 ? summary.total_7d : summary.total_30d;
  const reactionRate = totalTaps > 0 ? Math.round((reactions.total / totalTaps) * 100) : 0;
  const returnRate = customers.identified_customers > 0
    ? Math.round((customers.identified_sessions_7d / customers.identified_customers) * 100)
    : 0;

  return (
    <main style={{ maxWidth: "720px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Analytics</h1>
        <span style={{ fontSize: "0.85rem", color: "#888" }}>{shop}</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem", fontSize: "0.8rem" }}>
          <a href={`?shop=${shop}&days=7`} style={{ color: days === 7 ? "#111" : "#888", fontWeight: days === 7 ? 700 : 400, textDecoration: "none" }}>7d</a>
          <a href={`?shop=${shop}&days=30`} style={{ color: days === 30 ? "#111" : "#888", fontWeight: days === 30 ? 700 : 400, textDecoration: "none" }}>30d</a>
        </div>
      </div>

      {/* Tap summary */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <StatCard label={`Taps (${days}d)`} value={formatCount(totalTaps)} />
        <StatCard label="Unique visitors (7d)" value={formatCount(summary.unique_sessions_7d)} sub="by session" />
        <StatCard label="Avg / day" value={formatCount(Math.round(totalTaps / days))} />
      </div>

      {/* Sparkline */}
      <section style={{ marginBottom: "2rem" }}>
        <SectionHeader>Daily taps — last {days} days</SectionHeader>
        <Sparkline path={sparkPath} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#bbb", marginTop: "4px", width: "320px" }}>
          <span>{startDate}</span>
          <span>{today}</span>
        </div>
      </section>

      {/* Reaction sentiment */}
      <section style={{ marginBottom: "2rem" }}>
        <SectionHeader>Customer reactions — {days}d</SectionHeader>
        {reactions.total === 0 ? (
          <p style={{ color: "#bbb", fontSize: "0.9rem" }}>No reactions recorded yet.</p>
        ) : (
          <>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <StatCard label="Loved ❤️" value={formatCount(reactions.loved)} sub={`${pctOf(reactions.loved, reactions.total)}% of reactions`} />
              <StatCard label="Liked 👍" value={formatCount(reactions.liked)} sub={`${pctOf(reactions.liked, reactions.total)}%`} />
              <StatCard label="Passed 👎" value={formatCount(reactions.passed)} sub={`${pctOf(reactions.passed, reactions.total)}%`} />
              <StatCard label="Reaction rate" value={`${reactionRate}%`} sub="of taps got a reaction" />
            </div>
            {/* Sentiment bar */}
            {reactions.total > 0 && (
              <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", maxWidth: "400px" }}>
                <div style={{ flex: reactions.loved,  background: "#ec4899" }} />
                <div style={{ flex: reactions.liked,  background: "#6366f1" }} />
                <div style={{ flex: reactions.passed, background: "#e5e7eb" }} />
              </div>
            )}
          </>
        )}
      </section>

      {/* Top products by love */}
      {topReacted.length > 0 && (
        <section style={{ marginBottom: "2rem" }}>
          <SectionHeader>Most loved products — {days}d</SectionHeader>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              {topReacted.filter((p) => p.loved > 0 || p.liked > 0).slice(0, 8).map((p, i) => (
                <tr key={p.product_id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={{ padding: "0.5rem 0.75rem 0.5rem 0", color: "#bbb", width: "1.5rem" }}>{i + 1}</td>
                  <td style={{ padding: "0.5rem 0.75rem 0.5rem 0" }}>{p.product_title ?? "Unknown"}</td>
                  <td style={{ padding: "0.5rem 0", textAlign: "right", fontSize: "0.8rem", color: "#888", whiteSpace: "nowrap" }}>
                    <span style={{ marginRight: "0.75rem" }}>❤️ {p.loved}</span>
                    <span style={{ marginRight: "0.75rem" }}>👍 {p.liked}</span>
                    <span>👎 {p.passed}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Top products by taps */}
      <section style={{ marginBottom: "2rem" }}>
        <SectionHeader>Top products by taps — {days}d</SectionHeader>
        {topProducts.length === 0 ? (
          <p style={{ color: "#bbb", fontSize: "0.9rem" }}>No taps recorded yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <tbody>
              {topProducts.map((p, i) => {
                const barPct = pctOf(p.tap_count, topProducts[0]?.tap_count ?? 1);
                return (
                  <tr key={p.product_id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                    <td style={{ padding: "0.5rem 0.75rem 0.5rem 0", color: "#bbb", width: "1.5rem" }}>{i + 1}</td>
                    <td style={{ padding: "0.5rem 0.75rem 0.5rem 0", flex: 1 }}>
                      <div style={{ marginBottom: "3px" }}>{p.product_title ?? "Unknown product"}</div>
                      <div style={{ height: "4px", background: "#f0f0f0", borderRadius: "2px" }}>
                        <div style={{ height: "4px", width: `${barPct}%`, background: "#111", borderRadius: "2px" }} />
                      </div>
                    </td>
                    <td style={{ padding: "0.5rem 0 0.5rem 1rem", textAlign: "right", fontWeight: 600, whiteSpace: "nowrap" }}>
                      {formatCount(p.tap_count)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Customer funnel */}
      <section style={{ marginBottom: "2rem" }}>
        <SectionHeader>Customer funnel</SectionHeader>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <StatCard label="Registered customers" value={formatCount(customers.identified_customers)} sub="all time" />
          <StatCard label="Sessions (7d)" value={formatCount(customers.sessions_7d)} sub="unique visitors" />
          <StatCard label="Active customers (7d)" value={formatCount(customers.identified_sessions_7d)} sub={`${returnRate}% of registered`} />
        </div>
      </section>

      {/* Device breakdown */}
      {deviceBreakdown.length > 0 && (
        <section>
          <SectionHeader>Device — {days}d</SectionHeader>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            {deviceBreakdown.map((d) => (
              <div key={d.device_type} style={{ fontSize: "0.875rem" }}>
                <span style={{ textTransform: "capitalize" }}>{d.device_type}</span>
                <span style={{ marginLeft: "0.4rem", fontWeight: 700 }}>{pctOf(d.tap_count, totalDeviceTaps)}%</span>
                <span style={{ marginLeft: "0.4rem", color: "#aaa" }}>({formatCount(d.tap_count)})</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
