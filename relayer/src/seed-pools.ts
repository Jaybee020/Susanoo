import type { TokenMetadata, PoolConfig } from "./utils/types.js";

interface SeedPool {
  pool: PoolConfig;
  token0: TokenMetadata;
  token1: TokenMetadata;
}

export const seedPools: SeedPool[] = [
  {
    pool: {
      poolId:
        "0xcb0fa20d5d44e9edfce11efa467cba0827757824efc2d5fcb0e43e4e463ca508",
      token0Address: "0x812650b7B982ca7b7DA11eF2e901502Cf9F0F033",
      token1Address: "0xA31b26459050A4832EC58eBAa03147941e612c5a",
      fee: 3000,
      tickSpacing: 60,
      hookAddress: "0x569b28a558d1229e172e77202d580052179d10c0",
      initBlock: 195626110, // Set to the block the pool was initialized
    },
    token0: {
      address: "0x812650b7B982ca7b7DA11eF2e901502Cf9F0F033",
      name: "Wrapped Ether",
      symbol: "WETH",
      decimals: 18,
      // imageUrl: "https://example.com/token0.png",
    },
    token1: {
      address: "0xA31b26459050A4832EC58eBAa03147941e612c5a",
      name: "Test Meme Token",
      symbol: "TMEMEA",
      decimals: 18,
      // imageUrl: "https://example.com/token1.png",
    },
  },
  // Add more pools here:
  // {
  //   pool: { poolId: "0x...", ... },
  //   token0: { address: "0x...", ... },
  //   token1: { address: "0x...", ... },
  // },
];
