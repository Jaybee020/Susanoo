const Q96 = 2n ** 96n;
const PRECISION = 10n ** 18n;

export function sqrtPriceX96ToPrice(
  sqrtPriceX96: bigint,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): string {
  // price = (sqrtPriceX96 / 2^96)^2 adjusted for decimals
  // To maintain precision: price = sqrtPriceX96^2 * 10^18 * 10^(t0dec - t1dec) / 2^192
  const sqrtPriceSq = sqrtPriceX96 * sqrtPriceX96;
  const Q192 = Q96 * Q96;

  const decimalsDiff = token0Decimals - token1Decimals;
  let adjusted: bigint;
  if (decimalsDiff >= 0) {
    adjusted = (sqrtPriceSq * PRECISION * 10n ** BigInt(decimalsDiff)) / Q192;
  } else {
    adjusted = (sqrtPriceSq * PRECISION) / (Q192 * 10n ** BigInt(-decimalsDiff));
  }

  // Format as decimal string with 18 decimal places
  const whole = adjusted / PRECISION;
  const frac = adjusted % PRECISION;
  const fracStr = frac.toString().padStart(18, "0");
  return `${whole}.${fracStr}`;
}

export function tickToPrice(tick: number): number {
  return Math.pow(1.0001, tick);
}

export function priceToTick(price: number): number {
  return Math.floor(Math.log(price) / Math.log(1.0001));
}
