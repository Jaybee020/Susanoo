import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { getDb } from "../../db/index.js";
import { pools, tokens, poolStatsCache } from "../../db/schema.js";

export async function poolRoutes(server: FastifyInstance) {
  server.get("/api/pools", {
    schema: {
      tags: ["Pools"],
      summary: "List all active pools",
      response: {
        200: {
          type: "array",
          items: {
            type: "object",
            properties: {
              poolId: { type: "string" },
              token0: { type: "object", properties: { address: { type: "string" }, name: { type: "string" }, symbol: { type: "string" }, decimals: { type: "integer" }, imageUrl: { type: "string", nullable: true } } },
              token1: { type: "object", nullable: true, properties: { address: { type: "string" }, name: { type: "string" }, symbol: { type: "string" }, decimals: { type: "integer" }, imageUrl: { type: "string", nullable: true } } },
              fee: { type: "integer" },
              tickSpacing: { type: "integer" },
              hookAddress: { type: "string" },
              sqrtPriceX96: { type: "string", nullable: true },
              currentTick: { type: "integer", nullable: true },
              liquidity: { type: "string", nullable: true },
              stats: { type: "object", nullable: true, properties: { priceChange24h: { type: "string", nullable: true }, volume24hToken0: { type: "string" }, volume24hToken1: { type: "string" }, tradeCount24h: { type: "integer" } } },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const db = getDb();

    const results = await db
      .select({
        pool: pools,
        token0: tokens,
        stats: poolStatsCache,
      })
      .from(pools)
      .innerJoin(tokens, eq(tokens.address, pools.token0Address))
      .leftJoin(poolStatsCache, eq(poolStatsCache.poolId, pools.poolId))
      .where(eq(pools.isActive, true));

    // Fetch token1 separately to avoid alias issues
    const poolList = await Promise.all(
      results.map(async (r) => {
        const token1Rows = await db
          .select()
          .from(tokens)
          .where(eq(tokens.address, r.pool.token1Address))
          .limit(1);

        return {
          poolId: r.pool.poolId,
          token0: {
            address: r.token0.address,
            name: r.token0.name,
            symbol: r.token0.symbol,
            decimals: r.token0.decimals,
            imageUrl: r.token0.imageUrl,
          },
          token1: token1Rows[0]
            ? {
                address: token1Rows[0].address,
                name: token1Rows[0].name,
                symbol: token1Rows[0].symbol,
                decimals: token1Rows[0].decimals,
                imageUrl: token1Rows[0].imageUrl,
              }
            : null,
          fee: r.pool.fee,
          tickSpacing: r.pool.tickSpacing,
          hookAddress: r.pool.hookAddress,
          sqrtPriceX96: r.pool.sqrtPriceX96,
          currentTick: r.pool.currentTick,
          liquidity: r.pool.liquidity,
          stats: r.stats
            ? {
                priceChange24h: r.stats.priceChange24h,
                volume24hToken0: r.stats.volume24hToken0,
                volume24hToken1: r.stats.volume24hToken1,
                tradeCount24h: r.stats.tradeCount24h,
              }
            : null,
        };
      })
    );

    reply.send(poolList);
  });

  server.get("/api/pools/:poolId", {
    schema: {
      tags: ["Pools"],
      summary: "Get pool details by ID",
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
            token0: { type: "object", nullable: true },
            token1: { type: "object", nullable: true },
            fee: { type: "integer" },
            tickSpacing: { type: "integer" },
            hookAddress: { type: "string" },
            sqrtPriceX96: { type: "string", nullable: true },
            currentTick: { type: "integer", nullable: true },
            liquidity: { type: "string", nullable: true },
            isActive: { type: "boolean" },
            stats: { type: "object", nullable: true },
          },
        },
        404: {
          type: "object",
          properties: { error: { type: "string" } },
        },
      },
    },
  }, async (request, reply) => {
    const { poolId } = request.params as { poolId: string };
    const db = getDb();

    const poolRows = await db
      .select()
      .from(pools)
      .where(eq(pools.poolId, poolId))
      .limit(1);

    if (poolRows.length === 0) {
      return reply.code(404).send({ error: "Pool not found" });
    }

    const pool = poolRows[0];
    const [token0Rows, token1Rows, statsRows] = await Promise.all([
      db.select().from(tokens).where(eq(tokens.address, pool.token0Address)).limit(1),
      db.select().from(tokens).where(eq(tokens.address, pool.token1Address)).limit(1),
      db.select().from(poolStatsCache).where(eq(poolStatsCache.poolId, poolId)).limit(1),
    ]);

    reply.send({
      poolId: pool.poolId,
      token0: token0Rows[0] ?? null,
      token1: token1Rows[0] ?? null,
      fee: pool.fee,
      tickSpacing: pool.tickSpacing,
      hookAddress: pool.hookAddress,
      sqrtPriceX96: pool.sqrtPriceX96,
      currentTick: pool.currentTick,
      liquidity: pool.liquidity,
      isActive: pool.isActive,
      stats: statsRows[0] ?? null,
    });
  });
}
