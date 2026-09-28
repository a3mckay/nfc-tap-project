// The admin's public base URL for links in emails. Never a localhost address:
// on Railway the app itself listens on localhost:PORT behind a proxy.
const PRODUCTION_URL = "https://admin.tapshelf.co";

export function adminBaseUrl(header: (name: string) => string | null): string {
  if (process.env.ADMIN_BASE_URL) return process.env.ADMIN_BASE_URL;
  const proto = header("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  for (const host of [header("x-forwarded-host")?.split(",")[0]?.trim(), header("host")]) {
    if (host && !host.startsWith("localhost") && !host.startsWith("127.")) return `${proto}://${host}`;
  }
  return PRODUCTION_URL;
}
