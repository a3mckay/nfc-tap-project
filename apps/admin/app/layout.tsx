import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { AdminSession } from "../src/admin-auth.js";
import { StoreSwitcher } from "../src/StoreSwitcher.js";
import { AdminNav } from "../src/AdminNav.js";
import "./admin-shell.css";
import { getAdminSession, getCurrentAdminSession } from "../src/current-store.js";
import { can, accessRedirect, type Permission } from "../src/permissions.js";
import { getPool, getAllStores, getStoreByDomain } from "@nfc/db";

export const metadata: Metadata = { title: "TapShelf Admin" };

const linkStyle: React.CSSProperties = {
  display: "block",
  padding: "0.45rem 1.25rem",
  fontSize: "0.875rem",
  color: "#333",
  textDecoration: "none",
};

const dimLinkStyle: React.CSSProperties = {
  ...linkStyle,
  fontSize: "0.8rem",
  color: "#888",
};

function Divider() {
  return <div style={{ height: "1px", background: "#eee", margin: "0.4rem 0" }} />;
}

// Sidebar links in groups, each link shown only to roles with the permission
// it needs; empty groups are dropped.
const MAIN_NAV: [string, string, Permission][][] = [
  [
    ["/questions", "Questions", "questions"],
    ["/products", "Products", "catalog"],
    ["/enrichment", "Content", "content"],
    ["/tags", "Tags", "catalog"],
    ["/staff", "Staff", "progress"],
    ["/policies", "Store policies", "policies"],
  ],
  [
    ["/reviews", "Reviews", "content"],
    ["/offers", "Offers", "marketing"],
  ],
  [
    ["/notifications", "Notifications", "marketing"],
    ["/analytics", "Analytics", "analytics"],
    ["/theme", "Theme", "store_settings"],
    ["/canonical", "Product Matching", "store_settings"],
  ],
];
const FOOTER_NAV: [string, string, Permission][] = [
  ["/plan", "Plan", "billing"],
  ["/settings", "Settings", "store_settings"],
  ["/onboarding", "Getting Started", "store_settings"],
];

async function Sidebar({ session }: { session: AdminSession | null }) {
  if (!session) return null;

  // Staff only see their home page, without the owner navigation.
  if (session.role === "staff") return null;

  const headersList = await headers();
  const role = session.role;
  let currentShop = headersList.get("x-current-shop") ?? "";

  // Super-admin: full store switcher
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  let stores: Awaited<ReturnType<typeof getAllStores>> = [];
  if (role === "super") {
    stores = await getAllStores(pool);
    // Auto-select the only store on first login
    if (!currentShop && stores.length === 1) {
      currentShop = stores[0]!.shopify_shop_domain;
    }
  }

  const s = currentShop;
  // The store's display name (Settings → Store name), else its web address.
  const current = s ? stores.find((st) => st.shopify_shop_domain === s) ?? await getStoreByDomain(pool, s) : null;
  const storeLabel = current?.name || s || "TapShelf Admin";

  return (
    <AdminNav storeLabel={storeLabel}>
      {/* Brand */}
      <Link href={s ? `/?shop=${encodeURIComponent(s)}` : "/"} style={{ display: "block", padding: "1.25rem 1.25rem 1rem", fontWeight: 700, fontSize: "0.95rem", borderBottom: "1px solid #eee", color: "#111", textDecoration: "none" }}>
        TapShelf Admin
      </Link>

      {/* Store indicator */}
      <div style={{ borderBottom: "1px solid #eee" }}>
        {role === "store" || role === "manager" ? (
          /* Owners and managers see their store name, no switcher */
          <div style={{ ...linkStyle, padding: "0.875rem 1.25rem", fontWeight: 500, color: "#333" }}>
            {storeLabel}
            {role === "manager" && (
              <span style={{ display: "block", fontSize: "0.72rem", color: "#888", fontWeight: 400, marginTop: "2px" }}>
                {session.level === "manager" ? "Manager" : "Co-manager"}
              </span>
            )}
          </div>
        ) : s ? (
          <Suspense>
            <StoreSwitcher currentShop={s} stores={stores} />
          </Suspense>
        ) : (
          <Link href="/stores" style={{ ...linkStyle, padding: "0.875rem 1.25rem", fontWeight: 500 }}>
            Select a store →
          </Link>
        )}
      </div>

      {/* Main nav */}
      {s && (
        <>
          <div style={{ flex: 1, paddingTop: "0.35rem", paddingBottom: "0.35rem" }}>
            {MAIN_NAV
              .map((group) => group.filter((item) => can(session, item[2])))
              .filter((group) => group.length > 0)
              .map((group, k) => (
                <div key={group[0]![0]}>
                  {k > 0 && <Divider />}
                  {group.map((item) => (
                    <Link key={item[0]} href={`${item[0]}?shop=${s}`} style={linkStyle}>{item[1]}</Link>
                  ))}
                </div>
              ))}
          </div>

          <div style={{ borderTop: "1px solid #eee", paddingTop: "0.35rem", paddingBottom: "0.35rem" }}>
            {FOOTER_NAV.filter((item) => can(session, item[2])).map((item) => (
              <Link key={item[0]} href={`${item[0]}?shop=${s}`} style={dimLinkStyle}>{item[1]}</Link>
            ))}
            {role === "super" && (
              <Link href="/stores" style={dimLinkStyle}>All Stores</Link>
            )}
          </div>
        </>
      )}

      {/* Sign out */}
      <div style={{ borderTop: "1px solid #eee", paddingBottom: "0.5rem" }}>
        <form action="/api/logout" method="POST">
          <button type="submit" style={{ ...dimLinkStyle, background: "none", border: "none", cursor: "pointer", color: "#bbb", width: "100%", textAlign: "left" }}>
            Sign out
          </button>
        </form>
      </div>
    </AdminNav>
  );
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Managers: re-check their live role on every admin page (x-pathname is only
  // set by the middleware, so sign-in pages are skipped).
  const pathname = (await headers()).get("x-pathname");
  const cookieSession = await getAdminSession();
  let session = cookieSession;
  if (pathname && cookieSession?.role === "manager") {
    session = await getCurrentAdminSession(getPool({ connectionString: process.env.DATABASE_URL }));
    const to = accessRedirect(cookieSession, session, pathname);
    if (to) redirect(to);
  }

  return (
    <html lang="en">
      <body className="admin-body">
        <Sidebar session={session} />
        <main className="admin-main">
          {children}
        </main>
      </body>
    </html>
  );
}
