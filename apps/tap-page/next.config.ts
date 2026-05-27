import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const baseConfig: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ["@nfc/db"],
  serverExternalPackages: ["pg"],
  webpack(webpackConfig) {
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return webpackConfig;
  },
  // Allow Shopify CDN images
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "**.myshopify.com" },
    ],
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  workboxOptions: {
    // Network-first for all navigation (product pages change frequently)
    // Falls back to cache if offline
    runtimeCaching: [
      {
        // API routes — network only (always fresh)
        urlPattern: /^https:\/\/tapshelf\.store\/(?:auth|api)\/.*/i,
        handler: "NetworkOnly",
      },
      {
        // Product & collection pages — network-first, 24h cache fallback
        urlPattern: /^https:\/\/tapshelf\.store\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages",
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
          networkTimeoutSeconds: 10,
        },
      },
      {
        // Shopify CDN product images — cache-first, 7 day TTL
        urlPattern: /^https:\/\/cdn\.shopify\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "shopify-images",
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
      {
        // Google Fonts and other static third-party assets
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "fonts",
          expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
})(baseConfig);
