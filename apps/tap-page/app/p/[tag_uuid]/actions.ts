"use server";

import {
  getPool, upsertReaction, getProductReactionCountsExcludingSession,
  updateCustomerTapReaction,
  type Reaction,
} from "@nfc/db";

export interface ReactionResult {
  loved: number;
  liked: number;
  passed: number;
}

export async function recordReactionAction(
  tagId: string,
  sessionId: string,
  reaction: Reaction,
  customerId: string | null,
): Promise<ReactionResult> {
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  await upsertReaction(pool, tagId, sessionId, reaction);

  // If the customer is identified, also persist the reaction on their customer_taps row.
  if (customerId) {
    try {
      await updateCustomerTapReaction(pool, customerId, tagId, reaction);
    } catch {
      // Non-fatal: still return counts even if this side-effect fails.
    }
  }

  return getProductReactionCountsExcludingSession(pool, tagId, sessionId);
}
