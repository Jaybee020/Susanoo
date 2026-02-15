import { and, eq } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { candles } from "../db/schema.js";
import { TIMEFRAMES, TIMEFRAME_SECONDS, type Timeframe } from "../utils/constants.js";
import { absString } from "./price-utils.js";

function getBucketStart(timestamp: Date, timeframe: Timeframe): Date {
  const seconds = TIMEFRAME_SECONDS[timeframe];
  const ms = timestamp.getTime();
  const bucketMs = Math.floor(ms / (seconds * 1000)) * seconds * 1000;
  return new Date(bucketMs);
}

export async function updateCandles(
  poolId: string,
  price: string,
  amount0: string,
  amount1: string,
  blockTimestamp: Date
): Promise<void> {
  const db = getDb();
  const vol0 = absString(amount0);
  const vol1 = absString(amount1);

  for (const tf of TIMEFRAMES) {
    const openTime = getBucketStart(blockTimestamp, tf);

    // Try to get existing candle
    const existing = await db
      .select()
      .from(candles)
      .where(
        and(
          eq(candles.poolId, poolId),
          eq(candles.timeframe, tf),
          eq(candles.openTime, openTime)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const candle = existing[0];
      const newHigh =
        parseFloat(price) > parseFloat(candle.high) ? price : candle.high;
      const newLow =
        parseFloat(price) < parseFloat(candle.low) ? price : candle.low;
      const newVol0 = (BigInt(candle.volume0) + BigInt(vol0)).toString();
      const newVol1 = (BigInt(candle.volume1) + BigInt(vol1)).toString();

      await db
        .update(candles)
        .set({
          high: newHigh,
          low: newLow,
          close: price,
          volume0: newVol0,
          volume1: newVol1,
          tradeCount: candle.tradeCount + 1,
        })
        .where(eq(candles.id, candle.id));
    } else {
      await db
        .insert(candles)
        .values({
          poolId,
          timeframe: tf,
          openTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume0: vol0,
          volume1: vol1,
          tradeCount: 1,
        })
        .onConflictDoNothing();
    }
  }
}
