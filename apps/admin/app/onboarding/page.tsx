import Link from "next/link";
import { getPool, getStoreByDomain } from "@nfc/db";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

interface CheckItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  href?: string;
  linkLabel?: string;
}

function Check({ item }: { item: CheckItem }) {
  return (
    <div style={{
      display: "flex",
      gap: "0.75rem",
      padding: "0.875rem 0",
      borderBottom: "1px solid #f4f4f4",
      alignItems: "flex-start",
    }}>
      <span style={{
        flexShrink: 0,
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: item.done ? "#dcfce7" : "#f3f4f6",
        color: item.done ? "#166534" : "#9ca3af",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.8rem",
        fontWeight: 700,
        marginTop: "1px",
      }}>
        {item.done ? "✓" : "·"}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: item.done ? 400 : 600, color: item.done ? "#6b7280" : "#111", marginBottom: "2px", textDecoration: item.done ? "line-through" : "none" }}>
          {item.label}
        </p>
        <p style={{ fontSize: "0.8rem", color: "#888" }}>{item.detail}</p>
      </div>
      {item.href && !item.done && (
        <Link href={item.href} style={{ fontSize: "0.8rem", color: "#555", whiteSpace: "nowrap", marginTop: "2px" }}>
          {item.linkLabel ?? "Go →"}
        </Link>
      )}
    </div>
  );
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Getting Started</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to view your onboarding checklist.</p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Getting Started</h1>
        <p style={{ color: "#c00" }}>Store not found — connect it via Shopify OAuth first.</p>
      </main>
    );
  }

  const { rows: productRows } = await pool.query<{ count: string }>(
    `select count(*) from products where store_id = $1`,
    [store.id],
  );
  const { rows: enrichmentRows } = await pool.query<{ count: string }>(
    `select count(*) from enrichments e join products p on p.id = e.product_id where p.store_id = $1`,
    [store.id],
  );
  const { rows: tagRows } = await pool.query<{ count: string }>(
    `select count(*) from tags where store_id = $1`,
    [store.id],
  );
  const { rows: activeTagRows } = await pool.query<{ count: string }>(
    `select count(*) from tags where store_id = $1 and status = 'active'`,
    [store.id],
  );

  const productCount = parseInt(productRows[0]?.count ?? "0", 10);
  const enrichmentCount = parseInt(enrichmentRows[0]?.count ?? "0", 10);
  const tagCount = parseInt(tagRows[0]?.count ?? "0", 10);
  const activeTagCount = parseInt(activeTagRows[0]?.count ?? "0", 10);

  const hasTheme = Object.keys(store.theme_settings).length > 0;

  const steps: CheckItem[] = [
    {
      id: "shopify",
      label: "Connect your Shopify store",
      detail: "Your store is connected and the product catalog has been imported.",
      done: true,
    },
    {
      id: "products",
      label: `Import product catalog (${productCount} product${productCount !== 1 ? "s" : ""})`,
      detail: "Products are synced from Shopify automatically on connect and via webhooks.",
      done: productCount > 0,
    },
    {
      id: "theme",
      label: "Configure your brand theme",
      detail: "Set your primary colour, font, and logo so the tap page matches your brand.",
      done: hasTheme,
      href: `/theme?shop=${shop}`,
      linkLabel: "Set up →",
    },
    {
      id: "enrichment",
      label: `Generate product copy (${enrichmentCount} of ${productCount} done)`,
      detail: "Run the worker to generate AI copy, then review and edit it here.",
      done: productCount > 0 && enrichmentCount >= productCount,
      href: `/enrichment?shop=${shop}`,
      linkLabel: "Review copy →",
    },
    {
      id: "tags",
      label: `Provision NFC tags (${tagCount} provisioned, ${activeTagCount} active)`,
      detail: "Provision tag IDs, assign them to products, then encode the UUIDs onto physical tags.",
      done: activeTagCount > 0,
      href: `/tags?shop=${shop}`,
      linkLabel: "Manage tags →",
    },
    {
      id: "encode",
      label: "Encode and deploy tags to products",
      detail: "Export tag UUIDs as CSV, write them to NFC tags, and place them on products.",
      done: activeTagCount > 0,
      href: `/tags/export?shop=${shop}`,
      linkLabel: "Export CSV →",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <main style={{ maxWidth: "560px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Getting Started</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.9rem" }}>{shop}</p>

      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.35rem" }}>
          <span>{doneCount} of {steps.length} steps complete</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px" }}>
          <div style={{ height: "6px", width: `${pct}%`, background: pct === 100 ? "#166534" : "#111", borderRadius: "3px", transition: "width 0.3s" }} />
        </div>
      </div>

      {steps.map((step) => <Check key={step.id} item={step} />)}
    </main>
  );
}
