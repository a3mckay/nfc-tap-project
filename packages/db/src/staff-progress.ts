import type { Pool } from "pg";

// PRD v4 §7 Step 13f: staff training progress. Only products with an active tag
// count (staff can only tap those); a staff member has reviewed a product once
// they've opened its training view.

const TAGGED_PRODUCTS = `
  select p.id, p.title
    from products p
   where p.store_id = $1
     and p.deleted_at is null
     and exists (select 1 from tags t where t.product_id = p.id and t.status = 'active')`;

export async function recordStaffProductView(
  pool: Pool,
  v: { staffId: string; storeId: string; productId: string },
): Promise<void> {
  await pool.query(
    `insert into staff_product_views (staff_id, store_id, product_id) values ($1, $2, $3)`,
    [v.staffId, v.storeId, v.productId],
  );
}

export interface StaffProgressRow {
  staff_id: string;
  email: string;
  name: string | null;
  reviewed: number;
  last_viewed_at: Date | null;
}

export interface StoreTrainingProgress {
  tagged_products: number;
  with_notes: number;
  staff: StaffProgressRow[];
  unreviewed: { id: string; title: string }[];
}

export async function getStaffTrainingProgress(pool: Pool, storeId: string): Promise<StoreTrainingProgress> {
  const [counts, staff, unreviewed] = await Promise.all([
    pool.query<{ tagged_products: number; with_notes: number }>(
      `with tp as (${TAGGED_PRODUCTS})
       select (select count(*) from tp)::int as tagged_products,
              (select count(*) from tp join product_training pt on pt.product_id = tp.id
                where coalesce(pt.one_line_sell, pt.who_its_for, pt.who_its_not_for, pt.fit_and_sizing,
                               pt.closest_alternative, pt.companion_products, pt.brand_context, pt.stock_note) is not null
                   or cardinality(pt.worth_the_price) > 0
                   or jsonb_array_length(pt.common_questions) > 0)::int as with_notes`,
      [storeId],
    ),
    pool.query<StaffProgressRow>(
      `with tp as (${TAGGED_PRODUCTS})
       select s.id as staff_id, s.email, s.name,
              (select count(distinct v.product_id) from staff_product_views v
                 join tp on tp.id = v.product_id
                where v.staff_id = s.id and v.store_id = s.store_id)::int as reviewed,
              (select max(v.viewed_at) from staff_product_views v
                where v.staff_id = s.id and v.store_id = s.store_id) as last_viewed_at
         from store_staff s
        where s.store_id = $1 and s.revoked_at is null
        order by s.created_at, s.email`,
      [storeId],
    ),
    pool.query<{ id: string; title: string }>(
      `with tp as (${TAGGED_PRODUCTS})
       select tp.id, tp.title from tp
        where not exists (
          select 1 from staff_product_views v
            join store_staff s on s.id = v.staff_id and s.revoked_at is null
           where v.product_id = tp.id and v.store_id = $1)
        order by tp.title`,
      [storeId],
    ),
  ]);
  return { ...counts.rows[0]!, staff: staff.rows, unreviewed: unreviewed.rows };
}

// The store's tagged products for one staff member's home page checklist.
export async function getStaffChecklist(
  pool: Pool,
  staffId: string,
  storeId: string,
): Promise<{ id: string; title: string; reviewed: boolean }[]> {
  const { rows } = await pool.query<{ id: string; title: string; reviewed: boolean }>(
    `with tp as (${TAGGED_PRODUCTS})
     select tp.id, tp.title,
            exists (select 1 from staff_product_views v
                     where v.staff_id = $2 and v.store_id = $1 and v.product_id = tp.id) as reviewed
       from tp
      order by tp.title`,
    [storeId, staffId],
  );
  return rows;
}
