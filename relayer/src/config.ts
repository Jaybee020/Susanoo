import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  ADMIN_API_KEY: z.string().min(1),
  RPC_URL: z.string().url(),
  POOL_MANAGER_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317"),
  SUSANOO_HOOK_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0x569b28a558d1229e172e77202d580052179d10c0"),
  STATE_VIEW_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0x9D467FA9062b6e9B1a46E26007aD82db116c67cB"),
  INDEXER_BATCH_SIZE: z.coerce.number().default(100000),
  INDEXER_POLL_INTERVAL_MS: z.coerce.number().default(5000),

  // Bot config
  BOT_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  BOT_PRIVATE_KEY_1: z.string().optional(),
  BOT_PRIVATE_KEY_2: z.string().optional(),
  BOT_PRIVATE_KEY_3: z.string().optional(),
  BOT_PRIVATE_KEY_4: z.string().optional(),
  BOT_PRIVATE_KEY_5: z.string().optional(),
  SWAP_ROUTER_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .default("0xf3A39C86dbd13C45365E57FB90fe413371F65AF8"),
  BOT_MASTER_WALLET_KEY: z.string().optional(),
  BOT_FUND_AMOUNT: z.string().default("10"),
  BOT_MIN_BALANCE: z.string().default("1"),
  BOT_MIN_AMOUNT: z.string().default("0.1"),
  BOT_MAX_AMOUNT: z.string().default("5"),
  BOT_MIN_INTERVAL_MS: z.coerce.number().default(15000),
  BOT_MAX_INTERVAL_MS: z.coerce.number().default(60000),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = envSchema.parse(process.env);
  }
  return _config;
}
