// PRD v4 §7 Step 15b: research for the product fact sheet
// (docs/PRD-ai-assistant.md §6.2). Finds the brand's own website, searches it
// first, reads the top brand page, and numbers every source so each fact the
// model returns can be traced to one (D41, D42). Search and page fetching are
// injected, so this has no network access of its own.
import type { ResearchedFact } from "@nfc/db";

export type SourceKind = "brand" | "retailer" | "review";

export interface SearchHit {
  url: string;
  title: string;
  description: string;
}

export interface ResearchDeps {
  search(query: string, count: number): Promise<SearchHit[]>;
  fetchText(url: string): Promise<string | null>;
}

export interface ResearchSource {
  n: number;
  kind: SourceKind;
  url: string;
  title: string;
  text: string;
}

const MAX_SOURCES = 8;
const PAGE_TEXT_LIMIT = 6000;

const REVIEW_HOSTS = ["reddit.com", "youtube.com", "trustpilot.com", "styleforum.net"];
// Never the brand's own site, even when the name matches.
const NOT_BRAND_HOSTS = [
  "amazon.", "ebay.", "etsy.com", "wikipedia.org", "instagram.com", "facebook.com", "linkedin.com",
  "reddit.com", "youtube.com", "tiktok.com", "pinterest.", "x.com", "twitter.com",
];
const TOPICS = ["materials", "care", "fit", "sizing", "origin", "construction", "features", "other"] as const;

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

const onDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function classifySource(url: string, title: string, brandDomain: string | null): SourceKind {
  const host = domainOf(url) ?? "";
  if (brandDomain && onDomain(host, brandDomain)) return "brand";
  if (REVIEW_HOSTS.some((h) => onDomain(host, h)) || /\breviews?\b/i.test(title)) return "review";
  return "retailer";
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// The brand's website domain: the known one if set, else the first search result
// whose domain contains the brand name. Null rather than a guess.
export async function findBrandDomain(
  vendor: string,
  knownWebsite: string | null,
  deps: Pick<ResearchDeps, "search">,
): Promise<{ domain: string; found: boolean } | null> {
  if (knownWebsite) {
    const domain = domainOf(knownWebsite.includes("://") ? knownWebsite : `https://${knownWebsite}`);
    return domain ? { domain, found: false } : null;
  }
  const name = compact(vendor);
  if (!name) return null;
  for (const hit of await deps.search(`${vendor} official site`, 5)) {
    const domain = domainOf(hit.url);
    if (!domain || NOT_BRAND_HOSTS.some((h) => domain.includes(h))) continue;
    if (compact(domain.split(".")[0]!).includes(name)) return { domain, found: true };
  }
  return null;
}

const KIND_ORDER: Record<SourceKind, number> = { brand: 0, retailer: 1, review: 2 };

export async function researchProduct(
  product: { vendor: string | null; title: string },
  brandDomain: string | null,
  deps: ResearchDeps,
): Promise<ResearchSource[]> {
  const name = [product.vendor, product.title].filter(Boolean).join(" ");
  const [brandHits, webHits] = await Promise.all([
    brandDomain ? deps.search(`site:${brandDomain} ${product.title}`, 3) : Promise.resolve([]),
    deps.search(`${name} materials features review`, 6),
  ]);

  const seen = new Set<string>();
  const ranked = [...brandHits, ...webHits]
    .filter((h) => !seen.has(h.url) && seen.add(h.url))
    .map((h) => ({ ...h, kind: classifySource(h.url, h.title, brandDomain) }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .slice(0, MAX_SOURCES);

  const sources: ResearchSource[] = ranked.map((h, i) => ({ n: i + 1, kind: h.kind, url: h.url, title: h.title, text: h.description }));
  const topBrand = sources.find((s) => s.kind === "brand");
  if (topBrand) {
    const page = await deps.fetchText(topBrand.url);
    if (page) topBrand.text = page.slice(0, PAGE_TEXT_LIMIT);
  }
  return sources;
}

export function sourcesForPrompt(sources: ResearchSource[]): string {
  return sources.map((s) => `[${s.n}] (${s.kind}) ${s.title}\n${s.url}\n${s.text}`).join("\n\n");
}

const ENTITIES: Record<string, string> = { "&amp;": "&", "&nbsp;": " ", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&lt;": "<", "&gt;": ">" };

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(amp|nbsp|quot|#39|apos|lt|gt);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

// Only public https pages: search results are untrusted, so never let one
// point the server at itself or a private network.
export function isFetchableUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) return false;
  if (host.startsWith("[") || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return false;   // IP literals
  return host.includes(".");
}

// Turns the model's facts into fact-sheet rows. A fact whose source number
// doesn't match a real source is dropped: claims need a source (D41).
export function factsFromModel(
  raw: Array<{ topic: string; fact: string; source: number }>,
  sources: ResearchSource[],
): ResearchedFact[] {
  const byN = new Map(sources.map((s) => [s.n, s]));
  const out: ResearchedFact[] = [];
  for (const f of raw) {
    const source = byN.get(f.source);
    const fact = f.fact?.trim();
    if (!source || !fact) continue;
    const topic = (TOPICS as readonly string[]).includes(f.topic) ? f.topic : "other";
    out.push({ topic, fact, source_url: source.url, source_kind: source.kind });
  }
  return out.slice(0, 20);
}

export const FACT_TOPICS = TOPICS;

// The real page fetcher used in production.
// Redirects are followed by hand so every hop is checked before it's requested.
export async function fetchPageText(url: string): Promise<string | null> {
  let next = url;
  try {
    for (let hop = 0; hop < 4; hop++) {
      if (!isFetchableUrl(next)) return null;
      const res = await fetch(next, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { Accept: "text/html" },
      });
      const location = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && location) {
        next = new URL(location, next).toString();
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
      return htmlToText((await res.text()).slice(0, 500_000)) || null;
    }
    return null;
  } catch {
    return null;
  }
}

// Spec values from the model (PRD v4 §7 Step 15l): only the template's fields,
// only with a real source (D41).
export function specsFromModel(
  raw: Array<{ key: string; value: string; source: number }>,
  sources: ResearchSource[],
  allowedKeys: string[],
): Array<{ key: string; value: string; source_url: string | null; source_kind: SourceKind }> {
  const byN = new Map(sources.map((s) => [s.n, s]));
  const keys = new Set(allowedKeys);
  return (raw ?? []).flatMap((s) => {
    const source = byN.get(s.source);
    const value = s.value?.trim();
    return source && value && keys.has(s.key) ? [{ key: s.key, value, source_url: source.url, source_kind: source.kind }] : [];
  });
}
