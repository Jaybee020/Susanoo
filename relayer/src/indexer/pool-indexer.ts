import {
  createPublicClient,
  http,
  type PublicClient,
  type Log,
  parseAbiItem,
} from "viem";
import { getConfig } from "../config.js";
import { CHAIN } from "../utils/constants.js";
import { handleSwapEvent } from "./event-handlers/swap.js";
import { handleModifyLiquidity } from "./event-handlers/liquidity.js";
import { getLastSyncedBlock, setLastSyncedBlock } from "./block-tracker.js";

export interface PoolIndexerConfig {
  poolId: `0x${string}`;
  initBlock: number;
  token0Decimals: number;
  token1Decimals: number;
}

export class PoolIndexer {
  private client: PublicClient;
  private config: PoolIndexerConfig;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(poolConfig: PoolIndexerConfig) {
    const appConfig = getConfig();
    this.client = createPublicClient({
      chain: CHAIN,
      transport: http(appConfig.RPC_URL),
    });
    this.config = poolConfig;
  }

  async start() {
    this.running = true;
    console.log(
      `[Indexer] Starting for pool ${this.config.poolId.slice(0, 10)}...`,
    );

    // Backfill in background, then start live polling
    this.backfill("pool_manager")
      .then(() => {
        if (this.running) this.poll();
      })
      .catch((err) => {
        console.error(
          `[Indexer] Backfill failed for ${this.config.poolId.slice(0, 10)}:`,
          err,
        );
        // Start polling anyway from wherever we got to
        if (this.running) this.poll();
      });
  }

  stop() {
    this.running = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log(
      `[Indexer] Stopped for pool ${this.config.poolId.slice(0, 10)}`,
    );
  }

  private async backfill(source: "pool_manager") {
    const appConfig = getConfig();
    const lastBlock = await getLastSyncedBlock(this.config.poolId, source);
    const startBlock = lastBlock ? lastBlock + 1 : this.config.initBlock;
    const currentBlock = Number(await this.client.getBlockNumber());

    if (startBlock > currentBlock) return;

    const totalBlocks = currentBlock - startBlock;
    const totalBatches = Math.ceil(totalBlocks / appConfig.INDEXER_BATCH_SIZE);
    let batchNum = 0;
    let totalSwaps = 0;
    let totalLiqEvents = 0;

    console.log(
      `[Indexer] Backfilling ${source} from ${startBlock} to ${currentBlock} (${totalBlocks.toLocaleString()} blocks, ${totalBatches} batches of ${appConfig.INDEXER_BATCH_SIZE.toLocaleString()})`,
    );

    for (
      let from = startBlock;
      from <= currentBlock;
      from += appConfig.INDEXER_BATCH_SIZE
    ) {
      if (!this.running) return;
      batchNum++;
      const to = Math.min(
        from + appConfig.INDEXER_BATCH_SIZE - 1,
        currentBlock,
      );
      const progress = ((batchNum / totalBatches) * 100).toFixed(1);

      const { swaps, liquidity } = await this.fetchPoolManagerLogs(
        BigInt(from),
        BigInt(to),
      );
      totalSwaps += swaps;
      totalLiqEvents += liquidity;
      await setLastSyncedBlock(this.config.poolId, source, to);

      console.log(
        `[Indexer] Batch ${batchNum}/${totalBatches} (${progress}%) blocks ${from}-${to} | found ${swaps} swaps, ${liquidity} liq events | total: ${totalSwaps} swaps, ${totalLiqEvents} liq`,
      );
    }

    console.log(
      `[Indexer] Backfill complete — ${totalSwaps} swaps, ${totalLiqEvents} liquidity events indexed`,
    );
  }

  private async poll() {
    if (!this.running) return;

    const appConfig = getConfig();

    try {
      const currentBlock = Number(await this.client.getBlockNumber());

      // Pool manager events
      const pmLastBlock =
        (await getLastSyncedBlock(this.config.poolId, "pool_manager")) ??
        this.config.initBlock;
      if (pmLastBlock < currentBlock) {
        await this.fetchPoolManagerLogs(
          BigInt(pmLastBlock + 1),
          BigInt(currentBlock),
        );
        await setLastSyncedBlock(
          this.config.poolId,
          "pool_manager",
          currentBlock,
        );
      }
    } catch (err) {
      console.error(
        `[Indexer] Poll error for ${this.config.poolId.slice(0, 10)}:`,
        err,
      );
    }

    this.pollTimer = setTimeout(
      () => this.poll(),
      appConfig.INDEXER_POLL_INTERVAL_MS,
    );
  }

  private async fetchPoolManagerLogs(
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<{ swaps: number; liquidity: number }> {
    const appConfig = getConfig();
    const address = appConfig.POOL_MANAGER_ADDRESS as `0x${string}`;

    // Fetch Swap events
    const swapLogs = await this.client.getLogs({
      address,
      event: parseAbiItem(
        "event Swap(bytes32 indexed id, address indexed sender, int128 amount0, int128 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick, uint24 fee)",
      ),
      args: { id: this.config.poolId },
      fromBlock,
      toBlock,
    });

    for (const log of swapLogs) {
      const block = await this.client.getBlock({
        blockNumber: log.blockNumber!,
      });
      const timestamp = new Date(Number(block.timestamp) * 1000);
      await handleSwapEvent(
        log as unknown as Log,
        log.args as any,
        timestamp,
        this.config.token0Decimals,
        this.config.token1Decimals,
      );
    }

    // Fetch ModifyLiquidity events
    const liqLogs = await this.client.getLogs({
      address,
      event: parseAbiItem(
        "event ModifyLiquidity(bytes32 indexed id, address indexed sender, int24 tickLower, int24 tickUpper, int256 liquidityDelta, bytes32 salt)",
      ),
      args: { id: this.config.poolId },
      fromBlock,
      toBlock,
    });

    for (const log of liqLogs) {
      const block = await this.client.getBlock({
        blockNumber: log.blockNumber!,
      });
      const timestamp = new Date(Number(block.timestamp) * 1000);
      await handleModifyLiquidity(
        log as unknown as Log,
        log.args as any,
        timestamp,
      );
    }

    return { swaps: swapLogs.length, liquidity: liqLogs.length };
  }
}
