import { getDb } from "./db/index.js";
import { tokens, pools } from "./db/schema.js";
import { seedPools } from "./seed-pools.js";

export async function applySeedPools() {
  const db = getDb();

  for (const entry of seedPools) {
    // Upsert tokens
    for (const tokenData of [entry.token0, entry.token1]) {
      await db
        .insert(tokens)
        .values({
          address: tokenData.address,
          name: tokenData.name,
          symbol: tokenData.symbol,
          decimals: tokenData.decimals,
          imageUrl: tokenData.imageUrl ?? null,
        })
        .onConflictDoUpdate({
          target: tokens.address,
          set: {
            name: tokenData.name,
            symbol: tokenData.symbol,
            decimals: tokenData.decimals,
            imageUrl: tokenData.imageUrl ?? null,
          },
        });
    }

    // Upsert pool
    await db
      .insert(pools)
      .values({
        poolId: entry.pool.poolId,
        token0Address: entry.pool.token0Address,
        token1Address: entry.pool.token1Address,
        fee: entry.pool.fee,
        tickSpacing: entry.pool.tickSpacing,
        hookAddress: entry.pool.hookAddress,
        initBlock: entry.pool.initBlock,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: pools.poolId,
        set: {
          token0Address: entry.pool.token0Address,
          token1Address: entry.pool.token1Address,
          fee: entry.pool.fee,
          tickSpacing: entry.pool.tickSpacing,
          hookAddress: entry.pool.hookAddress,
          initBlock: entry.pool.initBlock,
        },
      });
  }

  if (seedPools.length > 0) {
    console.log(`[Seed] Upserted ${seedPools.length} pool(s) from seed-pools.ts`);
  }
}
