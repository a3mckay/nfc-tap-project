import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { getPool, getStoreByDomain, updateStoreTier } from "@nfc/db";
import type { StoreTier } from "@nfc/db";

const PRICE_TO_TIER: Record<string, StoreTier> = {
  [process.env.STRIPE_PRICE_STARTER ?? ""]: "starter",
  [process.env.STRIPE_PRICE_PRO ?? ""]:     "pro",
  [process.env.STRIPE_PRICE_ENTERPRISE ?? ""]: "enterprise",
};

function tierFromPriceId(priceId: string | null | undefined): StoreTier {
  if (priceId && PRICE_TO_TIER[priceId]) return PRICE_TO_TIER[priceId]!;
  return "free";
}

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2025-02-24.acacia",
  });
  const pool = getPool({ connectionString: process.env.DATABASE_URL });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  app.post("/billing/webhook", {
    config: { rawBody: true },
  }, async (request, reply) => {
    const sig = request.headers["stripe-signature"];
    if (!sig || !webhookSecret) {
      return reply.code(400).send({ error: "Missing signature" });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        (request as unknown as { rawBody: Buffer }).rawBody,
        sig,
        webhookSecret,
      );
    } catch {
      return reply.code(400).send({ error: "Invalid signature" });
    }

    const sub = (event.data.object as Stripe.Subscription);

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created"
    ) {
      const priceId = sub.items.data[0]?.price.id ?? null;
      const tier = tierFromPriceId(priceId);
      const shopDomain = sub.metadata["shop_domain"];
      if (shopDomain) {
        const store = await getStoreByDomain(pool, shopDomain);
        if (store) {
          const expiresAt = sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null;
          await updateStoreTier(
            pool,
            store.id,
            tier,
            String(sub.customer),
            sub.id,
            expiresAt,
          );
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const shopDomain = sub.metadata["shop_domain"];
      if (shopDomain) {
        const store = await getStoreByDomain(pool, shopDomain);
        if (store) {
          await updateStoreTier(pool, store.id, "free", null, null, null);
        }
      }
    }

    return reply.send({ received: true });
  });
}
