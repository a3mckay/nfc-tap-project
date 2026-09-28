import { getPool, getStoreByDomain, getActiveStaffByStore } from "@nfc/db";
import { StaffManager } from "./StaffManager.js";

interface PageProps {
  searchParams: Promise<{ shop?: string }>;
}

export default async function StaffPage({ searchParams }: PageProps) {
  const { shop } = await searchParams;
  if (!shop) return <main><p>Pass <code>?shop=</code></p></main>;

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return <main><p style={{ color: "#c00" }}>Store not found.</p></main>;

  const staff = await getActiveStaffByStore(pool, store.id);

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Staff</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Add the email addresses of your team. Only these emails can sign in as staff and see
        the training view when they tap a product.
      </p>
      <StaffManager
        shop={shop}
        staff={staff.map((s) => ({ id: s.id, email: s.email, name: s.name, added: s.created_at.toISOString() }))}
      />
    </main>
  );
}
