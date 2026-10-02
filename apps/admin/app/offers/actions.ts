"use server";

import {
  getPool, createStoreOffer, updateStoreOffer, deleteStoreOffer,
  type OfferTrigger,
} from "@nfc/db";
import { getActionStore } from "@/current-store.js";
import { revalidatePath } from "next/cache";

export interface OfferFormInput {
  shop: string;
  id?: string;                    // present = update, absent = create
  product_id: string | null;
  code: string;
  message: string;
  trigger_kind: OfferTrigger;
  trigger_n: number | null;
  enabled: boolean;
  expires_at: string | null;       // ISO string from a date input
}

export async function saveOfferAction(input: OfferFormInput): Promise<{ error?: string; id?: string }> {
  if (!input.code.trim()) return { error: "Discount code is required" };
  if (input.trigger_kind === "after_n_taps") {
    const n = input.trigger_n ?? 0;
    if (!Number.isInteger(n) || n < 2 || n > 1000) {
      return { error: "Tap threshold must be a whole number between 2 and 1000" };
    }
  }

  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, input.shop, "marketing");
  if (!store) return { error: "Store not found" };

  const data = {
    store_id: store.id,
    product_id: input.product_id,
    code: input.code.trim().toUpperCase(),
    message: input.message.trim() || "You found our exclusive offer.",
    trigger_kind: input.trigger_kind,
    trigger_n: input.trigger_kind === "after_n_taps" ? (input.trigger_n ?? 2) : null,
    enabled: input.enabled,
    expires_at: input.expires_at ? new Date(input.expires_at) : null,
  };

  if (input.id) {
    await updateStoreOffer(pool, input.id, data);
    revalidatePath("/offers");
    return { id: input.id };
  } else {
    const created = await createStoreOffer(pool, data);
    revalidatePath("/offers");
    return { id: created.id };
  }
}

export async function deleteOfferAction(shop: string, id: string): Promise<void> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getActionStore(pool, shop, "marketing");
  if (!store) return;
  await deleteStoreOffer(pool, id, store.id);
  revalidatePath("/offers");
}
