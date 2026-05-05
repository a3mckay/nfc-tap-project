import { getPool, getStoreByDomain } from "@nfc/db";
import { ConsentToggle } from "./ConsentToggle.js";
import { PlatformPicker } from "./PlatformPicker.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;

  if (!shop) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Settings</h1>
        <p style={{ color: "#666" }}>Pass <code>?shop=your-store.myshopify.com</code> to manage settings.</p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);

  if (!store) {
    return (
      <main>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Settings</h1>
        <p style={{ color: "#c00" }}>Store not found.</p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "560px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Settings</h1>
      <p style={{ color: "#666", marginBottom: "2rem", fontSize: "0.9rem" }}>{shop}</p>

      <section style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          E-commerce platform
        </p>
        <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1rem", lineHeight: 1.5 }}>
          Tells us how to manage your products. Shopify gets full automation; other platforms use manual workflows.
        </p>
        <PlatformPicker shop={shop} initialPlatform={store.platform} />
      </section>

      <section>
        <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
          Data sharing & network insights
        </p>
        <p style={{ fontSize: "0.875rem", color: "#555", marginBottom: "1rem", lineHeight: 1.5 }}>
          When opted in, your anonymised tap data contributes to network-wide insights — such as which products are trending across the network. No customer PII is shared. You can opt out at any time.
        </p>
        <ConsentToggle shop={shop} initialOptedIn={store.data_sharing_opted_in} />
      </section>
    </main>
  );
}
