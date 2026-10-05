"use client";

import { useEffect } from "react";

// The service worker caches .js files cache-first. That's safe in production,
// where every build's files have new hashed names, but in `next dev` the file
// names never change, so the browser would keep running stale code. In
// development it isn't registered, and any earlier registration is removed.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => void r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW registration failure is non-fatal
    });
  }, []);

  return null;
}
