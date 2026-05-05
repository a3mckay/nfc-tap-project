import type { Pool } from "pg";

export interface EnrichmentInput {
  product_id: string;
  backstory: string | null;
  fit_notes: string | null;
  materials: string | null;
  reasons_to_buy: string[];
  ai_generated: boolean;
}

export interface Review {
  author: string;
  text: string;
  rating: number;
  source: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface Enrichment {
  id: string;
  product_id: string;
  backstory: string | null;
  fit_notes: string | null;
  materials: string | null;
  care_instructions: string | null;
  sustainability_notes: string | null;
  reasons_to_buy: string[];
  staff_quote: string | null;
  staff_name: string | null;
  staff_photo_url: string | null;
  video_url: string | null;
  extra_images: string[];
  reviews: Review[];
  awards: string[];
  faq: FaqItem[];
  internal_staff_notes: string | null;
  ai_generated: boolean;
  updated_at: Date;
}

export interface ProductForEnrichment {
  id: string;
  title: string;
  description_html: string | null;
  vendor: string | null;
  product_type: string | null;
}

export async function insertEnrichment(
  pool: Pool,
  input: EnrichmentInput,
): Promise<void> {
  await pool.query(
    `insert into enrichments
       (product_id, backstory, fit_notes, materials, reasons_to_buy, ai_generated)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (product_id)
     do update set
       backstory      = excluded.backstory,
       fit_notes      = excluded.fit_notes,
       materials      = excluded.materials,
       reasons_to_buy = excluded.reasons_to_buy,
       ai_generated   = excluded.ai_generated,
       updated_at     = now()`,
    [
      input.product_id,
      input.backstory,
      input.fit_notes,
      input.materials,
      JSON.stringify(input.reasons_to_buy),
      input.ai_generated,
    ],
  );
}

export async function getEnrichmentByProductId(
  pool: Pool,
  productId: string,
): Promise<Enrichment | null> {
  const { rows } = await pool.query<Enrichment>(
    `select * from enrichments where product_id = $1`,
    [productId],
  );
  return rows[0] ?? null;
}

export interface ProductWithEnrichmentStatus {
  id: string;
  title: string;
  vendor: string | null;
  product_type: string | null;
  status: string;
  enrichment_id: string | null;
  ai_generated: boolean | null;
  enrichment_updated_at: Date | null;
}

export interface FullEnrichmentInput {
  product_id: string;
  backstory: string | null;
  fit_notes: string | null;
  materials: string | null;
  care_instructions: string | null;
  sustainability_notes: string | null;
  reasons_to_buy: string[];
  staff_quote: string | null;
  staff_name: string | null;
  staff_photo_url: string | null;
  video_url: string | null;
  extra_images: string[];
  reviews: Review[];
  awards: string[];
  faq: FaqItem[];
  internal_staff_notes: string | null;
  ai_generated?: boolean;
}

export async function getProductsWithEnrichmentStatus(
  pool: Pool,
  storeId: string,
): Promise<ProductWithEnrichmentStatus[]> {
  const { rows } = await pool.query<ProductWithEnrichmentStatus>(
    `select p.id, p.title, p.vendor, p.product_type, p.status,
            e.id as enrichment_id, e.ai_generated,
            e.updated_at as enrichment_updated_at
       from products p
       left join enrichments e on e.product_id = p.id
      where p.store_id = $1
      order by p.title`,
    [storeId],
  );
  return rows;
}

export async function upsertFullEnrichment(
  pool: Pool,
  input: FullEnrichmentInput,
): Promise<void> {
  await pool.query(
    `insert into enrichments
       (product_id, backstory, fit_notes, materials, care_instructions,
        sustainability_notes, reasons_to_buy, staff_quote, staff_name,
        staff_photo_url, video_url, extra_images, reviews, awards, faq,
        internal_staff_notes, ai_generated)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     on conflict (product_id)
     do update set
       backstory             = excluded.backstory,
       fit_notes             = excluded.fit_notes,
       materials             = excluded.materials,
       care_instructions     = excluded.care_instructions,
       sustainability_notes  = excluded.sustainability_notes,
       reasons_to_buy        = excluded.reasons_to_buy,
       staff_quote           = excluded.staff_quote,
       staff_name            = excluded.staff_name,
       staff_photo_url       = excluded.staff_photo_url,
       video_url             = excluded.video_url,
       extra_images          = excluded.extra_images,
       reviews               = excluded.reviews,
       awards                = excluded.awards,
       faq                   = excluded.faq,
       internal_staff_notes  = excluded.internal_staff_notes,
       ai_generated          = excluded.ai_generated,
       updated_at            = now()`,
    [
      input.product_id,
      input.backstory,
      input.fit_notes,
      input.materials,
      input.care_instructions,
      input.sustainability_notes,
      JSON.stringify(input.reasons_to_buy),
      input.staff_quote,
      input.staff_name,
      input.staff_photo_url,
      input.video_url,
      JSON.stringify(input.extra_images),
      JSON.stringify(input.reviews),
      JSON.stringify(input.awards),
      JSON.stringify(input.faq),
      input.internal_staff_notes,
      input.ai_generated ?? false,
    ],
  );
}

export async function getProductsWithoutEnrichment(
  pool: Pool,
  storeId: string,
): Promise<ProductForEnrichment[]> {
  const { rows } = await pool.query<ProductForEnrichment>(
    `select p.id, p.title, p.description_html, p.vendor, p.product_type
       from products p
       left join enrichments e on e.product_id = p.id
      where p.store_id = $1
        and p.status = 'active'
        and e.id is null`,
    [storeId],
  );
  return rows;
}
