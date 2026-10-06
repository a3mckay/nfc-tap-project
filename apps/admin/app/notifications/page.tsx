import { getPool, getStoreByDomain, getProductsWithStatus, getNotificationLogByStore } from "@nfc/db";
import { NotificationComposer } from "./NotificationComposer.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function NotificationsPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Notifications</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to manage notifications.</p>
      </main>
    );
  }

  const pool  = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Notifications</h1>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </main>
    );
  }

  const [products, recentLog] = await Promise.all([
    getProductsWithStatus(pool, store.id),
    getNotificationLogByStore(pool, store.id, 20),
  ]);

  const activeProducts = products.filter((p) => !p.is_archived && Number(p.active_tag_count) > 0);

  return (
    <main style={{ maxWidth: "640px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Notifications</h1>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.9rem" }}>{store?.name || shop}</p>

      <section style={{ marginBottom: "3rem" }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          Send a message
        </p>
        <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1.25rem", lineHeight: 1.5 }}>
          Send SMS, WhatsApp, or email to customers who have tapped, liked, or loved a product.
          Each customer receives at most one message via their preferred channel.
        </p>
        <NotificationComposer shop={shop} products={activeProducts} />
      </section>

      {recentLog.length > 0 && (
        <section>
          <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
            Recent sends
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {recentLog.map((row) => (
              <div
                key={row.id}
                style={{
                  padding: "0.75rem 1rem",
                  border: "1px solid #eee",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  background: "#fafafa",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#333" }}>
                    {row.product_title ?? "All products"} — {row.event_type}
                  </span>
                  <span style={{
                    fontSize: "0.7rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "999px",
                    background: row.status === "sent" ? "#dcfce7" : "#fee2e2",
                    color:      row.status === "sent" ? "#166534" : "#991b1b",
                  }}>
                    {row.channel} · {row.status}
                  </span>
                </div>
                <div style={{ color: "#666", marginBottom: "0.25rem" }}>{row.message}</div>
                <div style={{ color: "#aaa" }}>
                  {new Date(row.sent_at).toLocaleDateString("en-CA", {
                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
