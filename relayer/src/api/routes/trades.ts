import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { swaps } from "../../db/schema.js";
import { parsePagination } from "../middleware/pagination.js";

export async function tradeRoutes(server: FastifyInstance) {
  server.get("/api/pools/:poolId/trades", {
    schema: {
      tags: ["Trades"],
      summary: "Get swap history for a pool",
      params: {
        type: "object",
        properties: { poolId: { type: "string", description: "Pool identifier (bytes32 hex)" } },
        required: ["poolId"],
      },
      querystring: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 500, default: 50, description: "Number of results" },
          offset: { type: "integer", minimum: 0, default: 0, description: "Offset for pagination" },
        },
      },
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "integer" },
              sender: { type: "string" },
              amount0: { type: "string" },
              amount1: { type: "string" },
              price: { type: "string", nullable: true },
              tick: { type: "integer", nullable: true },
              txHash: { type: "string" },
              blockNumber: { type: "integer" },
              timestamp: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { poolId } = request.params as { poolId: string };
    const { limit, offset } = parsePagination(request);
    const db = getDb();

    const rows = await db
      .select()
      .from(swaps)
      .where(eq(swaps.poolId, poolId))
      .orderBy(desc(swaps.blockNumber), desc(swaps.logIndex))
      .limit(limit)
      .offset(offset);

    reply.send(
      rows.map((r) => ({
        id: r.id,
        sender: r.sender,
        amount0: r.amount0,
        amount1: r.amount1,
        price: r.price,
        tick: r.tick,
        txHash: r.txHash,
        blockNumber: r.blockNumber,
        timestamp: r.blockTimestamp.toISOString(),
      }))
    );
  });
}
