import { ethers } from "ethers";
import {
  POOLKEY,
  PROVIDER_RPC_URL,
  STATEVIEW_ADDRESS,
} from "../utils/constants";
import { JsonRpcProvider } from "ethers";

export interface PoolInfo {
  poolId: string;
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
}

class PoolService {
  // Pool Manager ABI for the functions we need
  private readonly STATE_VIEW_ABI = [
    "function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    "function getLiquidity(bytes32 poolId) external view returns (uint128)",
    "function getPosition(bytes32 poolId, address owner, int24 tickLower, int24 tickUpper, bytes32 salt) external view returns (uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)",
  ];

  private readonly ERC20_ABI = [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address owner) view returns (uint256)",
  ];

  private readonly stateViewAddress = STATEVIEW_ADDRESS;

  async getPoolInfo(poolId: string): Promise<PoolInfo> {
    try {
      const provider = new ethers.JsonRpcProvider(PROVIDER_RPC_URL);
      const poolManager = new ethers.Contract(
        this.stateViewAddress,
        this.STATE_VIEW_ABI,
        provider
      );

      const [slot0, liquidity] = await Promise.all([
        poolManager.getSlot0(poolId),
        poolManager.getLiquidity(poolId),
      ]);
      console.log(slot0, liquidity);
      // Get token info
      const [token0Info, token1Info] = await Promise.all([
        this.getTokenInfo(POOLKEY.currency0),
        this.getTokenInfo(POOLKEY.currency1),
      ]);
      return {
        poolId,
        currency0: POOLKEY.currency0,
        currency1: POOLKEY.currency1,
        fee: POOLKEY.fee,
        tickSpacing: POOLKEY.tickSpacing,
        hooks: POOLKEY.hooks,
        sqrtPriceX96: slot0.sqrtPriceX96,
        tick: slot0.tick,
        liquidity: liquidity,
        token0Symbol: token0Info.symbol,
        token1Symbol: token1Info.symbol,
        token0Decimals: token0Info.decimals,
        token1Decimals: token1Info.decimals,
      };
    } catch (error) {
      console.error("Error fetching pool info:", error);
      throw new Error("Failed to fetch pool information");
    }
  }

  async validatePoolId(poolId: string): Promise<boolean> {
    // Check if poolId is a valid 32-byte hex string
    if (!poolId || typeof poolId !== "string") {
      return false;
    }

    // Remove 0x prefix if present
    const cleanId = poolId.startsWith("0x") ? poolId.slice(2) : poolId;

    // Check if it's exactly 64 hex characters (32 bytes)
    if (cleanId.length !== 64) {
      return false;
    }

    // Check if all characters are valid hex
    if (!/^[0-9a-fA-F]+$/.test(cleanId)) {
      return false;
    }

    try {
      // Try to fetch pool info to see if pool exists
      await this.getPoolInfo(poolId);
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getTokenInfo(
    tokenAddress: string
  ): Promise<{ symbol: string; decimals: number }> {
    try {
      const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
      const contract = new ethers.Contract(
        tokenAddress,
        this.ERC20_ABI,
        provider
      );

      const [symbol, decimals] = await Promise.all([
        contract.symbol(),
        contract.decimals(),
      ]);

      return { symbol, decimals };
    } catch (error) {
      console.error("Error fetching token info for", tokenAddress, ":", error);
      // Return mock data for development
      const mockSymbols: { [key: string]: string } = {
        "0x0000000000000000000000000000000000000001": "TOKEN0",
        "0x0000000000000000000000000000000000000002": "TOKEN1",
      };

      return {
        symbol: mockSymbols[tokenAddress] || "UNKNOWN",
        decimals: 18,
      };
    }
  }

  calculatePrice(
    sqrtPriceX96: bigint,
    token0Decimals: number,
    token1Decimals: number
  ): number {
    try {
      // Convert sqrtPriceX96 to actual price
      // price = (sqrtPriceX96 / 2^96)^2
      const sqrtPrice = Number(sqrtPriceX96) / Math.pow(2, 96);
      const price = Math.pow(sqrtPrice, 2);

      // Adjust for token decimals
      const decimalsAdjustment = Math.pow(
        10,
        Number(BigInt(token1Decimals) - BigInt(token0Decimals))
      );

      return price * decimalsAdjustment;
    } catch (error) {
      console.error("Error calculating price:", error);
      return 0;
    }
  }
}

export const poolService = new PoolService();
