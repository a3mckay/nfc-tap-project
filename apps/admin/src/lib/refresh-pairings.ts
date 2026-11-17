// "Goes great with" (founder, 2026-11-16): picks a product's pairings from its
// fact sheet and the store's catalog, after Generate or "Find again". Never
// blocks or fails a save; on a failure the old pairings stay.
import { getProductById, getProductFacts, getSpecSetup, getPairingCatalog, replacePairings, specCategoryFor, type getPool } from "@nfc/db";
import { suggestPairings, askForPairings } from "@/lib/pairings.js";

type Pool = ReturnType<typeof getPool>;

export async function refreshPairings(pool: Pool, storeId: string, productId: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;
  try {
    const [product, facts, setup, catalog] = await Promise.all([
      getProductById(pool, productId),
      getProductFacts(pool, storeId, productId),
      getSpecSetup(pool, storeId, productId),
      getPairingCatalog(pool, storeId, productId),
    ]);
    if (!product || product.store_id !== storeId) return;
    const pairings = await suggestPairings({
      product: { id: product.id, title: product.title, category: specCategoryFor(setup ?? { productType: product.product_type, title: product.title }) },
      facts: facts.map((f) => ({ topic: f.topic, fact: f.fact, source_url: f.source_url, source_kind: f.source_kind })),
      catalog,
    }, askForPairings);
    await replacePairings(pool, storeId, productId, pairings);
  } catch (err) {
    console.error("[pairings] couldn't pick pairings:", err);
  }
}
