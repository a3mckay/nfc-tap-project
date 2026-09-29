import { getPool, getStoreByDomain, getActiveStaffByStore, getStaffTrainingProgress } from "@nfc/db";
import { reviewedLabel, lastActiveLabel } from "@/progress-utils.js";
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

  const [staff, progress] = await Promise.all([
    getActiveStaffByStore(pool, store.id),
    getStaffTrainingProgress(pool, store.id),
  ]);
  const byStaff = new Map(progress.staff.map((p) => [p.staff_id, p]));

  return (
    <main>
      <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.25rem" }}>Staff</h1>
      <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
        Add the email addresses of your team. We email each person an invite; only these
        emails can sign in as staff and see the training view when they tap a product.
      </p>
      <StaffManager
        shop={shop}
        staff={staff.map((s) => {
          const p = byStaff.get(s.id);
          return {
            id: s.id, email: s.email, name: s.name, added: s.created_at.toISOString(),
            progress: `${reviewedLabel(p?.reviewed ?? 0, progress.tagged_products)} · ${lastActiveLabel(p?.last_viewed_at ?? null)}`,
          };
        })}
      />

      {progress.tagged_products > 0 && (
        <section style={{ marginTop: "2rem", borderTop: "1px solid #eee", paddingTop: "1.5rem" }}>
          <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
            Training coverage
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#333", marginBottom: "0.75rem" }}>
            Training notes written for {progress.with_notes} of {progress.tagged_products} tagged products.
          </p>
          {progress.unreviewed.length > 0 ? (
            <>
              <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "0.4rem" }}>
                Not reviewed by anyone on the team yet:
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.9rem", lineHeight: 1.7 }}>
                {progress.unreviewed.map((p) => (
                  <li key={p.id}>
                    <a href={`/enrichment/${p.id}/training?shop=${encodeURIComponent(shop)}`} style={{ color: "#333" }}>{p.title}</a>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "#166534" }}>Every tagged product has been reviewed by someone on the team.</p>
          )}
        </section>
      )}
    </main>
  );
}
