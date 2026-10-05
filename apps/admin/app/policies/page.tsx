import { getPool, getStoreByDomain, getStorePolicies, POLICY_TYPES } from "@nfc/db";
import { PoliciesForm } from "./PoliciesForm.js";

// PRD v4 §7 Step 15j: the store's policies, which the AI assistant answers
// store-wide questions from (docs/PRD-ai-assistant.md D48). Owners and managers.
interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function PoliciesPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;
  if (!shop) {
    return <main><p style={{ color: "#666" }}>Pass <code>?shop=…</code> in the URL.</p></main>;
  }
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;

  const policies = await getStorePolicies(pool, store.id);
  const initial = Object.fromEntries(policies.map((p) => [p.key, p.text]));

  return (
    <main style={{ maxWidth: "620px" }}>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.35rem" }}>Store policies</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "1.75rem" }}>
        Customers ask about these at the shelf. The AI assistant answers from what you write here, so keep it short and
        specific. Leave anything that doesn&apos;t apply blank; the assistant will say it&apos;s shared the question with you.
      </p>
      <PoliciesForm shop={shop} types={POLICY_TYPES} initial={initial} />
    </main>
  );
}
