import type { Timeframe } from "./constants.js";

export interface PoolConfig {
  poolId: string;
  token0Address: string;
  token1Address: string;
  fee: number;
  tickSpacing: number;
  hookAddress: string;
  initBlock?: number;
}

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  imageUrl?: string;
}

export interface CandleData {
  poolId: string;
  timeframe: Timeframe;
  openTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume0: string;
  volume1: string;
  tradeCount: number;
}

export interface SwapData {
  poolId: string;
  sender: string;
  amount0: string;
  amount1: string;
  sqrtPriceX96: string;
  tick: number;
  price: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  blockTimestamp: Date;
}

export interface WsMessage {
  action: "subscribe" | "unsubscribe";
  channel: string;
}
