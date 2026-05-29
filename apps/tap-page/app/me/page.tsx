import {
  getPool,
  getCustomerTapHistory,
  getCustomerActiveOffers,
  getNewProductsFromVisitedStores,
  getOrCreateNotificationPrefs,
} from "@nfc/db";
import { getCurrentCustomer } from "@/lib/auth.js";
import { SignInForm } from "./SignInForm.js";
import { signOutAction } from "./actions.js";
import { AddToHomeScreen } from "./AddToHomeScreen.js";
import { CollectionView } from "./CollectionView.js";
import { ProfileCard } from "./ProfileCard.js";
import { NotificationPrefsCard } from "./NotificationPrefsCard.js";

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

  const [taps, offers, newProducts, notifPrefs] = await Promise.all([
    getCustomerTapHistory(pool, customer.id, 100).catch(() => [] as Awaited<ReturnType<typeof getCustomerTapHistory>>),
    getCustomerActiveOffers(pool, customer.id).catch(() => [] as Awaited<ReturnType<typeof getCustomerActiveOffers>>),
    getNewProductsFromVisitedStores(pool, customer.id, 12).catch(() => [] as Awaited<ReturnType<typeof getNewProductsFromVisitedStores>>),
    getOrCreateNotificationPrefs(pool, customer.id).catch(() => null),
  ]);

  const loved = taps.filter((t) => t.reaction === "loved");
  const storeCount = new Set(taps.map((t) => t.store_domain)).size;

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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", margin: "1.5rem 0 1.25rem" }}>
        <Stat label="Tapped" value={taps.length} />
        <Stat label="Loved" value={loved.length} />
        <Stat label="Stores" value={storeCount} />
      </div>

      <AddToHomeScreen />

      <div style={{ height: "1px", background: "#f0f0f0", margin: "1.5rem 0" }} />

      <ProfileCard
        initialName={customer.display_name ?? ""}
        initialPhone={customer.phone ?? ""}
        initialChannel={customer.preferred_channel ?? "email"}
      />

      {notifPrefs && (
        <NotificationPrefsCard initialPrefs={notifPrefs} />
      )}

      <div style={{ height: "1px", background: "#f0f0f0", margin: "0.5rem 0 1.5rem" }} />

      {taps.length === 0 ? (
        <p style={{ fontSize: "0.9rem", color: "#888", textAlign: "center", padding: "2rem 0" }}>
          You haven&apos;t tapped anything yet. Tap a product in-store to start your collection.
        </p>
      ) : (
        <CollectionView taps={taps} offers={offers} newProducts={newProducts} />
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
