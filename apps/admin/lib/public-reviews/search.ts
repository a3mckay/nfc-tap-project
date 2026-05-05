// Brave Search API wrapper. Free tier: 2,000 queries/month, no credit card.
// Get a key at: https://brave.com/search/api/
//
// We do server-side calls only — never expose the key client-side.

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
}

interface BraveResponse {
  web?: {
    results?: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
    }>;
  };
}

export async function braveSearch(query: string, count = 10): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.warn("[brave-search] BRAVE_SEARCH_API_KEY not set; returning empty results");
    return [];
  }

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`;
  const res = await fetch(url, {
    headers: {
      "X-Subscription-Token": apiKey,
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`Brave Search ${res.status}: ${await res.text()}`);
  }

  const data = await res.json() as BraveResponse;
  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
    age: r.age,
  }));
}
