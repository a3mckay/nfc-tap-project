"use server";

// PRD v4 §7 Step 15b: corrections to the research fact sheet and the brand's
// website. Edited and added facts survive regeneration (docs/PRD-ai-assistant.md §6.2).
import { getPool, getProductById, updateFact, addOwnerFact, deleteFact, setBrandWebsite, ALL_FACT_TOPICS } from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";
import { domainOf } from "@/lib/product-research.js";

type Result = { error?: string };

const pool = () => getPool({ connectionString: process.env.DATABASE_URL });
const store = (shop: string) => getActionStore(pool(), shop, "content");
const done = (productId: string): Result => { revalidatePath(`/enrichment/${productId}`); return {}; };

function checkFact(topic: string, fact: string): string | null {
  if (!ALL_FACT_TOPICS.includes(topic)) return "Unknown topic";
  if (!fact.trim()) return "Write the fact first";
  return null;
}

export async function updateFactAction(shop: string, productId: string, factId: string, topic: string, fact: string): Promise<Result> {
  const s = await store(shop);
  if (!s) return { error: "Not allowed" };
  const invalid = checkFact(topic, fact);
  if (invalid) return { error: invalid };
  if (!(await updateFact(pool(), s.id, factId, { topic, fact: fact.trim() }))) return { error: "Fact not found" };
  return done(productId);
}

export async function addFactAction(shop: string, productId: string, topic: string, fact: string): Promise<Result> {
  const s = await store(shop);
  if (!s) return { error: "Not allowed" };
  const invalid = checkFact(topic, fact);
  if (invalid) return { error: invalid };
  if (!(await addOwnerFact(pool(), s.id, productId, { topic, fact: fact.trim() }))) return { error: "Product not found" };
  return done(productId);
}

export async function deleteFactAction(shop: string, productId: string, factId: string): Promise<Result> {
  const s = await store(shop);
  if (!s) return { error: "Not allowed" };
  if (!(await deleteFact(pool(), s.id, factId))) return { error: "Fact not found" };
  return done(productId);
}

// Sets the product's brand website for this store, marked as confirmed.
export async function setBrandWebsiteAction(shop: string, productId: string, website: string): Promise<Result> {
  const s = await store(shop);
  if (!s) return { error: "Not allowed" };
  const product = await getProductById(pool(), productId);
  if (!product || product.store_id !== s.id) return { error: "Product not found" };
  if (!product.vendor) return { error: "This product has no brand" };

  const raw = website.trim();
  const domain = /^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(raw.replace(/^https?:\/\//i, ""))
    ? domainOf(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    : null;
  if (!domain) return { error: "Enter a website address, like brandname.com" };

  await setBrandWebsite(pool(), s.id, product.vendor, `https://${domain}`, true);
  return done(productId);
}
