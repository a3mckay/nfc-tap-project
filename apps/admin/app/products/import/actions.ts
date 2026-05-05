"use server";

import { getPool, getStoreByDomain, insertManualProduct } from "@nfc/db";
import { revalidatePath } from "next/cache";

export interface CsvImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

// Imports products from a CSV. Expected columns (case-insensitive, in any order):
//   title (required), vendor, product_type, description
// Quoted values supported. Lines without a title are skipped.
export async function importProductsCsvAction(
  shop: string,
  csv: string,
): Promise<CsvImportResult> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { added: 0, skipped: 0, errors: ["Store not found"] };

  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { added: 0, skipped: 0, errors: ["CSV must have a header row and at least one data row"] };

  const headerLine = lines[0]!;
  const header = parseCsvLine(headerLine).map((h) => h.toLowerCase().trim());
  const titleIdx  = header.indexOf("title");
  const vendorIdx = header.indexOf("vendor");
  const typeIdx   = header.indexOf("product_type");

  if (titleIdx === -1) {
    return { added: 0, skipped: 0, errors: ["CSV must have a 'title' column"] };
  }

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!);
    const title = cells[titleIdx]?.trim();
    if (!title) { skipped++; continue; }
    try {
      await insertManualProduct(
        pool, store.id, title,
        vendorIdx >= 0 ? (cells[vendorIdx]?.trim() ?? null) : null,
        typeIdx   >= 0 ? (cells[typeIdx]?.trim() ?? null)   : null,
      );
      added++;
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "failed"}`);
    }
  }

  revalidatePath("/products");
  return { added, skipped, errors };
}

// Minimal CSV parser supporting quoted fields with embedded commas + escaped quotes.
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cur += ch; }
    } else {
      if (ch === ',') { out.push(cur); cur = ""; }
      else if (ch === '"' && cur === "") { inQuotes = true; }
      else { cur += ch; }
    }
  }
  out.push(cur);
  return out;
}
