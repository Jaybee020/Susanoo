import type { Log } from "viem";
import { getDb } from "../../db/index.js";
import { liquidityEvents } from "../../db/schema.js";

interface ModifyLiquidityArgs {
  id: `0x${string}`;
  sender: `0x${string}`;
  tickLower: number;
  tickUpper: number;
  liquidityDelta: bigint;
  salt: `0x${string}`;
}

export async function handleModifyLiquidity(
  log: Log,
  args: ModifyLiquidityArgs,
  blockTimestamp: Date
) {
  const db = getDb();

  await db
    .insert(liquidityEvents)
    .values({
      poolId: args.id,
      sender: args.sender,
      tickLower: args.tickLower,
      tickUpper: args.tickUpper,
      liquidityDelta: args.liquidityDelta.toString(),
      blockNumber: Number(log.blockNumber),
      txHash: log.transactionHash!,
      logIndex: log.logIndex!,
      blockTimestamp,
    })
    .onConflictDoNothing();
}
