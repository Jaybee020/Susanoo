import type { FastifyInstance } from "fastify";
import { eq, and, gte, sql } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { pools, swaps, poolStatsCache } from "../../db/schema.js";

export async function statsRoutes(server: FastifyInstance) {
  server.get("/api/pools/:poolId/stats", {
    schema: {
      tags: ["Stats"],
      summary: "Get 24h statistics for a pool",
      params: {
        type: "object",
        properties: { poolId: { type: "string", description: "Pool identifier (bytes32 hex)" } },
        required: ["poolId"],
      },
      response: {
        200: {
          type: "object",
          properties: {
            poolId: { type: "string" },
            price24hAgo: { type: "string", nullable: true },
            priceChange24h: { type: "string", nullable: true },
            volume24hToken0: { type: "string" },
            volume24hToken1: { type: "string" },
            tradeCount24h: { type: "integer" },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { poolId } = request.params as { poolId: string };
    const db = getDb();

    // Check cached stats first
    const cached = await db
      .select()
      .from(poolStatsCache)
      .where(eq(poolStatsCache.poolId, poolId))
      .limit(1);

    if (cached.length > 0) {
      return reply.send(cached[0]);
    }

    // Compute live if no cache
    const stats = await computePoolStats(poolId);
    reply.send(stats);
  });
}

export async function computePoolStats(poolId: string) {
  const db = getDb();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 24h volume + trade count
  const volumeResult = await db
    .select({
      tradeCount: sql<number>`count(*)::int`,
      vol0: sql<string>`coalesce(sum(abs(${swaps.amount0}::numeric)), 0)::text`,
      vol1: sql<string>`coalesce(sum(abs(${swaps.amount1}::numeric)), 0)::text`,
    })
    .from(swaps)
    .where(and(eq(swaps.poolId, poolId), gte(swaps.blockTimestamp, since24h)));

  // Price 24h ago (earliest swap in 24h window)
  const oldestSwap = await db
    .select({ price: swaps.price })
    .from(swaps)
    .where(and(eq(swaps.poolId, poolId), gte(swaps.blockTimestamp, since24h)))
    .orderBy(swaps.blockTimestamp)
    .limit(1);

  // Current price (latest swap)
  const latestSwap = await db
    .select({ price: swaps.price })
    .from(swaps)
    .where(eq(swaps.poolId, poolId))
    .orderBy(sql`${swaps.blockNumber} desc, ${swaps.logIndex} desc`)
    .limit(1);

  const price24hAgo = oldestSwap[0]?.price ?? null;
  const currentPrice = latestSwap[0]?.price ?? null;
  let priceChange24h: string | null = null;

  if (price24hAgo && currentPrice) {
    const change =
      ((parseFloat(currentPrice) - parseFloat(price24hAgo)) /
        parseFloat(price24hAgo)) *
      100;
    priceChange24h = change.toFixed(4);
  }

  const stats = {
    poolId,
    price24hAgo,
    priceChange24h,
    volume24hToken0: volumeResult[0]?.vol0 ?? "0",
    volume24hToken1: volumeResult[0]?.vol1 ?? "0",
    tradeCount24h: volumeResult[0]?.tradeCount ?? 0,
  };

  return stats;
}

export async function refreshAllPoolStats() {
  const db = getDb();
  const activePools = await db
    .select({ poolId: pools.poolId })
    .from(pools)
    .where(eq(pools.isActive, true));

  for (const pool of activePools) {
    const stats = await computePoolStats(pool.poolId);
    await db
      .insert(poolStatsCache)
      .values(stats)
      .onConflictDoUpdate({
        target: poolStatsCache.poolId,
        set: {
          price24hAgo: stats.price24hAgo,
          priceChange24h: stats.priceChange24h,
          volume24hToken0: stats.volume24hToken0,
          volume24hToken1: stats.volume24hToken1,
          tradeCount24h: stats.tradeCount24h,
        },
      });
  }
}
