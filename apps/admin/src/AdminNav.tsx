"use client";

// The admin sidebar. On tablets and computers it's always shown; on phones it
// becomes a drawer opened from a ☰ top bar, so pages get the full width
// (layout in app/admin-shell.css).
import { useEffect, useState, type ReactNode } from "react";

export function AdminNav({ storeLabel, children }: { storeLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";   // the page behind doesn't scroll
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <header className="admin-topbar">
        <button type="button" className="admin-icon-button" aria-label="Open menu" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen(true)}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <span className="admin-topbar-store">{storeLabel}</span>
      </header>

      {/* Following a link closes the drawer. */}
      <nav id="admin-nav" className="admin-sidebar" data-open={open}
        onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
        <button type="button" className="admin-icon-button admin-nav-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        {children}
      </nav>

      {open && <div className="admin-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />}
    </>
  );
}
