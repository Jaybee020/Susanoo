import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { candles } from "../../db/schema.js";
import { TIMEFRAMES, type Timeframe } from "../../utils/constants.js";

export async function candleRoutes(server: FastifyInstance) {
  server.get("/api/pools/:poolId/candles", {
    schema: {
      tags: ["Candles"],
      summary: "Get OHLCV candlestick data for a pool",
      params: {
        type: "object",
        properties: { poolId: { type: "string", description: "Pool identifier (bytes32 hex)" } },
        required: ["poolId"],
      },
      querystring: {
        type: "object",
        properties: {
          timeframe: { type: "string", enum: ["1m", "5m", "15m", "1h", "4h", "1d"], default: "1h", description: "Candle timeframe" },
          from: { type: "string", format: "date-time", description: "Start time (ISO 8601)" },
          to: { type: "string", format: "date-time", description: "End time (ISO 8601)" },
        },
      },
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              time: { type: "string", format: "date-time" },
              open: { type: "string" },
              high: { type: "string" },
              low: { type: "string" },
              close: { type: "string" },
              volume0: { type: "string" },
              volume1: { type: "string" },
              tradeCount: { type: "integer" },
            },
          },
        },
        400: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const { poolId } = request.params as { poolId: string };
    const query = request.query as Record<string, string>;

    const timeframe = (query.timeframe || "1h") as Timeframe;
    if (!TIMEFRAMES.includes(timeframe)) {
      return reply.code(400).send({ error: `Invalid timeframe. Must be one of: ${TIMEFRAMES.join(", ")}` });
    }

    const conditions = [
      eq(candles.poolId, poolId),
      eq(candles.timeframe, timeframe),
    ];

    if (query.from) {
      conditions.push(gte(candles.openTime, new Date(query.from)));
    }
    if (query.to) {
      conditions.push(lte(candles.openTime, new Date(query.to)));
    }

    const db = getDb();
    const rows = await db
      .select()
      .from(candles)
      .where(and(...conditions))
      .orderBy(asc(candles.openTime))
      .limit(1000);

    reply.send(
      rows.map((r) => ({
        time: r.openTime.toISOString(),
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume0: r.volume0,
        volume1: r.volume1,
        tradeCount: r.tradeCount,
      }))
    );
  });
}
