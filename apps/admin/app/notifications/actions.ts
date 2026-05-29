"use server";

import {
  getPool, getStoreByDomain,
  getProductNotifiableRecipients, logNotification,
  type NotificationEventType,
} from "@nfc/db";
import { sendBatch } from "@/lib/notify.js";

export async function sendNotificationAction(
  shop: string,
  productId: string,
  eventType: NotificationEventType,
  message: string,
): Promise<{ sent: number; failed: number; error?: string }> {
  if (!message.trim()) return { sent: 0, failed: 0, error: "Message is required." };
  if (message.trim().length > 480) return { sent: 0, failed: 0, error: "Message too long (max 480 characters)." };

  const pool  = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { sent: 0, failed: 0, error: "Store not found." };

  const recipients = await getProductNotifiableRecipients(pool, store.id, productId, eventType);
  if (recipients.length === 0) return { sent: 0, failed: 0, error: "No subscribers for this product and event type." };

  const { sent, failed, results } = await sendBatch(recipients, message);

  // Log each send (fire-and-forget failures on individual logs are acceptable)
  await Promise.allSettled(
    recipients.map((recv, i) => {
      const r = results[i];
      return logNotification(pool, {
        customerId: recv.customer_id ?? null,
        storeId:    store.id,
        productId,
        eventType,
        channel:    r?.channel ?? "email",
        recipient:  r?.recipient ?? (recv.email ?? recv.phone ?? "unknown"),
        message,
        twilioSid:  r?.sid ?? null,
        status:     r?.success ? "sent" : "failed",
      });
    }),
  );

  return { sent, failed };
}

export async function getRecipientCountAction(
  shop: string,
  productId: string,
  eventType: NotificationEventType,
): Promise<{ count: number; error?: string }> {
  const pool  = getPool({ connectionString: process.env.DATABASE_URL });
  const store = await getStoreByDomain(pool, shop);
  if (!store) return { count: 0, error: "Store not found." };
  const recipients = await getProductNotifiableRecipients(pool, store.id, productId, eventType);
  return { count: recipients.length };
}
