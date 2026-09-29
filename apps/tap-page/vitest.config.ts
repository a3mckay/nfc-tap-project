import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Same JSX transform as Next.js, so component tests don't need `import React`.
  esbuild: { jsx: "automatic" },
  resolve: {
    // Mirrors the "@/*" path in tsconfig.json so tests can import routes.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    globals: false,
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
