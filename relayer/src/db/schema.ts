import {
  pgTable,
  serial,
  varchar,
  text,
  smallint,
  integer,
  bigint,
  bigserial,
  boolean,
  numeric,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const tokens = pgTable("tokens", {
  id: serial("id").primaryKey(),
  address: varchar("address", { length: 42 }).notNull().unique(),
  name: varchar("name", { length: 128 }).notNull(),
  symbol: varchar("symbol", { length: 32 }).notNull(),
  decimals: smallint("decimals").notNull().default(18),
  imageUrl: text("image_url"),
});

export const pools = pgTable("pools", {
  id: serial("id").primaryKey(),
  poolId: varchar("pool_id", { length: 66 }).notNull().unique(),
  token0Address: varchar("token0_address", { length: 42 })
    .notNull()
    .references(() => tokens.address),
  token1Address: varchar("token1_address", { length: 42 })
    .notNull()
    .references(() => tokens.address),
  fee: integer("fee").notNull(),
  tickSpacing: integer("tick_spacing").notNull(),
  hookAddress: varchar("hook_address", { length: 42 }).notNull(),
  sqrtPriceX96: varchar("sqrt_price_x96", { length: 78 }),
  currentTick: integer("current_tick"),
  liquidity: varchar("liquidity", { length: 78 }),
  isActive: boolean("is_active").notNull().default(true),
  initBlock: bigint("init_block", { mode: "number" }),
});

export const swaps = pgTable(
  "swaps",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    poolId: varchar("pool_id", { length: 66 })
      .notNull()
      .references(() => pools.poolId),
    sender: varchar("sender", { length: 42 }).notNull(),
    amount0: numeric("amount0", { precision: 78, scale: 0 }).notNull(),
    amount1: numeric("amount1", { precision: 78, scale: 0 }).notNull(),
    sqrtPriceX96: varchar("sqrt_price_x96", { length: 78 }).notNull(),
    tick: integer("tick").notNull(),
    price: numeric("price", { precision: 38, scale: 18 }).notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    logIndex: integer("log_index").notNull(),
    blockTimestamp: timestamp("block_timestamp", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("swaps_tx_log_idx").on(table.txHash, table.logIndex),
  ]
);

export const candles = pgTable(
  "candles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    poolId: varchar("pool_id", { length: 66 })
      .notNull()
      .references(() => pools.poolId),
    timeframe: varchar("timeframe", { length: 4 }).notNull(),
    openTime: timestamp("open_time", { withTimezone: true }).notNull(),
    open: numeric("open", { precision: 38, scale: 18 }).notNull(),
    high: numeric("high", { precision: 38, scale: 18 }).notNull(),
    low: numeric("low", { precision: 38, scale: 18 }).notNull(),
    close: numeric("close", { precision: 38, scale: 18 }).notNull(),
    volume0: numeric("volume0", { precision: 78, scale: 0 }).notNull().default("0"),
    volume1: numeric("volume1", { precision: 78, scale: 0 }).notNull().default("0"),
    tradeCount: integer("trade_count").notNull().default(0),
  },
  (table) => [
    uniqueIndex("candles_pool_tf_time_idx").on(
      table.poolId,
      table.timeframe,
      table.openTime
    ),
  ]
);

export const liquidityEvents = pgTable(
  "liquidity_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    poolId: varchar("pool_id", { length: 66 })
      .notNull()
      .references(() => pools.poolId),
    sender: varchar("sender", { length: 42 }).notNull(),
    tickLower: integer("tick_lower").notNull(),
    tickUpper: integer("tick_upper").notNull(),
    liquidityDelta: numeric("liquidity_delta", { precision: 78, scale: 0 }).notNull(),
    blockNumber: bigint("block_number", { mode: "number" }).notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    logIndex: integer("log_index").notNull(),
    blockTimestamp: timestamp("block_timestamp", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("liq_events_tx_log_idx").on(table.txHash, table.logIndex),
  ]
);

export const indexerState = pgTable(
  "indexer_state",
  {
    id: serial("id").primaryKey(),
    poolId: varchar("pool_id", { length: 66 }).notNull(),
    eventSource: varchar("event_source", { length: 32 }).notNull(),
    lastSyncedBlock: bigint("last_synced_block", { mode: "number" }).notNull(),
  },
  (table) => [
    uniqueIndex("indexer_state_pool_source_idx").on(
      table.poolId,
      table.eventSource
    ),
  ]
);

export const poolStatsCache = pgTable("pool_stats_cache", {
  id: serial("id").primaryKey(),
  poolId: varchar("pool_id", { length: 66 })
    .notNull()
    .unique()
    .references(() => pools.poolId),
  price24hAgo: numeric("price_24h_ago", { precision: 38, scale: 18 }),
  priceChange24h: numeric("price_change_24h", { precision: 10, scale: 4 }),
  volume24hToken0: numeric("volume_24h_token0", { precision: 78, scale: 0 }).default("0"),
  volume24hToken1: numeric("volume_24h_token1", { precision: 78, scale: 0 }).default("0"),
  tradeCount24h: integer("trade_count_24h").default(0),
});
