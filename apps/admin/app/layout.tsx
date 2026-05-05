import type { Metadata } from "next";
import Link from "next/link";
import { headers, cookies } from "next/headers";
import { Suspense } from "react";
import { verifyAdminCookie, COOKIE_NAME } from "../src/admin-auth.js";
import { StoreSwitcher } from "../src/StoreSwitcher.js";
import { getPool, getAllStores } from "@nfc/db";

export const metadata: Metadata = { title: "NFC Admin" };

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

async function Sidebar() {
  const jar = await cookies();
  const isAuthed = await verifyAdminCookie(jar.get(COOKIE_NAME)?.value);
  if (!isAuthed) return null;

  const headersList = await headers();
  let currentShop = headersList.get("x-current-shop") ?? "";

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const stores = await getAllStores(pool);

  // Auto-select the only store on first login
  if (!currentShop && stores.length === 1) {
    currentShop = stores[0]!.shopify_shop_domain;
  }

  const s = currentShop;

  return (
    <nav style={{
      width: "210px",
      flexShrink: 0,
      borderRight: "1px solid #eee",
      background: "#fafafa",
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
    }}>
      {/* Brand */}
      <div style={{ padding: "1.25rem 1.25rem 1rem", fontWeight: 700, fontSize: "0.95rem", borderBottom: "1px solid #eee" }}>
        NFC Admin
      </div>

      {/* Store switcher */}
      <div style={{ borderBottom: "1px solid #eee" }}>
        {s ? (
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
            <Link href={`/products?shop=${s}`} style={linkStyle}>Products</Link>
            <Link href={`/enrichment?shop=${s}`} style={linkStyle}>Content</Link>
            <Link href={`/tags?shop=${s}`} style={linkStyle}>Tags</Link>
            <Divider />
            <Link href={`/reviews?shop=${s}`} style={linkStyle}>Reviews</Link>
            <Link href={`/offers?shop=${s}`} style={linkStyle}>Offers</Link>
            <Divider />
            <Link href={`/analytics?shop=${s}`} style={linkStyle}>Analytics</Link>
            <Link href={`/theme?shop=${s}`} style={linkStyle}>Theme</Link>
            <Link href={`/canonical?shop=${s}`} style={linkStyle}>Product Matching</Link>
          </div>

          <div style={{ borderTop: "1px solid #eee", paddingTop: "0.35rem", paddingBottom: "0.35rem" }}>
            <Link href={`/plan?shop=${s}`} style={dimLinkStyle}>Plan</Link>
            <Link href={`/settings?shop=${s}`} style={dimLinkStyle}>Settings</Link>
            <Link href={`/onboarding?shop=${s}`} style={dimLinkStyle}>Getting Started</Link>
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
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", margin: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, padding: "2rem", maxWidth: "900px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
