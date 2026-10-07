// PRD v4 §7 Step 15b: the AI research tool searches the brand's own site first,
// reads the brand page, and keeps a source for every fact
// (docs/PRD-ai-assistant.md §6.2, D41, D42).
import { describe, it, expect, vi } from "vitest";
import {
  domainOf,
  classifySource,
  findBrandDomain,
  researchProduct,
  htmlToText,
  factsFromModel,
  isFetchableUrl,
  type ResearchDeps,
} from "../src/lib/product-research.js";

const r = (url: string, title = "t", description = "d") => ({ url, title, description });

describe("domainOf / classifySource", () => {
  it("reduces a URL to its host without www", () => {
    expect(domainOf("https://www.northfield.com/products/chukka?x=1")).toBe("northfield.com");
    expect(domainOf("not a url")).toBeNull();
  });

  it("ranks the brand's own site (and its subdomains) as brand, review sites as review, the rest as retailer", () => {
    expect(classifySource("https://shop.northfield.com/chukka", "Chukka", "northfield.com")).toBe("brand");
    expect(classifySource("https://www.reddit.com/r/goodyearwelt/x", "Thoughts?", "northfield.com")).toBe("review");
    expect(classifySource("https://blog.example.com/x", "Northfield chukka review", "northfield.com")).toBe("review");
    expect(classifySource("https://www.nordstrom.com/s/chukka", "Northfield Chukka", "northfield.com")).toBe("retailer");
    expect(classifySource("https://www.nordstrom.com/s/chukka", "Northfield Chukka", null)).toBe("retailer");
  });
});

describe("findBrandDomain", () => {
  // Search results per country, and page text per URL (null = can't be read).
  const deps = (byCountry: Record<string, ReturnType<typeof r>[]>, pages: Record<string, string | null> = {}) => ({
    search: vi.fn(async (_q: string, _n: number, country?: string) => byCountry[country ?? ""] ?? []),
    fetchText: vi.fn(async (url: string) => pages[url] ?? null),
  });

  it("uses a known website without searching", async () => {
    const d = deps({});
    expect(await findBrandDomain("Northfield", "https://www.northfield.com/", "footwear", d)).toEqual({ domain: "northfield.com", found: false });
    expect(d.search).not.toHaveBeenCalled();
  });

  it("searches the brand and category from Canada, and skips a town's government site (the Carmel case)", async () => {
    const d = deps(
      { CA: [r("https://www.carmel.in.gov/"), r("https://carmelcannabis.ca/")] },
      { "https://www.carmel.in.gov/": "City of Carmel, Indiana", "https://carmelcannabis.ca/": "Carmel Cannabis | Craft Cannabis Grown in Canada" },
    );
    expect(await findBrandDomain("Carmel", null, "cannabis", d)).toEqual({ domain: "carmelcannabis.ca", found: true });
    expect(d.search).toHaveBeenCalledWith("Carmel cannabis", 5, "CA");
    expect(d.fetchText).not.toHaveBeenCalledWith("https://www.carmel.in.gov/");
  });

  it("never takes a government, school or military site", async () => {
    const d = deps(
      { CA: ["https://carmel.gov", "https://carmel.edu", "https://carmel.mil", "https://carmel.gc.ca", "https://carmel.gov.on.ca", "https://carmel.ac.uk"].map((u) => r(u, "Carmel cannabis")) },
    );
    expect(await findBrandDomain("Carmel", null, "cannabis", d)).toBeNull();
  });

  it("skips a site named like the brand whose page isn't about the category", async () => {
    const d = deps(
      { CA: [r("https://carmelrealty.ca/"), r("https://carmelcannabis.ca/")] },
      { "https://carmelrealty.ca/": "Carmel Realty: homes for sale", "https://carmelcannabis.ca/": "Carmel craft cannabis" },
    );
    expect(await findBrandDomain("Carmel", null, "cannabis", d)).toEqual({ domain: "carmelcannabis.ca", found: true });
  });

  it("checks the search result's title and description when the page can't be read (e.g. an age gate)", async () => {
    const d = deps({ CA: [r("https://carmelcannabis.ca/", "Carmel Cannabis | Craft Cannabis Grown in Canada", "")] });
    expect(await findBrandDomain("Carmel", null, "cannabis", d)).toEqual({ domain: "carmelcannabis.ca", found: true });
  });

  it("tries the US, the UK and Australia in turn, and stops at the first site that checks out", async () => {
    const d = deps({ US: [r("https://www.northfieldshoes.com/", "Northfield Shoes", "Handmade boots")] });
    expect(await findBrandDomain("Northfield", null, "footwear", d)).toEqual({ domain: "northfieldshoes.com", found: true });
    expect(d.search.mock.calls.map((c) => c[2])).toEqual(["CA", "US"]);
  });

  it("tries likely addresses when no search result checks out", async () => {
    const d = deps({}, { "https://carmelcannabis.ca/": "Carmel Cannabis | Craft Cannabis Grown in Canada" });
    expect(await findBrandDomain("Carmel", null, "cannabis", d)).toEqual({ domain: "carmelcannabis.ca", found: true });
    expect(d.search.mock.calls.map((c) => c[2])).toEqual(["CA", "US", "GB", "AU"]);
    expect(d.fetchText).toHaveBeenCalledWith("https://carmel.com/");
    expect(d.fetchText).toHaveBeenCalledWith("https://carmelcannabis.com.au/");
  });

  it("doesn't repeat the category when it's already in the brand name", async () => {
    const d = deps({ CA: [r("https://www.redwingshoes.com/", "Red Wing Shoes", "Boots since 1905")] });
    expect(await findBrandDomain("Red Wing Shoes", null, "footwear", d)).toEqual({ domain: "redwingshoes.com", found: true });
    expect(d.search).toHaveBeenCalledWith("Red Wing Shoes", 5, "CA");
  });

  it("searches the brand alone for general products, and needs only the brand on the page", async () => {
    const d = deps({ CA: [r("https://www.apc.fr/", "A.P.C. official site", "")] });
    expect(await findBrandDomain("A.P.C.", null, "general", d)).toEqual({ domain: "apc.fr", found: true });
    expect(d.search).toHaveBeenCalledWith("A.P.C.", 5, "CA");
  });

  it("returns null rather than guess when nothing checks out", async () => {
    expect(await findBrandDomain("Northfield", null, "footwear", deps({ CA: [r("https://www.nordstrom.com/x", "Northfield boots")] }))).toBeNull();
    expect(await findBrandDomain("", null, "footwear", deps({}))).toBeNull();
  });
});

describe("researchProduct", () => {
  it("searches the brand's site first, ranks brand sources first, and reads the top brand page", async () => {
    const search = vi.fn(async (q: string) =>
      q.startsWith("site:northfield.com")
        ? [r("https://northfield.com/chukka", "Chukka | Northfield", "brand snippet")]
        : [r("https://www.reddit.com/r/x", "Chukka review", "review snippet"), r("https://www.nordstrom.com/chukka", "Chukka", "retail snippet"), r("https://northfield.com/chukka", "dup", "dup")]);
    const fetchText = vi.fn(async () => "Full-grain suede. Leather lining. Made in Portugal.");

    const sources = await researchProduct({ vendor: "Northfield", title: "Weekend Chukka" }, "northfield.com", "footwear", { search, fetchText });

    expect(search).toHaveBeenCalledWith("site:northfield.com Weekend Chukka", 3);
    expect(search).toHaveBeenCalledWith("Northfield Weekend Chukka materials features review", 6, "CA");
    expect(sources.map((s) => [s.n, s.kind, s.url])).toEqual([
      [1, "brand", "https://northfield.com/chukka"],
      [2, "retailer", "https://www.nordstrom.com/chukka"],
      [3, "review", "https://www.reddit.com/r/x"],
    ]);
    expect(fetchText).toHaveBeenCalledWith("https://northfield.com/chukka");
    expect(sources[0]!.text).toContain("Made in Portugal");
    expect(sources[1]!.text).toBe("retail snippet");
  });

  it("works without a brand domain, and keeps the snippet if the page can't be read", async () => {
    const search = vi.fn(async () => [r("https://www.nordstrom.com/chukka", "Chukka", "retail snippet")]);
    const sources = await researchProduct({ vendor: "Northfield", title: "Weekend Chukka" }, null, "footwear", { search, fetchText: vi.fn(async () => null) });
    expect(search).toHaveBeenCalledTimes(1);
    expect(sources).toEqual([{ n: 1, kind: "retailer", url: "https://www.nordstrom.com/chukka", title: "Chukka", text: "retail snippet" }]);
  });

  it("searches with words that suit the product's category", async () => {
    const search = vi.fn(async () => []);
    await researchProduct({ vendor: "Carmel", title: "Animal Face" }, null, "cannabis", { search, fetchText: vi.fn(async () => null) });
    expect(search).toHaveBeenCalledWith("Carmel Animal Face cannabis strain review", 6, "CA");
  });
});

describe("htmlToText / isFetchableUrl", () => {
  it("drops scripts, styles and tags and decodes common entities", () => {
    expect(htmlToText("<style>x{}</style><p>Suede &amp; leather</p><script>evil()</script><div>Made&nbsp;in   Portugal</div>"))
      .toBe("Suede & leather Made in Portugal");
  });

  it("only fetches public https pages", () => {
    expect(isFetchableUrl("https://northfield.com/chukka")).toBe(true);
    for (const bad of ["http://northfield.com", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://[::1]/x", "file:///etc/passwd", "https://metadata.internal/x"]) {
      expect(isFetchableUrl(bad), bad).toBe(false);
    }
  });
});

describe("fetchPageText", () => {
  it("checks every redirect hop before requesting it", async () => {
    const { fetchPageText } = await import("../src/lib/product-research.js");
    const fetchSpy = vi.fn(async (_url: string) => new Response(null, { status: 302, headers: { location: "https://127.0.0.1/admin" } }));
    vi.stubGlobal("fetch", fetchSpy);
    expect(await fetchPageText("https://northfield.com/chukka")).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("returns the page's text", async () => {
    const { fetchPageText } = await import("../src/lib/product-research.js");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<h1>Chukka</h1><p>Suede</p>", { headers: { "content-type": "text/html; charset=utf-8" } })));
    expect(await fetchPageText("https://northfield.com/chukka")).toBe("Chukka Suede");
    vi.unstubAllGlobals();
  });
});

describe("factsFromModel", () => {
  const sources = [
    { n: 1, kind: "brand" as const, url: "https://northfield.com/chukka", title: "", text: "" },
    { n: 2, kind: "review" as const, url: "https://www.reddit.com/r/x", title: "", text: "" },
  ];

  it("attaches each fact's source URL and kind", () => {
    expect(factsFromModel([{ topic: "materials", fact: " Full-grain suede ", source: 1 }, { topic: "fit", fact: "Runs large", source: 2 }], sources)).toEqual([
      { topic: "materials", fact: "Full-grain suede", source_url: "https://northfield.com/chukka", source_kind: "brand" },
      { topic: "fit", fact: "Runs large", source_url: "https://www.reddit.com/r/x", source_kind: "review" },
    ]);
  });

  it("drops facts without a real source (D41), empty facts, and unknown topics become 'other'", () => {
    expect(factsFromModel([
      { topic: "materials", fact: "Unsourced claim", source: 9 },
      { topic: "materials", fact: "  ", source: 1 },
      { topic: "vibes", fact: "Pairs with chinos", source: 1 },
    ], sources)).toEqual([
      { topic: "other", fact: "Pairs with chinos", source_url: "https://northfield.com/chukka", source_kind: "brand" },
    ]);
  });
});

describe("specsFromModel (Step 15l)", async () => {
  const { specsFromModel } = await import("../src/lib/product-research.js");
  const sources = [{ n: 1, kind: "brand" as const, url: "https://carmel.ca/animal-face", title: "", text: "" }];

  it("keeps values for the template's fields that cite a real source", () => {
    expect(specsFromModel([
      { key: "thc", value: " 22–26% ", source: 1 },
      { key: "cbd", value: "<1%", source: 4 },
      { key: "nonsense", value: "x", source: 1 },
      { key: "size", value: "  ", source: 1 },
    ], sources, ["thc", "cbd", "size"])).toEqual([
      { key: "thc", value: "22–26%", source_url: "https://carmel.ca/animal-face", source_kind: "brand" },
    ]);
  });
});
