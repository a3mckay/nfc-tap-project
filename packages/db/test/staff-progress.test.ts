// PRD v4 §7 Step 13f: training progress. A product counts once it has an active
// tag (staff can only tap tagged products); a staff member has "reviewed" it
// once they've opened its training view.
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "crypto";
import { approveStaffEmail, revokeStaff } from "../src/store-staff.js";
import { saveProductTraining } from "../src/product-training.js";
import {
  recordStaffProductView, getStaffTrainingProgress, getStaffChecklist,
} from "../src/staff-progress.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

const seededStores: string[] = [];
async function seedStore(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into stores (shopify_shop_domain, shopify_access_token) values ($1, 'x') returning id`,
    [`progress-test-${randomUUID()}.myshopify.com`],
  );
  seededStores.push(rows[0]!.id);
  return rows[0]!.id;
}
let tagNo = 1;
async function product(storeId: string, title: string, tagStatus: "active" | "disabled" | null = "active"): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into products (store_id, title, status) values ($1, $2, 'active') returning id`,
    [storeId, title],
  );
  const id = rows[0]!.id;
  if (tagStatus) {
    await pool.query(
      `insert into tags (store_id, tag_uuid, status, tag_number, product_id) values ($1, $2, $3, $4, $5)`,
      [storeId, randomUUID(), tagStatus, tagNo++, id],
    );
  }
  return id;
}

let store: string;
let other: string;
let boot: string, tote: string, hat: string, untagged: string, disabled: string;
let sam: string, alex: string;
beforeEach(async () => {
  store = await seedStore();
  other = await seedStore();
  boot = await product(store, "Boot");
  tote = await product(store, "Tote");
  hat = await product(store, "Hat");
  untagged = await product(store, "Untagged", null);
  disabled = await product(store, "Disabled tag", "disabled");
  sam = (await approveStaffEmail(pool, store, `sam-${randomUUID()}@example.com`, "Sam")).id;
  alex = (await approveStaffEmail(pool, store, `alex-${randomUUID()}@example.com`, null)).id;
});

afterAll(async () => {
  await pool.query(`delete from stores where id = any($1::uuid[])`, [seededStores]);
  await pool.end();
});

describe("getStaffTrainingProgress", () => {
  it("counts distinct tagged products each active staff member has reviewed", async () => {
    await recordStaffProductView(pool, { staffId: sam, storeId: store, productId: boot });
    await recordStaffProductView(pool, { staffId: sam, storeId: store, productId: boot });
    await recordStaffProductView(pool, { staffId: sam, storeId: store, productId: tote });
    await recordStaffProductView(pool, { staffId: sam, storeId: store, productId: untagged });

    const p = await getStaffTrainingProgress(pool, store);
    expect(p.tagged_products).toBe(3);
    const bySam = p.staff.find((s) => s.staff_id === sam)!;
    expect(bySam).toMatchObject({ name: "Sam", reviewed: 2 });
    expect(bySam.last_viewed_at).toBeInstanceOf(Date);
    expect(p.staff.find((s) => s.staff_id === alex)).toMatchObject({ reviewed: 0, last_viewed_at: null });
  });

  it("lists tagged products nobody has reviewed yet", async () => {
    await recordStaffProductView(pool, { staffId: sam, storeId: store, productId: boot });
    const p = await getStaffTrainingProgress(pool, store);
    expect(p.unreviewed.map((x) => x.title).sort()).toEqual(["Hat", "Tote"]);
  });

  it("counts how many tagged products have training notes", async () => {
    const empty = {
      one_line_sell: null, who_its_for: null, who_its_not_for: null, fit_and_sizing: null, worth_the_price: [],
      closest_alternative: null, common_questions: [], companion_products: null, brand_context: null, stock_note: null,
    };
    await saveProductTraining(pool, store, boot, { ...empty, one_line_sell: "Sell" });
    await saveProductTraining(pool, store, tote, empty);
    await saveProductTraining(pool, store, untagged, { ...empty, one_line_sell: "Sell" });
    expect((await getStaffTrainingProgress(pool, store)).with_notes).toBe(1);
  });

  it("leaves out removed staff, and ignores views from another store", async () => {
    await revokeStaff(pool, alex, store);
    const otherProduct = await product(other, "Theirs");
    await recordStaffProductView(pool, { staffId: sam, storeId: other, productId: otherProduct });
    const p = await getStaffTrainingProgress(pool, store);
    expect(p.staff.map((s) => s.staff_id)).toEqual([sam]);
    expect(p.staff[0]!.reviewed).toBe(0);
  });
});

describe("getStaffChecklist", () => {
  it("lists the store's tagged products, marking the ones this staff member has reviewed", async () => {
    await recordStaffProductView(pool, { staffId: sam, storeId: store, productId: tote });
    await recordStaffProductView(pool, { staffId: alex, storeId: store, productId: hat });
    const list = await getStaffChecklist(pool, sam, store);
    expect(list.map((x) => [x.title, x.reviewed])).toEqual([["Boot", false], ["Hat", false], ["Tote", true]]);
  });
});
