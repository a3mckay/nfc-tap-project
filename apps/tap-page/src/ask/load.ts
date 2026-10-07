// PRD v4 §7 Step 15c: gathers what the assistant may answer from for a live
// tag's product (docs/PRD-ai-assistant.md §6). internal_staff_notes are never
// loaded for customers.
import {
  getTagByUuid, getProductById, getStoreById, getEnrichmentByProductId, getProductTraining,
  getProductFacts, getActiveAnswers, getApprovedReviewsByProduct, getStorePolicies, getRecentQuestions,
  getProductSpecs, specCategoryFor, specFieldsFor,
} from "@nfc/db";
import { resolveTagState } from "@/tag-state.js";
import type { LoadedContext } from "./handle.js";

type Pool = Parameters<typeof getTagByUuid>[0];

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

function variantLabels(variants: unknown): { options: string[]; price: string | null } {
  const list = Array.isArray(variants) ? (variants as Array<{ title?: unknown; price?: unknown }>) : [];
  const options = list
    .map((v) => (typeof v.title === "string" ? v.title : null))
    .filter((t): t is string => !!t && t !== "Default Title");
  const price = typeof list[0]?.price === "string" ? list[0].price : null;
  return { options: [...new Set(options)].slice(0, 40), price };
}

export async function loadAnswerContext(pool: Pool, tagUuid: string, audience: "customer" | "staff" = "customer"): Promise<LoadedContext | null> {
  const state = resolveTagState(await getTagByUuid(pool, tagUuid));
  if (state.kind !== "active") return null;
  return loadProductContext(pool, state.storeId, state.productId, state.tagId, audience);
}

// The same context for a product, without a tag (used by the quality test set).
export async function loadProductContext(
  pool: Pool,
  storeId: string,
  productId: string,
  tagId: string,
  audience: "customer" | "staff" = "customer",
): Promise<LoadedContext | null> {

  const [product, store, enrichment, training, facts, answers, reviews, policies, specValues] = await Promise.all([
    getProductById(pool, productId),
    getStoreById(pool, storeId),
    getEnrichmentByProductId(pool, productId),
    getProductTraining(pool, productId, storeId),
    getProductFacts(pool, storeId, productId),
    getActiveAnswers(pool, storeId, productId),
    getApprovedReviewsByProduct(pool, productId),
    getStorePolicies(pool, storeId),
    getProductSpecs(pool, storeId, productId),
  ]);
  if (!product || !store || product.store_id !== storeId) return null;

  const { options, price } = variantLabels(product.variants);
  // Spec values, labelled by the product's category template (Step 15l, D51).
  const category = specCategoryFor({
    productType: product.product_type, title: product.title,
    override: product.spec_category, storeIndustry: store.industry,
  });
  const fields = specFieldsFor(category);
  const valueByKey = new Map(specValues.map((v) => [v.key, v.value]));
  const specs = fields.filter((f) => valueByKey.has(f.key)).map((f) => ({ label: f.label, value: valueByKey.get(f.key)! }));
  const description = [
    product.description_html ? stripHtml(product.description_html).slice(0, 1500) : null,
    price ? `Price: $${price}` : null,
  ].filter(Boolean).join(" ") || null;

  return {
    storeId,
    productId,
    tagId,
    context: {
      storeName: store.name ?? store.shopify_shop_domain,
      product: { title: product.title, vendor: product.vendor, productType: product.product_type, description, variants: options, specs },
      answers: answers.map((a) => ({ question: a.question, answer: a.answer, scope: a.product_id ? "product" : "store" })),
      enrichment: enrichment && {
        greatWhen: enrichment.great_when ?? [],
        reasonsToBuy: enrichment.reasons_to_buy ?? [],
        backstory: enrichment.backstory,
        materials: enrichment.materials,
        fitNotes: enrichment.fit_notes,
        care: enrichment.care_instructions,
        sustainability: enrichment.sustainability_notes,
        faq: enrichment.faq ?? [],
        aiDraft: enrichment.ai_generated === true,
      },
      training: training && {
        whoItsFor: training.who_its_for,
        whoItsNotFor: training.who_its_not_for,
        fitAndSizing: training.fit_and_sizing,
        closestAlternative: training.closest_alternative,
        worthThePrice: training.worth_the_price ?? [],
        companionProducts: training.companion_products,
        commonQuestions: training.common_questions ?? [],
      },
      facts: facts.map((f) => ({ topic: f.topic, fact: f.fact, sourceKind: f.source_kind })),
      // Reviews are testimonials, which the Cannabis Act doesn't allow for cannabis.
      reviews: category === "cannabis" ? [] : [
        ...reviews.map((r) => ({ rating: r.rating === null ? null : Number(r.rating), text: r.body })),
        ...(enrichment?.reviews ?? []).map((r) => ({ rating: r.rating, text: r.text })),
      ].filter((r) => r.text),
      category,
      policies: policies.map((p) => ({ label: p.label, text: p.text })),
      ...(audience === "staff" ? {
        staff: {
          internalNotes: enrichment?.internal_staff_notes ?? null,
          recentQuestions: (await getRecentQuestions(pool, storeId, productId, 20)).map((q) => ({ question: q.question_text, answer: q.answer_text })),
        },
      } : {}),
    },
  };
}
