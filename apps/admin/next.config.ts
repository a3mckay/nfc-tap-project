import type { NextConfig } from "next";

const config: NextConfig = {
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
};

export default config;
