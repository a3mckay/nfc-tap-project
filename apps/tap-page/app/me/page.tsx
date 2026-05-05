import { getPool, getCustomerTapHistory, type CustomerTapRow } from "@nfc/db";
import { getCurrentCustomer } from "@/lib/auth.js";
import { SignInForm } from "./SignInForm.js";
import { signOutAction } from "./actions.js";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <main style={{ maxWidth: "440px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "0.5rem", color: "#111" }}>Your Collection</h1>
        <p style={{ fontSize: "0.92rem", color: "#666", lineHeight: 1.6, marginBottom: "1.75rem" }}>
          Sign in to access products you&apos;ve tapped, your loved items, and exclusive offers from stores you&apos;ve visited.
        </p>
        <SignInForm />
        <p style={{ fontSize: "0.78rem", color: "#999", marginTop: "1rem", lineHeight: 1.5 }}>
          We&apos;ll email you a one-tap sign-in link. No password to remember.
        </p>
      </main>
    );
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const taps = await getCustomerTapHistory(pool, customer.id, 100);

  const loved = taps.filter((t) => t.reaction === "loved");
  const stores = new Map<string, number>();
  for (const t of taps) {
    stores.set(t.store_domain, (stores.get(t.store_domain) ?? 0) + 1);
  }

  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 600, color: "#111" }}>Your Collection</h1>
          <p style={{ fontSize: "0.85rem", color: "#888", marginTop: "0.25rem" }}>{customer.email}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit" style={{ fontSize: "0.78rem", color: "#888", background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
            Sign out
          </button>
        </form>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", margin: "1.5rem 0 2rem" }}>
        <Stat label="Tapped" value={taps.length} />
        <Stat label="Loved"  value={loved.length} />
        <Stat label="Stores" value={stores.size} />
      </div>

      {taps.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "#888", textAlign: "center", padding: "2rem 0" }}>
          You haven&apos;t tapped anything yet. Tap a product in-store to start your collection.
        </p>
      ) : (
        <>
          {loved.length > 0 && <Section title="Loved" taps={loved} />}
          <Section title="All taps" taps={taps} />
        </>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fafafa", border: "1px solid #f0f0f0", borderRadius: "8px", padding: "0.875rem", textAlign: "center" }}>
      <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111", marginBottom: "2px" }}>{value}</p>
      <p style={{ fontSize: "0.7rem", color: "#888", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
    </div>
  );
}

function Section({ title, taps }: { title: string; taps: CustomerTapRow[] }) {
  return (
    <section style={{ marginBottom: "2rem" }}>
      <h2 style={{ fontSize: "0.75rem", fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.75rem" }}>
        {title}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
        {taps.map((t) => (
          <a key={t.id} href={`/p/${t.tag_id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{
              width: "100%", aspectRatio: "1/1", borderRadius: "8px",
              background: t.product_image_url ? `url(${t.product_image_url}) center/cover` : "#f0f0f0",
              marginBottom: "6px", position: "relative",
            }}>
              {t.reaction === "loved" && (
                <span style={{
                  position: "absolute", top: "6px", right: "6px",
                  background: "#fff", borderRadius: "50%", width: "22px", height: "22px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.7rem", boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}>♥</span>
              )}
            </div>
            <p style={{ fontSize: "0.78rem", fontWeight: 500, color: "#111", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {t.product_title ?? "Untitled product"}
            </p>
            {t.product_vendor && (
              <p style={{ fontSize: "0.7rem", color: "#999", marginTop: "2px" }}>{t.product_vendor}</p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}
