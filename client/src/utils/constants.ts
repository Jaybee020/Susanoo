export const HOOK_ADDRESS = "0x569b28a558d1229e172e77202d580052179d10c0";
export const PROVIDER_RPC_URL =
  import.meta.env.VITE_PROVIDER_RPC_URL || "http://127.0.0.1:8545";
export const DEFAULT_DEPLOYED_POOL_ID =
  "0xcb0fa20d5d44e9edfce11efa467cba0827757824efc2d5fcb0e43e4e463ca508";
export const POOL_MANAGER = "0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317";
export const STATEVIEW_ADDRESS = "0x9D467FA9062b6e9B1a46E26007aD82db116c67cB";
export const TOKEN0 = "0x812650b7B982ca7b7DA11eF2e901502Cf9F0F033";
export const TOKEN1 = "0xA31b26459050A4832EC58eBAa03147941e612c5a";
export const POOLKEY = {
  currency0: "0x812650b7B982ca7b7DA11eF2e901502Cf9F0F033",
  currency1: "0xA31b26459050A4832EC58eBAa03147941e612c5a",
  fee: 3000,
  tickSpacing: 60,
  hooks: "0x303C5560eb3229fe2b73f920513aDAAaba1a90c0",
};
// Common fee tiers for Uniswap V4 pools (in basis points)
export const COMMON_FEE_TIERS = [
  { value: 100, label: "0.01%" },
  { value: 500, label: "0.05%" },
  { value: 3000, label: "0.3%" },
  { value: 10000, label: "1%" },
];

// Common tick spacings
export const TICK_SPACINGS = {
  100: 1,
  500: 10,
  3000: 60,
  10000: 200,
};

// Predefined percentage options for take profit and stop loss
export const PERCENTAGE_OPTIONS = {
  takeProfit: [5, 10, 15, 20, 25, 50],
  stopLoss: [5, 10, 15, 20, 25, 30],
};

// Order types
export enum OrderType {
  TakeProfit = 1,
  StopLoss = 0,
}

export enum OrderStatus {
  Placed = 0,
  Executed = 1,
  Cancelled = 2,
}
