import { eq } from "drizzle-orm";
import type { Log } from "viem";
import { getDb } from "../../db/index.js";
import { swaps, pools } from "../../db/schema.js";
import { calculatePrice } from "../price-utils.js";
import { updateCandles } from "../candle-aggregator.js";
import { pubsub } from "../../ws/pubsub.js";

interface SwapEventArgs {
  id: `0x${string}`;
  sender: `0x${string}`;
  amount0: bigint;
  amount1: bigint;
  sqrtPriceX96: bigint;
  liquidity: bigint;
  tick: number;
  fee: number;
}

export async function handleSwapEvent(
  log: Log,
  args: SwapEventArgs,
  blockTimestamp: Date,
  token0Decimals: number,
  token1Decimals: number
) {
  const db = getDb();
  const poolId = args.id;
  const price = calculatePrice(args.sqrtPriceX96, token0Decimals, token1Decimals);

  // Insert swap record
  await db
    .insert(swaps)
    .values({
      poolId,
      sender: args.sender,
      amount0: args.amount0.toString(),
      amount1: args.amount1.toString(),
      sqrtPriceX96: args.sqrtPriceX96.toString(),
      tick: args.tick,
      price,
      blockNumber: Number(log.blockNumber),
      txHash: log.transactionHash!,
      logIndex: log.logIndex!,
      blockTimestamp,
    })
    .onConflictDoNothing();

  // Update pool state
  await db
    .update(pools)
    .set({
      sqrtPriceX96: args.sqrtPriceX96.toString(),
      currentTick: args.tick,
      liquidity: args.liquidity.toString(),
    })
    .where(eq(pools.poolId, poolId));

  // Update candles
  await updateCandles(
    poolId,
    price,
    args.amount0.toString(),
    args.amount1.toString(),
    blockTimestamp
  );

  // Publish to WebSocket channels
  const tradeData = {
    poolId,
    sender: args.sender,
    amount0: args.amount0.toString(),
    amount1: args.amount1.toString(),
    price,
    tick: args.tick,
    txHash: log.transactionHash,
    blockTimestamp: blockTimestamp.toISOString(),
  };

  pubsub.emit(`pool:${poolId}:trades`, tradeData);
  pubsub.emit(`pool:${poolId}:price`, {
    poolId,
    price,
    tick: args.tick,
    sqrtPriceX96: args.sqrtPriceX96.toString(),
  });
}
