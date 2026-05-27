import type { Metadata } from "next";
import "./globals.css";
import { ServiceWorkerRegistration } from "./ServiceWorkerRegistration.js";

export const metadata: Metadata = {
  title: "Product Detail",
  description: "Scan this tag to learn more about this product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans antialiased">
        {/* Capture beforeinstallprompt before React mounts so the install button never misses it */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaPrompt = e;
          }, { once: true });
        `}} />
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
