"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface StoreOption {
  shopify_shop_domain: string;
}

export function StoreSwitcher({
  currentShop,
  stores,
}: {
  currentShop: string;
  stores: StoreOption[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function switchTo(domain: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("shop", domain);
    // Stay on same section, swap the shop
    const onStorePage = pathname === "/stores" || !pathname.startsWith("/");
    router.push(onStorePage ? `/products?shop=${domain}` : `${pathname}?${params.toString()}`);
  }

  const others = stores.filter((s) => s.shopify_shop_domain !== currentShop);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "0.75rem 1.25rem", textAlign: "left",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: "0.62rem", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "1px" }}>Store</p>
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentShop}
          </p>
        </div>
        <span style={{ fontSize: "0.65rem", color: "#bbb", flexShrink: 0 }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 2px)", left: "0.5rem", right: "0.5rem",
          background: "#fff", border: "1px solid #e5e5e5", borderRadius: "8px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)", zIndex: 100,
          overflow: "hidden",
        }}>
          {/* Current store */}
          <div style={{ padding: "0.6rem 0.875rem", background: "#f9f9f9", borderBottom: "1px solid #eee" }}>
            <p style={{ fontSize: "0.68rem", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Current</p>
            <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentShop}</p>
          </div>

          {/* Other stores */}
          {others.length > 0 && (
            <div style={{ borderBottom: "1px solid #eee" }}>
              <p style={{ fontSize: "0.68rem", color: "#aaa", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", padding: "0.5rem 0.875rem 0.2rem" }}>
                Switch to
              </p>
              {others.map((s) => (
                <button
                  key={s.shopify_shop_domain}
                  type="button"
                  onClick={() => switchTo(s.shopify_shop_domain)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "0.45rem 0.875rem", background: "none", border: "none",
                    fontSize: "0.82rem", color: "#333", cursor: "pointer",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  {s.shopify_shop_domain}
                </button>
              ))}
            </div>
          )}

          {/* All stores + Add store */}
          <div>
            <button
              type="button"
              onClick={() => { setOpen(false); router.push("/stores"); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "0.5rem 0.875rem", background: "none", border: "none",
                fontSize: "0.8rem", color: "#555", cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              All stores
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); router.push("/stores?add=1"); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "0.5rem 0.875rem", background: "none",
                borderTop: "1px solid #eee", borderLeft: "none", borderRight: "none", borderBottom: "none",
                fontSize: "0.8rem", color: "#6366f1", fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              + Add store
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
