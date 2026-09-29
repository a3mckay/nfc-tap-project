import type { Pool } from "pg";

// PRD v4 §7 Step 13e: staff training notes for one product. All fields optional.
export interface TrainingQuestion {
  question: string;
  answer: string;
}

export interface ProductTrainingInput {
  one_line_sell: string | null;
  who_its_for: string | null;
  who_its_not_for: string | null;
  fit_and_sizing: string | null;
  worth_the_price: string[];
  closest_alternative: string | null;
  common_questions: TrainingQuestion[];
  companion_products: string | null;
  brand_context: string | null;
  stock_note: string | null;
}

export interface ProductTraining extends ProductTrainingInput {
  product_id: string;
  store_id: string;
  stock_note_updated_at: Date | null;
  updated_at: Date;
}

export async function getProductTraining(
  pool: Pool,
  productId: string,
  storeId: string,
): Promise<ProductTraining | null> {
  const { rows } = await pool.query<ProductTraining>(
    `select * from product_training where product_id = $1 and store_id = $2`,
    [productId, storeId],
  );
  return rows[0] ?? null;
}

// Saves the notes if the product belongs to the store; returns false otherwise.
// stock_note_updated_at moves only when the stock note itself changes.
export async function saveProductTraining(
  pool: Pool,
  storeId: string,
  productId: string,
  t: ProductTrainingInput,
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `insert into product_training (
        product_id, store_id, one_line_sell, who_its_for, who_its_not_for, fit_and_sizing,
        worth_the_price, closest_alternative, common_questions, companion_products,
        brand_context, stock_note, stock_note_updated_at, updated_at)
     select p.id, p.store_id, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12,
            case when $12::text is null then null else now() end, now()
       from products p
      where p.id = $2 and p.store_id = $1
     on conflict (product_id) do update set
        one_line_sell        = excluded.one_line_sell,
        who_its_for          = excluded.who_its_for,
        who_its_not_for      = excluded.who_its_not_for,
        fit_and_sizing       = excluded.fit_and_sizing,
        worth_the_price      = excluded.worth_the_price,
        closest_alternative  = excluded.closest_alternative,
        common_questions     = excluded.common_questions,
        companion_products   = excluded.companion_products,
        brand_context        = excluded.brand_context,
        stock_note           = excluded.stock_note,
        stock_note_updated_at = case
          when product_training.stock_note is not distinct from excluded.stock_note
            then product_training.stock_note_updated_at
          else excluded.stock_note_updated_at
        end,
        updated_at           = now()`,
    [
      storeId, productId, t.one_line_sell, t.who_its_for, t.who_its_not_for, t.fit_and_sizing,
      t.worth_the_price, t.closest_alternative, JSON.stringify(t.common_questions),
      t.companion_products, t.brand_context, t.stock_note,
    ],
  );
  return (rowCount ?? 0) > 0;
}
