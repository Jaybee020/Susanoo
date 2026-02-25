import { eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { pools, tokens } from "../db/schema.js";
import { PoolIndexer, type PoolIndexerConfig } from "./pool-indexer.js";

const activeIndexers = new Map<string, PoolIndexer>();

export async function startIndexers() {
  const db = getDb();
  const activePools = await db
    .select()
    .from(pools)
    .where(eq(pools.isActive, true));

  console.log(`[Indexer] Found ${activePools.length} active pools`);

  for (const pool of activePools) {
    await startPoolIndexer(pool.poolId);
  }
}

export async function startPoolIndexer(poolId: string) {
  if (activeIndexers.has(poolId)) {
    console.log(`[Indexer] Pool ${poolId.slice(0, 10)} already running`);
    return;
  }

  const db = getDb();

  // Get pool + token decimals
  const poolRows = await db
    .select()
    .from(pools)
    .where(eq(pools.poolId, poolId))
    .limit(1);

  if (poolRows.length === 0) {
    console.error(`[Indexer] Pool ${poolId} not found`);
    return;
  }

  const pool = poolRows[0];

  const token0Rows = await db
    .select()
    .from(tokens)
    .where(eq(tokens.address, pool.token0Address))
    .limit(1);
  const token1Rows = await db
    .select()
    .from(tokens)
    .where(eq(tokens.address, pool.token1Address))
    .limit(1);

  const token0Decimals = token0Rows[0]?.decimals ?? 18;
  const token1Decimals = token1Rows[0]?.decimals ?? 18;

  const config: PoolIndexerConfig = {
    poolId: poolId as `0x${string}`,
    initBlock: pool.initBlock ?? 0,
    token0Decimals,
    token1Decimals,
  };

  const indexer = new PoolIndexer(config);
  activeIndexers.set(poolId, indexer);
  await indexer.start();
}

export function stopPoolIndexer(poolId: string) {
  const indexer = activeIndexers.get(poolId);
  if (indexer) {
    indexer.stop();
    activeIndexers.delete(poolId);
  }
}

export function stopAllIndexers() {
  for (const [poolId, indexer] of activeIndexers) {
    indexer.stop();
  }
  activeIndexers.clear();
}
