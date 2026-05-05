import type { Pool } from "pg";

export type AccessorType = "brand" | "internal" | "report";

export async function insertAuditLog(
  pool: Pool,
  accessorType: AccessorType,
  queryDescription: string,
  accessorId?: string,
): Promise<void> {
  await pool.query(
    `insert into data_access_audit (accessor_type, accessor_id, query_description)
     values ($1, $2, $3)`,
    [accessorType, accessorId ?? null, queryDescription],
  );
}

// Call this before any cross-store query. Throws if the store has not opted in.
export async function requireConsent(pool: Pool, storeId: string): Promise<void> {
  const { rows } = await pool.query<{ data_sharing_opted_in: boolean }>(
    `select data_sharing_opted_in from stores where id = $1`,
    [storeId],
  );
  if (!rows[0]?.data_sharing_opted_in) {
    throw new Error(`Store ${storeId} has not opted in to data sharing`);
  }
}

// Returns only the store IDs that have consented — use this to filter cross-store queries.
export async function getConsentedStoreIds(pool: Pool): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `select id from stores where data_sharing_opted_in = true`,
  );
  return rows.map((r) => r.id);
}
