import { sqrtPriceX96ToPrice } from "../utils/tick-math.js";

export function calculatePrice(
  sqrtPriceX96: bigint,
  token0Decimals: number,
  token1Decimals: number
): string {
  return sqrtPriceX96ToPrice(sqrtPriceX96, token0Decimals, token1Decimals);
}

export function absString(value: string): string {
  if (value.startsWith("-")) return value.slice(1);
  return value;
}
