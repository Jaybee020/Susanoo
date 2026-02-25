import type { FastifyInstance } from "fastify";
import { adminRoutes } from "./routes/admin.js";
import { poolRoutes } from "./routes/pools.js";
import { candleRoutes } from "./routes/candles.js";
import { tradeRoutes } from "./routes/trades.js";
import { traderRoutes } from "./routes/traders.js";
import { statsRoutes } from "./routes/stats.js";

export async function registerRoutes(server: FastifyInstance) {
  await server.register(adminRoutes);
  await server.register(poolRoutes);
  await server.register(candleRoutes);
  await server.register(tradeRoutes);
  await server.register(traderRoutes);
  await server.register(statsRoutes);
}
