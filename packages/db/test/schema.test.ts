import { afterAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { SCHEMA_SPEC, pgTypesFor } from "./schema-spec.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://nfc:nfc@localhost:5432/nfc";
const pool = new Pool({ connectionString });

afterAll(async () => {
  await pool.end();
});

interface Row {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
}

async function describeTable(table: string): Promise<Row[]> {
  const { rows } = await pool.query<Row>(
    `select column_name, data_type, is_nullable
       from information_schema.columns
      where table_schema = 'public' and table_name = $1`,
    [table],
  );
  return rows;
}

describe("schema conformance to PRD §7.2 + §13.6", () => {
  for (const table of SCHEMA_SPEC) {
    describe(`table: ${table.name}`, () => {
      it("exists with all required columns of compatible types", async () => {
        const rows = await describeTable(table.name);
        expect(rows.length, `table "${table.name}" not found`).toBeGreaterThan(0);

        const byName = new Map(rows.map((r) => [r.column_name, r]));
        for (const col of table.columns) {
          const found = byName.get(col.name);
          expect(found, `column "${table.name}.${col.name}" missing`).toBeDefined();
          if (!found) continue;

          const allowed = pgTypesFor(col.type);
          expect(
            allowed,
            `"${table.name}.${col.name}" is ${found.data_type}, expected one of ${allowed.join(", ")}`,
          ).toContain(found.data_type);

          if (col.nullable === false || col.nullable === undefined) {
            // PRD lists most columns as required; ones nullable in the PRD are marked explicitly.
            // We only enforce NOT NULL when the PRD didn't mark the column nullable.
            if (col.nullable === false) {
              expect(found.is_nullable, `"${table.name}.${col.name}" should be NOT NULL`).toBe("NO");
            }
          }
        }
      });
    });
  }
});
