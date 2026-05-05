import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildAuthUrl, exchangeCode, verifyCallbackHmac, SCOPES } from "../shopify/oauth.js";
import { registerWebhooks } from "../shopify/webhooks.js";
import { buildProductFetcher, mapShopifyProduct, paginateProducts } from "../shopify/catalog.js";
import { upsertStore, upsertProduct, updateThemeSettings } from "@nfc/db";
import { fetchThemeSettings } from "../shopify/theme.js";
import type { Pool } from "pg";

const OAUTH_STATE_COOKIE = "shopify_oauth_state";

export async function authRoutes(
  app: FastifyInstance,
  { pool }: { pool: Pool },
): Promise<void> {
  const apiKey = process.env["SHOPIFY_API_KEY"] ?? "";
  const apiSecret = process.env["SHOPIFY_API_SECRET"] ?? "";
  const appUrl = process.env["SHOPIFY_APP_URL"] ?? "";
  const redirectUri = `${appUrl}/auth/callback`;

  app.get<{ Querystring: { shop?: string } }>("/auth/shopify", async (req, reply) => {
    const shop = req.query.shop;
    if (!shop) {
      return reply.status(400).send({ error: "Missing shop param" });
    }

    const state = randomBytes(16).toString("hex");
    reply.setCookie(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 300, // 5 minutes — long enough to complete OAuth
    });

    return reply.redirect(buildAuthUrl({ shop, apiKey, redirectUri, scopes: [...SCOPES], state }));
  });

  app.get<{ Querystring: Record<string, string> }>(
    "/auth/callback",
    async (req, reply) => {
      const params = req.query;
      const cookieState = req.cookies[OAUTH_STATE_COOKIE];

      if (!cookieState || cookieState !== params["state"]) {
        return reply.status(403).send({ error: "State mismatch — possible CSRF" });
      }
      if (!verifyCallbackHmac(params, apiSecret)) {
        return reply.status(403).send({ error: "Invalid HMAC" });
      }

      const shop = params["shop"];
      const code = params["code"];
      if (!shop || !code) {
        return reply.status(400).send({ error: "Missing shop or code" });
      }

      const accessToken = await exchangeCode(shop, code, apiKey, apiSecret, redirectUri);
      const store = await upsertStore(pool, shop, accessToken);

      // All post-connect jobs run in the background — OAuth response is immediate.
      void runThemeFetch(shop, accessToken, store.id, pool);
      void runCatalogImport(shop, accessToken, store.id, pool);
      void registerWebhooks(shop, accessToken, appUrl);

      return reply.redirect(`${appUrl}/admin`);
    },
  );
}

async function runThemeFetch(
  shop: string,
  accessToken: string,
  storeId: string,
  pool: Pool,
): Promise<void> {
  try {
    const theme = await fetchThemeSettings(shop, accessToken);
    await updateThemeSettings(pool, storeId, theme as unknown as Record<string, unknown>);
  } catch (err) {
    console.error("[theme-fetch] failed:", err);
  }
}

async function runCatalogImport(
  shop: string,
  accessToken: string,
  storeId: string,
  pool: Pool,
): Promise<void> {
  try {
    const fetcher = buildProductFetcher(shop, accessToken);
    const nodes = await paginateProducts(fetcher);
    for (const node of nodes) {
      await upsertProduct(pool, mapShopifyProduct(node, storeId));
    }
  } catch (err) {
    // Log and continue — import failures should not crash the server.
    // Step 5 will replace this with a retryable queue job.
    console.error("[catalog-import] failed:", err);
  }
}
