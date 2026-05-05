import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyWebhookHmac(
  rawBody: string,
  shopifyHmacHeader: string,
  apiSecret: string,
): boolean {
  const expected = createHmac("sha256", apiSecret)
    .update(rawBody, "utf8")
    .digest("base64");

  try {
    return timingSafeEqual(
      Buffer.from(shopifyHmacHeader),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export const WEBHOOK_TOPICS = [
  "products/update",
  "products/delete",
  "inventory_levels/update",
] as const;

export type WebhookTopic = (typeof WEBHOOK_TOPICS)[number];

export async function registerWebhooks(
  shop: string,
  accessToken: string,
  callbackBaseUrl: string,
): Promise<void> {
  for (const topic of WEBHOOK_TOPICS) {
    const path = topic.replace("/", "-"); // e.g. products-update
    const res = await fetch(
      `https://${shop}/admin/api/2024-10/webhooks.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          webhook: {
            topic,
            address: `${callbackBaseUrl}/webhooks/${path}`,
            format: "json",
          },
        }),
      },
    );

    // 422 means webhook already exists — that's fine (idempotent).
    if (!res.ok && res.status !== 422) {
      throw new Error(
        `Failed to register webhook ${topic}: ${res.status} ${await res.text()}`,
      );
    }
  }
}
