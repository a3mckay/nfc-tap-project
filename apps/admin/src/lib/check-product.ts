// PRD v4 §7 Step 15k: re-checks a product's notes for contradictions after
// they change (D49). Never blocks or fails a save.
import { getPool, getProductById, getEnrichmentByProductId, getProductTraining, getProductFacts, saveReviewFlags } from "@nfc/db";
import { runConsistencyCheck, findContradictions } from "./consistency-check.js";

type Pool = ReturnType<typeof getPool>;

export async function checkProductNotes(pool: Pool, storeId: string, productId: string): Promise<void> {
  if (!process.env.ANTHROPIC_API_KEY) return;
  try {
    const [product, enrichment, training, facts] = await Promise.all([
      getProductById(pool, productId),
      getEnrichmentByProductId(pool, productId),
      getProductTraining(pool, productId, storeId),
      getProductFacts(pool, storeId, productId),
    ]);
    if (!product || product.store_id !== storeId) return;
    await runConsistencyCheck({
      title: product.title,
      productType: product.product_type,
      customer: enrichment && {
        fit_notes: enrichment.fit_notes, materials: enrichment.materials, backstory: enrichment.backstory,
        care_instructions: enrichment.care_instructions, great_when: enrichment.great_when ?? [], faq: enrichment.faq ?? [],
      },
      training: training && {
        fit_and_sizing: training.fit_and_sizing, who_its_for: training.who_its_for, who_its_not_for: training.who_its_not_for,
        closest_alternative: training.closest_alternative, common_questions: training.common_questions ?? [],
      },
      facts: facts.map((f) => ({ topic: f.topic, fact: f.fact })),
    }, {
      model: findContradictions,
      save: (messages) => saveReviewFlags(pool, storeId, productId, "contradiction", messages),
    });
  } catch (err) {
    console.error("[consistency] couldn't check product:", err);
  }
}
