import type { FastifyInstance } from "fastify";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { swaps } from "../../db/schema.js";
import { parsePagination } from "../middleware/pagination.js";

export async function traderRoutes(server: FastifyInstance) {
  server.get("/api/traders/:address/trades", {
    schema: {
      tags: ["Traders"],
      summary: "Get trade history for a specific address",
      params: {
        type: "object",
        properties: { address: { type: "string", description: "Trader wallet address (0x...)" } },
        required: ["address"],
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
              poolId: { type: "string" },
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
    const { address } = request.params as { address: string };
    const { limit, offset } = parsePagination(request);
    const db = getDb();

    const rows = await db
      .select()
      .from(swaps)
      .where(eq(swaps.sender, address.toLowerCase()))
      .orderBy(desc(swaps.blockNumber))
      .limit(limit)
      .offset(offset);

    reply.send(
      rows.map((r) => ({
        id: r.id,
        poolId: r.poolId,
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
