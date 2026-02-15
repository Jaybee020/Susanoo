import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { getConfig } from "./config.js";

export async function buildServer() {
  const config = getConfig();

  const server = Fastify({
    logger: {
      level: "info",
      transport: {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
      },
    },
  });

  await server.register(cors, { origin: true });
  await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
  await server.register(websocket);

  await server.register(swagger, {
    openapi: {
      info: {
        title: "Susanoo Relayer API",
        description: "REST API for the Susanoo DEX relayer — pool data, trades, OHLCV candles, and admin management.",
        version: "0.1.0",
      },
      tags: [
        { name: "Pools", description: "Pool listing and details" },
        { name: "Trades", description: "Swap history" },
        { name: "Candles", description: "OHLCV candlestick data" },
        { name: "Stats", description: "24h pool statistics" },
        { name: "Traders", description: "Per-address trade history" },
        { name: "Admin", description: "Pool management (requires API key)" },
      ],
    },
  });

  await server.register(swaggerUi, { routePrefix: "/docs" });

  server.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  return server;
}
