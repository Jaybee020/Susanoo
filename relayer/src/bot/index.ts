import {
  createPublicClient,
  createWalletClient,
  http,
  type WalletClient,
  type PublicClient,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getConfig } from "../config.js";
import { CHAIN } from "../utils/constants.js";
import { seedPools } from "../seed-pools.js";
import { executeSwap } from "./swap-executor.js";
import { generateTrade, getRandomDelay } from "./strategy.js";
import { fundBotWallets } from "./funder.js";

let running = false;
let timeoutHandle: NodeJS.Timeout | null = null;

let walletClients: WalletClient[] = [];
let publicClient: PublicClient;

function initClients() {
  const config = getConfig();

  publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(config.RPC_URL),
  });

  const privateKeys = [
    config.BOT_PRIVATE_KEY_1,
    config.BOT_PRIVATE_KEY_2,
    config.BOT_PRIVATE_KEY_3,
    config.BOT_PRIVATE_KEY_4,
    config.BOT_PRIVATE_KEY_5,
  ].filter((k): k is string => !!k);

  walletClients = privateKeys.map((key) => {
    const account = privateKeyToAccount(key as `0x${string}`);
    return createWalletClient({
      account,
      chain: CHAIN,
      transport: http(config.RPC_URL),
    });
  });

  console.log(`[Bot] Initialized ${walletClients.length} wallet(s)`);
}

async function loop() {
  if (!running || walletClients.length === 0) return;

  try {
    // Pick random wallet
    const wallet = walletClients[Math.floor(Math.random() * walletClients.length)];

    // Pick first seed pool
    const pool = seedPools[0];
    if (!pool) {
      console.error("[Bot] No seed pools configured");
      return;
    }

    const poolKey = {
      currency0: pool.pool.token0Address as Address,
      currency1: pool.pool.token1Address as Address,
      fee: pool.pool.fee,
      tickSpacing: pool.pool.tickSpacing,
      hooks: pool.pool.hookAddress as Address,
    };

    const trade = generateTrade();
    await executeSwap(wallet, publicClient, poolKey, trade.zeroForOne, trade.amount);
  } catch (err) {
    console.error("[Bot] Swap failed:", (err as Error).message);
  }

  if (running) {
    const delay = getRandomDelay();
    timeoutHandle = setTimeout(loop, delay);
  }
}

export async function startBot() {
  const config = getConfig();

  if (!config.BOT_ENABLED) {
    console.log("[Bot] Disabled (BOT_ENABLED=false)");
    return;
  }

  initClients();

  if (walletClients.length === 0) {
    console.warn("[Bot] No private keys configured, skipping");
    return;
  }

  // Fund bot wallets from master wallet if configured
  if (config.BOT_MASTER_WALLET_KEY) {
    const pool = seedPools[0];
    if (pool) {
      try {
        const masterAccount = privateKeyToAccount(config.BOT_MASTER_WALLET_KEY as `0x${string}`);
        const masterWallet = createWalletClient({
          account: masterAccount,
          chain: CHAIN,
          transport: http(config.RPC_URL),
        });

        await fundBotWallets(
          masterWallet,
          publicClient,
          walletClients,
          pool.pool.token0Address as Address,
          pool.pool.token1Address as Address
        );
      } catch (err) {
        console.error("[Bot] Funding failed:", (err as Error).message);
      }
    }
  } else {
    console.warn("[Bot] No BOT_MASTER_WALLET_KEY set, skipping funding");
  }

  running = true;
  console.log("[Bot] Started market maker bot");

  // Start first iteration after a short delay
  timeoutHandle = setTimeout(loop, 3000);
}

export function stopBot() {
  running = false;
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    timeoutHandle = null;
  }
  console.log("[Bot] Stopped");
}
