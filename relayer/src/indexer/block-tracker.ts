import { eq, and } from "drizzle-orm";
import { getDb } from "../db/index.js";
import { indexerState } from "../db/schema.js";

export async function getLastSyncedBlock(
  poolId: string,
  eventSource: string
): Promise<number | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(indexerState)
    .where(
      and(
        eq(indexerState.poolId, poolId),
        eq(indexerState.eventSource, eventSource)
      )
    )
    .limit(1);

  return rows.length > 0 ? rows[0].lastSyncedBlock : null;
}

export async function setLastSyncedBlock(
  poolId: string,
  eventSource: string,
  blockNumber: number
): Promise<void> {
  const db = getDb();
  await db
    .insert(indexerState)
    .values({ poolId, eventSource, lastSyncedBlock: blockNumber })
    .onConflictDoUpdate({
      target: [indexerState.poolId, indexerState.eventSource],
      set: { lastSyncedBlock: blockNumber },
    });
}
