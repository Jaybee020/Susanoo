import { formatUnits } from "ethers";

/**
 * Convert a price to tick value using Uniswap V3/V4 formula
 * @param price - Price as a number or string
 */
export function priceToTick(price: number | string): number {
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  // tick = log_1.0001(price)
  return Math.floor(Math.log(priceNum) / Math.log(1.0001));
}

/**
 * Convert tick to price using Uniswap V3/V4 formula
 */
export function tickToPrice(tick: number): number {
  // price = 1.0001^tick
  return Math.pow(1.0001, tick);
}

/**
 * Calculate target tick for a percentage change from current tick
 */
export function calculateTargetTick(
  currentTick: number,
  percentage: number,
  isTakeProfit: boolean
): number {
  const currentPrice = tickToPrice(currentTick);

  // For take profit: increase price by percentage
  // For stop loss: decrease price by percentage
  const multiplier = isTakeProfit ? 1 + percentage / 100 : 1 - percentage / 100;
  const targetPrice = currentPrice * multiplier;

  return priceToTick(targetPrice);
}

/**
 * Convert sqrtPriceX96 to readable price string
 */
export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): string {
  try {
    // price = (sqrtPriceX96 / 2^96)^2
    const Q96 = 2n ** 96n;
    const sqrtPrice = (sqrtPriceX96 * sqrtPriceX96) / Q96;

    // Adjust for token decimals
    const decimalsAdjustment = token1Decimals - token0Decimals;
    const adjustedPrice =
      decimalsAdjustment >= 0
        ? sqrtPrice * 10n ** BigInt(decimalsAdjustment)
        : sqrtPrice / 10n ** BigInt(-decimalsAdjustment);

    return formatUnits(adjustedPrice, token0Decimals);
  } catch (error) {
    console.error("Error converting sqrtPriceX96 to price:", error);
    return "0";
  }
}

/**
 * Calculate percentage change between two ticks
 */
export function calculatePercentageChange(
  fromTick: number,
  toTick: number
): number {
  const fromPrice = tickToPrice(fromTick);
  const toPrice = tickToPrice(toTick);

  return ((toPrice - fromPrice) / fromPrice) * 100;
}

/**
 * Format price for display - handles both number and string inputs
 */
export function formatPrice(
  price: number | string | bigint,
  decimals: number = 6
): string {
  if (typeof price === "bigint") {
    return formatUnits(price, decimals);
  }
  const priceNum = typeof price === "string" ? parseFloat(price) : price;
  return priceNum.toFixed(decimals);
}

/**
 * Format percentage for display
 */
export function formatPercentage(percentage: number): string {
  return `${percentage > 0 ? "+" : ""}${percentage.toFixed(2)}%`;
}
