import type { FastifyInstance } from "fastify";
import { verifyWebhookHmac } from "../shopify/webhooks.js";
import {
  upsertProduct,
  deleteProductByShopifyId,
  updateInventoryByShopifyId,
  getStoreByDomain,
} from "@nfc/db";
import { mapShopifyProduct } from "../shopify/catalog.js";
import type { Pool } from "pg";

export async function webhookRoutes(
  app: FastifyInstance,
  { pool }: { pool: Pool },
): Promise<void> {
  const apiSecret = process.env["SHOPIFY_API_SECRET"] ?? "";

  // Fastify parses the body before we can access the raw bytes needed for HMAC.
  // We add a content-type parser that captures the raw string.
  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_req, body, done) => done(null, body),
  );

  function guardHmac(req: { headers: Record<string, string | string[] | undefined>; body: unknown }): boolean {
    const sig = req.headers["x-shopify-hmac-sha256"] as string | undefined;
    if (!sig || typeof req.body !== "string") return false;
    return verifyWebhookHmac(req.body, sig, apiSecret);
  }

  app.post<{ Body: string }>("/webhooks/products-update", async (req, reply) => {
    if (!guardHmac(req)) return reply.status(401).send();
    const shop = req.headers["x-shopify-shop-domain"] as string | undefined;
    if (!shop) return reply.status(400).send();

    const payload = JSON.parse(req.body) as Record<string, unknown>;
    const store = await getStoreByDomain(pool, shop);
    if (!store) return reply.status(200).send(); // unknown store — ack and ignore

    await upsertProduct(pool, mapShopifyProduct(payload as never, store.id));
    return reply.status(200).send();
  });

  app.post<{ Body: string }>("/webhooks/products-delete", async (req, reply) => {
    if (!guardHmac(req)) return reply.status(401).send();
    const shop = req.headers["x-shopify-shop-domain"] as string | undefined;
    if (!shop) return reply.status(400).send();

    const payload = JSON.parse(req.body) as { id: number | string };
    const store = await getStoreByDomain(pool, shop);
    if (!store) return reply.status(200).send();

    await deleteProductByShopifyId(pool, store.id, String(payload.id));
    return reply.status(200).send();
  });

  app.post<{ Body: string }>("/webhooks/inventory-levels-update", async (req, reply) => {
    if (!guardHmac(req)) return reply.status(401).send();
    const shop = req.headers["x-shopify-shop-domain"] as string | undefined;
    if (!shop) return reply.status(400).send();

    // inventory_levels/update gives us location-level quantities, not a product-level total.
    // For V1 we store a simple total on the product row; Step 8b will refine this.
    const payload = JSON.parse(req.body) as {
      inventory_item_id: number;
      available: number;
    };
    const store = await getStoreByDomain(pool, shop);
    if (!store) return reply.status(200).send();

    // We don't have a direct inventory_item_id → product mapping yet (that's Shopify variant data).
    // Log and ack — product inventory is kept current via products/update webhook.
    void payload; // used in future step
    return reply.status(200).send();
  });
}
