"use server";

import {
  getPool, upsertReaction, getProductReactionCountsExcludingSession,
  updateCustomerTapReaction, upsertNotificationSubscription,
  type Reaction, type NotificationChannel,
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

// ── Notification opt-in ──────────────────────────────────────────────────────

interface SubscribeOpts {
  storeId: string;
  productId: string;
  sessionId: string;
  customerId: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

export async function subscribeToNotificationsAction(
  opts: SubscribeOpts,
): Promise<{ error?: string }> {
  const { storeId, productId, sessionId, customerId, contactPhone, contactEmail } = opts;
  if (!contactPhone && !contactEmail) {
    return { error: "No contact information provided." };
  }

  // Determine best channel
  const channel: NotificationChannel = contactPhone ? "sms" : "email";

  try {
    const pool = getPool({ connectionString: process.env.DATABASE_URL });
    await upsertNotificationSubscription(pool, {
      storeId,
      productId,
      customerId,
      sessionId,
      contactPhone,
      contactEmail,
      channel,
    });
    return {};
  } catch (err) {
    console.error("subscribeToNotificationsAction error:", err);
    return { error: "Something went wrong. Please try again." };
  }
}
