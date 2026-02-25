const RELAYER_API_BASE =
  import.meta.env.VITE_RELAYER_API_BASE || "https://susanoo-relayer.fly.dev";

interface TokenMeta {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  imageUrl?: string | null;
}

export interface PoolMarket {
  poolId: string;
  token0: TokenMeta | null;
  token1: TokenMeta | null;
  fee: number;
  tickSpacing: number;
  hookAddress: string;
  sqrtPriceX96?: string | null;
  currentTick?: number | null;
  liquidity?: string | null;
  stats?: {
    priceChange24h?: string | null;
    volume24hToken0?: string | null;
    volume24hToken1?: string | null;
    tradeCount24h?: number | null;
  } | null;
}

export type CandleTimeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface Candle {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume0: string;
  volume1: string;
  tradeCount: number;
}

export interface PoolStats {
  poolId: string;
  price24hAgo?: string | null;
  priceChange24h?: string | null;
  volume24hToken0?: string | null;
  volume24hToken1?: string | null;
  tradeCount24h?: number | null;
}

export interface PoolTrade {
  id: number;
  sender: string;
  amount0: string;
  amount1: string;
  price: string | null;
  tick: number | null;
  txHash: string;
  blockNumber: number;
  timestamp: string;
}

async function request<T>(
  path: string,
  params?: Record<string, string | number>
): Promise<T> {
  const url = new URL(path, RELAYER_API_BASE);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Relayer API error: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

async function safeRequest<T>(
  path: string,
  params: Record<string, string | number> | undefined,
  fallback: T
): Promise<T> {
  try {
    return await request<T>(path, params);
  } catch (error) {
    console.error("Relayer API request failed", error);
    return fallback;
  }
}

export const relayerService = {
  getActivePools(): Promise<PoolMarket[]> {
    return safeRequest<PoolMarket[]>("/api/pools", undefined, []);
  },

  getPoolStats(poolId: string): Promise<PoolStats | null> {
    return safeRequest<PoolStats | null>(
      `/api/pools/${poolId}/stats`,
      undefined,
      null
    );
  },

  getCandles(poolId: string, timeframe: CandleTimeframe): Promise<Candle[]> {
    return safeRequest<Candle[]>(
      `/api/pools/${poolId}/candles`,
      { timeframe },
      []
    );
  },

  getTrades(poolId: string, limit = 25): Promise<PoolTrade[]> {
    return safeRequest<PoolTrade[]>(
      `/api/pools/${poolId}/trades`,
      { limit },
      []
    );
  },
};

export type { TokenMeta };
