import { parseEther } from "viem";
import { getConfig } from "../config.js";

export function generateTrade(): { zeroForOne: boolean; amount: bigint } {
  const config = getConfig();
  const zeroForOne = Math.random() < 0.5;

  const min = parseFloat(config.BOT_MIN_AMOUNT);
  const max = parseFloat(config.BOT_MAX_AMOUNT);
  const randomAmount = min + Math.random() * (max - min);
  // Round to 4 decimals to avoid weird precision
  const rounded = Math.round(randomAmount * 10000) / 10000;
  const amount = parseEther(rounded.toString());

  return { zeroForOne, amount };
}

export function getRandomDelay(): number {
  const config = getConfig();
  const min = config.BOT_MIN_INTERVAL_MS;
  const max = config.BOT_MAX_INTERVAL_MS;
  return Math.floor(min + Math.random() * (max - min));
}
