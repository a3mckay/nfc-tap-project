// PRD v4 §7 Step 15b: research for the product fact sheet
// (docs/PRD-ai-assistant.md §6.2). Finds the brand's own website, searches it
// first, reads the top brand page, and numbers every source so each fact the
// model returns can be traced to one (D41, D42). Search and page fetching are
// injected, so this has no network access of its own.
import type { ResearchedFact, SpecCategory } from "@nfc/db";

export type SourceKind = "brand" | "retailer" | "review";

export interface SearchHit {
  url: string;
  title: string;
  description: string;
}

export interface ResearchDeps {
  search(query: string, count: number, country?: string): Promise<SearchHit[]>;
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

// Stores are Canadian for now (stores have no country yet; see DEFERRED.md).
// Brand sites are looked for in other English-speaking markets too, home first.
const HOME_COUNTRY = "CA";
const BRAND_COUNTRIES = [HOME_COUNTRY, "US", "GB", "AU"];
const GUESS_ENDINGS = [".ca", ".com", ".co.uk", ".com.au"];

// Per category: the word added to the brand search, what the brand's page must
// mention to count as its site, and the words for the product search.
const CATEGORY_SEARCH: Record<SpecCategory, { word: string; match: RegExp | null; research: string }> = {
  cannabis: { word: "cannabis", match: /cannabis|marijuana/i, research: "cannabis strain review" },
  wine: { word: "wine", match: /wine|vineyard/i, research: "wine tasting notes review" },
  beer: { word: "beer", match: /beer|brew/i, research: "beer review" },
  spirits: { word: "spirits", match: /spirit|distill|whisk|vodka|\bgin\b|\brum\b|tequila/i, research: "tasting notes review" },
  eyewear: { word: "eyewear", match: /eyewear|sunglass|glasses|optical/i, research: "lens frame review" },
  footwear: { word: "shoes", match: /shoe|boot|sneaker|footwear/i, research: "materials features review" },
  apparel: { word: "clothing", match: /cloth|apparel|wear|fashion/i, research: "materials features review" },
  home: { word: "home", match: /home|furniture|decor|bedding|linen/i, research: "materials features review" },
  general: { word: "", match: null, research: "materials features review" },
};

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

// Government, school and military sites are never a brand's (e.g. carmel.in.gov).
function isInstitution(domain: string): boolean {
  const labels = domain.split(".");
  return labels.slice(1).some((l) => ["gov", "edu", "mil", "gc"].includes(l)) || labels.at(-2) === "ac";
}

// The brand's website domain: the known one if set; else a search result named
// like the brand whose page (or, if it can't be read, its search snippet)
// mentions the brand and the category; else a likely address that does. Null
// rather than a guess.
export async function findBrandDomain(
  vendor: string,
  knownWebsite: string | null,
  category: SpecCategory,
  deps: ResearchDeps,
): Promise<{ domain: string; found: boolean } | null> {
  if (knownWebsite) {
    const domain = domainOf(knownWebsite.includes("://") ? knownWebsite : `https://${knownWebsite}`);
    return domain ? { domain, found: false } : null;
  }
  const name = compact(vendor);
  if (!name) return null;
  const { word, match } = CATEGORY_SEARCH[category];
  const isBrandPage = (text: string) => compact(text).includes(name) && (!match || match.test(text));

  const query = !word || match?.test(vendor) ? vendor : `${vendor} ${word}`;
  for (const country of BRAND_COUNTRIES) {
    for (const hit of await deps.search(query, 5, country)) {
      const domain = domainOf(hit.url);
      if (!domain || isInstitution(domain) || NOT_BRAND_HOSTS.some((h) => domain.includes(h))) continue;
      if (!compact(domain.split(".")[0]!).includes(name)) continue;
      const page = await deps.fetchText(hit.url);
      if (isBrandPage(`${page ?? ""} ${hit.title} ${hit.description}`)) return { domain, found: true };
    }
  }

  const names = word ? [name, name + compact(word)] : [name];
  const guesses = names.flatMap((n) => GUESS_ENDINGS.map((end) => n + end));
  const pages = await Promise.all(guesses.map((d) => deps.fetchText(`https://${d}/`)));
  const i = pages.findIndex((p) => p !== null && isBrandPage(p));
  return i >= 0 ? { domain: guesses[i]!, found: true } : null;
}

const KIND_ORDER: Record<SourceKind, number> = { brand: 0, retailer: 1, review: 2 };

export async function researchProduct(
  product: { vendor: string | null; title: string },
  brandDomain: string | null,
  category: SpecCategory,
  deps: ResearchDeps,
): Promise<ResearchSource[]> {
  const name = [product.vendor, product.title].filter(Boolean).join(" ");
  const [brandHits, webHits] = await Promise.all([
    brandDomain ? deps.search(`site:${brandDomain} ${product.title}`, 3) : Promise.resolve([]),
    deps.search(`${name} ${CATEGORY_SEARCH[category].research}`, 6, HOME_COUNTRY),
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
// Topics outside the product's category's list (docs/category-labels.md §3) become "other".
export function factsFromModel(
  raw: Array<{ topic: string; fact: string; source: number }>,
  sources: ResearchSource[],
  topics: readonly string[] = TOPICS,
): ResearchedFact[] {
  const byN = new Map(sources.map((s) => [s.n, s]));
  const out: ResearchedFact[] = [];
  for (const f of raw) {
    const source = byN.get(f.source);
    const fact = f.fact?.trim();
    if (!source || !fact) continue;
    const topic = topics.includes(f.topic) ? f.topic : "other";
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
