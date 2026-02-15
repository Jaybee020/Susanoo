import { MaxUint256, Contract } from "ethers";
import { cofheService } from "./cofheService";
import { SWAP_ROUTER_ADDRESS, swapRouterAbi } from "../utils/swapRouterAbi";

const MIN_SQRT_PRICE = 4295128739n + 1n;
const MAX_SQRT_PRICE =
  1461446703485210103287273052203988822378723970342n - 1n;

export interface SwapPoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
];

export async function executeSwap(
  poolKey: SwapPoolKey,
  zeroForOne: boolean,
  amount: bigint
): Promise<string> {
  const signer = await cofheService.getSigner();

  // Approve input token to swap router
  const inputToken = zeroForOne ? poolKey.currency0 : poolKey.currency1;
  const tokenContract = new Contract(inputToken, ERC20_ABI, signer);
  const approveTx = await tokenContract.approve(SWAP_ROUTER_ADDRESS, MaxUint256);
  await approveTx.wait();

  // Execute swap
  const swapRouter = new Contract(SWAP_ROUTER_ADDRESS, swapRouterAbi, signer);
  const tx = await swapRouter.swap(
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
    { gasLimit: 30000000 }
  );

  const receipt = await tx.wait();
  return receipt.hash;
}
