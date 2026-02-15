import {
  type WalletClient,
  type PublicClient,
  type Address,
  maxUint256,
  formatEther,
} from "viem";
import { erc20Abi } from "../abis/erc20.js";
import { swapRouterAbi } from "../abis/swap-router.js";
import { getConfig } from "../config.js";

// TickMath constants from Uniswap V4
const MIN_SQRT_PRICE = 4295128739n + 1n;
const MAX_SQRT_PRICE =
  1461446703485210103287273052203988822378723970342n - 1n;

const approvedTokens = new Set<string>();

const approveAbi = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export async function ensureApproval(
  walletClient: WalletClient,
  publicClient: PublicClient,
  tokenAddress: Address,
  spender: Address
) {
  const key = `${walletClient.account!.address}-${tokenAddress}-${spender}`;
  if (approvedTokens.has(key)) return;

  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: approveAbi,
    functionName: "approve",
    args: [spender, maxUint256],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  await publicClient.waitForTransactionReceipt({ hash });
  approvedTokens.add(key);
  console.log(
    `[Bot] Approved ${tokenAddress.slice(0, 8)}... for wallet ${walletClient.account!.address.slice(0, 8)}...`
  );
}

export async function executeSwap(
  walletClient: WalletClient,
  publicClient: PublicClient,
  poolKey: {
    currency0: Address;
    currency1: Address;
    fee: number;
    tickSpacing: number;
    hooks: Address;
  },
  zeroForOne: boolean,
  amount: bigint
): Promise<string> {
  const config = getConfig();
  const swapRouter = config.SWAP_ROUTER_ADDRESS as Address;

  // Approve the input token
  const inputToken = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  await ensureApproval(walletClient, publicClient, inputToken, swapRouter);

  const hash = await walletClient.writeContract({
    address: swapRouter,
    abi: swapRouterAbi,
    functionName: "swap",
    args: [
      {
        currency0: poolKey.currency0,
        currency1: poolKey.currency1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
      },
      {
        zeroForOne,
        amountSpecified: -amount, // negative = exact input
        sqrtPriceLimitX96: zeroForOne ? MIN_SQRT_PRICE : MAX_SQRT_PRICE,
      },
      {
        takeClaims: false,
        settleUsingBurn: false,
      },
      "0x",
    ],
    chain: walletClient.chain,
    account: walletClient.account!,
  });

  await publicClient.waitForTransactionReceipt({ hash });

  const direction = zeroForOne ? "TKN0 → TKN1" : "TKN1 → TKN0";
  console.log(
    `[Bot] Wallet ${walletClient.account!.address.slice(0, 8)}... swapped ${formatEther(amount)} ${direction} (tx: ${hash.slice(0, 10)}...)`
  );

  return hash;
}
