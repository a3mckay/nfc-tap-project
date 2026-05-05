import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { getPool } from "@nfc/db";
import { healthRoutes } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { billingRoutes } from "./routes/billing.js";

export async function buildServer() {
  const app = Fastify({ logger: true });
  const pool = getPool();

  await app.register(cookie, {
    secret: process.env["COOKIE_SECRET"] ?? "dev-secret-change-in-prod",
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { pool });
  await app.register(webhookRoutes, { pool });
  await app.register(billingRoutes);

  return app;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = await buildServer();
  await app.listen({ port: Number(process.env["PORT"] ?? 3002), host: "0.0.0.0" });
}
