import fp from "fastify-plugin";
import { createClient, type RedisClientType } from "redis";
import { env } from "../config/index.js";

declare module "fastify" {
  interface FastifyInstance {
    redis: RedisClientType | null;
  }
}

export const redisPlugin = fp(async (app) => {
  const client = createClient({
    url: env.redisUrl,
    socket: { reconnectStrategy: false },
  });

  client.on("error", (error) => app.log.warn({ error }, "Redis unavailable; continuing without cache"));
  app.decorate("redis", null);

  try {
    await client.connect();
    app.redis = client;
    app.log.info({ url: env.redisUrl.replace(/:\/\/.*@/, "://***@") }, "Redis connected");
  } catch (error) {
    app.log.warn({ error }, "Redis connection failed; continuing without cache");

    // A failed initial connection may already have closed the client.
    // Calling disconnect() in that state emits a ClientClosedError.
    if (client.isOpen) {
      await client.quit().catch(() => undefined);
    }
  }

  app.addHook("onClose", async () => {
    if (client.isOpen) await client.quit();
  });
});
