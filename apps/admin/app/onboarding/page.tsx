import Link from "next/link";
import { getPool, getStoreByDomain } from "@nfc/db";

interface PageProps {
  searchParams: Promise<{ shop?: string; welcome?: string }>;
}

interface CheckItem {
  id: string;
  label: string;
  detail: string;
  done: boolean;
  href?: string;
  linkLabel?: string;
}

function Check({ item, isNext }: { item: CheckItem; isNext: boolean }) {
  return (
    <div style={{
      display: "flex",
      gap: "0.75rem",
      padding: "0.875rem 0",
      borderBottom: "1px solid #f4f4f4",
      alignItems: "flex-start",
      opacity: item.done ? 0.65 : 1,
    }}>
      <span style={{
        flexShrink: 0,
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        background: item.done ? "#dcfce7" : isNext ? "#111" : "#f3f4f6",
        color: item.done ? "#166534" : isNext ? "#fff" : "#9ca3af",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.8rem",
        fontWeight: 700,
        marginTop: "1px",
      }}>
        {item.done ? "✓" : "→"}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{
          fontWeight: item.done ? 400 : 600,
          color: item.done ? "#6b7280" : "#111",
          marginBottom: "2px",
          textDecoration: item.done ? "line-through" : "none",
        }}>
          {item.label}
        </p>
        <p style={{ fontSize: "0.8rem", color: "#888" }}>{item.detail}</p>
      </div>
      {item.href && !item.done && (
        <Link
          href={item.href}
          style={{
            fontSize: "0.8rem",
            whiteSpace: "nowrap",
            marginTop: "2px",
            color: isNext ? "#111" : "#555",
            fontWeight: isNext ? 600 : 400,
          }}
        >
          {item.linkLabel ?? "Go →"}
        </Link>
      )}
    </div>
  );
}

export default async function OnboardingPage({ searchParams }: PageProps) {
  const { shop, welcome } = await searchParams;

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
      detail: "Your store is connected and your product catalog has been imported.",
      done: true,
    },
    {
      id: "products",
      label: `Import product catalog (${productCount} product${productCount !== 1 ? "s" : ""})`,
      detail: "Products sync automatically from Shopify. They should appear here shortly after connecting.",
      done: productCount > 0,
      href: `/products?shop=${shop}`,
      linkLabel: "View products →",
    },
    {
      id: "theme",
      label: "Set your brand theme",
      detail: "Choose your primary colour and logo so the customer tap page matches your brand.",
      done: hasTheme,
      href: `/theme?shop=${shop}`,
      linkLabel: "Set up theme →",
    },
    {
      id: "enrichment",
      label: `Generate product copy (${enrichmentCount} of ${productCount} done)`,
      detail: "AI-generated descriptions and highlights for each product. Review and edit before publishing.",
      done: productCount > 0 && enrichmentCount >= productCount,
      href: `/enrichment?shop=${shop}`,
      linkLabel: "Generate copy →",
    },
    {
      id: "tags",
      label: `Provision NFC tags (${tagCount} provisioned, ${activeTagCount} active)`,
      detail: "Create tag records, assign them to products, then encode the UUIDs onto physical NFC tags.",
      done: activeTagCount > 0,
      href: `/tags?shop=${shop}`,
      linkLabel: "Manage tags →",
    },
    {
      id: "encode",
      label: "Encode and deploy tags to products",
      detail: "Export your tag UUIDs as a CSV, write them to NFC tags with any NFC writer app, and attach them to products.",
      done: activeTagCount > 0,
      href: `/tags?shop=${shop}`,
      linkLabel: "Export CSV →",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const allDone = doneCount === steps.length;
  const nextStep = steps.find((s) => !s.done);

  return (
    <main style={{ maxWidth: "560px" }}>

      {/* Welcome banner — only shown on first arrival from signup */}
      {welcome && (
        <div style={{
          padding: "1rem 1.25rem",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "8px",
          marginBottom: "1.75rem",
        }}>
          <p style={{ fontWeight: 600, color: "#166534", margin: "0 0 0.25rem" }}>🎉 Welcome to TapShelf!</p>
          <p style={{ fontSize: "0.875rem", color: "#15803d", margin: 0 }}>
            Your store is set up. Follow the steps below to get your first NFC tags live.
          </p>
        </div>
      )}

      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Getting Started</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem", fontSize: "0.85rem" }}>{shop}</p>

      {/* Progress bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#888", marginBottom: "0.35rem" }}>
          <span>{doneCount} of {steps.length} steps complete</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: "6px", background: "#f0f0f0", borderRadius: "3px" }}>
          <div style={{
            height: "6px",
            width: `${pct}%`,
            background: allDone ? "#166534" : "#111",
            borderRadius: "3px",
            transition: "width 0.3s",
          }} />
        </div>
      </div>

      {/* Next step callout */}
      {!allDone && nextStep?.href && (
        <div style={{
          padding: "0.875rem 1rem",
          background: "#111",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
        }}>
          <div>
            <p style={{ fontSize: "0.7rem", color: "#888", margin: "0 0 0.2rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Next step</p>
            <p style={{ color: "#fff", fontWeight: 600, margin: 0, fontSize: "0.9rem" }}>{nextStep.label.replace(/ \(.*\)$/, "")}</p>
          </div>
          <Link
            href={nextStep.href}
            style={{
              background: "#fff",
              color: "#111",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {nextStep.linkLabel ?? "Go →"}
          </Link>
        </div>
      )}

      {/* All done */}
      {allDone && (
        <div style={{
          padding: "0.875rem 1rem",
          background: "#f0fdf4",
          border: "1px solid #86efac",
          borderRadius: "8px",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}>
          <span style={{ fontSize: "1.25rem" }}>🎉</span>
          <div>
            <p style={{ fontWeight: 600, color: "#166534", margin: "0 0 0.1rem" }}>All done — your tags are live!</p>
            <p style={{ fontSize: "0.8rem", color: "#15803d", margin: 0 }}>
              Customers can now scan your NFC tags.{" "}
              <Link href={`/analytics?shop=${shop}`} style={{ color: "#166534", fontWeight: 600 }}>View analytics →</Link>
            </p>
          </div>
        </div>
      )}

      {/* Checklist */}
      {steps.map((step, i) => {
        const prevDone = i === 0 || steps[i - 1]?.done;
        const isNext = !step.done && !!prevDone;
        return <Check key={step.id} item={step} isNext={isNext} />;
      })}

      {/* Dashboard link */}
      <div style={{ marginTop: "1.5rem" }}>
        <Link href={`/products?shop=${shop}`} style={{ fontSize: "0.85rem", color: "#888" }}>
          Go to dashboard →
        </Link>
      </div>
    </main>
  );
}
