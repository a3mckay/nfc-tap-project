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
  const deps = (results: ReturnType<typeof r>[]): Pick<ResearchDeps, "search"> => ({ search: vi.fn(async () => results) });

  it("uses a known website without searching", async () => {
    const d = deps([]);
    expect(await findBrandDomain("Northfield", "https://www.northfield.com/", d)).toEqual({ domain: "northfield.com", found: false });
    expect(d.search).not.toHaveBeenCalled();
  });

  it("searches for the official site and takes the first result whose domain matches the brand name", async () => {
    const d = deps([r("https://www.amazon.com/northfield"), r("https://en.wikipedia.org/wiki/Northfield"), r("https://www.northfieldshoes.com/")]);
    expect(await findBrandDomain("Northfield", null, d)).toEqual({ domain: "northfieldshoes.com", found: true });
    expect(d.search).toHaveBeenCalledWith("Northfield official site", 5);
  });

  it("matches brand names with spaces and punctuation", async () => {
    expect(await findBrandDomain("Red Wing Shoes", null, deps([r("https://www.redwingshoes.com/")]))).toEqual({ domain: "redwingshoes.com", found: true });
    expect(await findBrandDomain("A.P.C.", null, deps([r("https://www.apc.fr/")]))).toEqual({ domain: "apc.fr", found: true });
  });

  it("returns null rather than guess when no result looks like the brand", async () => {
    expect(await findBrandDomain("Northfield", null, deps([r("https://www.nordstrom.com/x")]))).toBeNull();
    expect(await findBrandDomain("", null, deps([]))).toBeNull();
  });
});

describe("researchProduct", () => {
  it("searches the brand's site first, ranks brand sources first, and reads the top brand page", async () => {
    const search = vi.fn(async (q: string) =>
      q.startsWith("site:northfield.com")
        ? [r("https://northfield.com/chukka", "Chukka | Northfield", "brand snippet")]
        : [r("https://www.reddit.com/r/x", "Chukka review", "review snippet"), r("https://www.nordstrom.com/chukka", "Chukka", "retail snippet"), r("https://northfield.com/chukka", "dup", "dup")]);
    const fetchText = vi.fn(async () => "Full-grain suede. Leather lining. Made in Portugal.");

    const sources = await researchProduct({ vendor: "Northfield", title: "Weekend Chukka" }, "northfield.com", { search, fetchText });

    expect(search).toHaveBeenCalledWith("site:northfield.com Weekend Chukka", 3);
    expect(search).toHaveBeenCalledWith("Northfield Weekend Chukka materials features review", 6);
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
    const sources = await researchProduct({ vendor: "Northfield", title: "Weekend Chukka" }, null, { search, fetchText: vi.fn(async () => null) });
    expect(search).toHaveBeenCalledTimes(1);
    expect(sources).toEqual([{ n: 1, kind: "retailer", url: "https://www.nordstrom.com/chukka", title: "Chukka", text: "retail snippet" }]);
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
