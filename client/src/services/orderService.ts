import { LimitOrder, OrderCreationParams } from "./limitOrder";
import { cofheService } from "./cofheService";
import {
  HOOK_ADDRESS,
  PROVIDER_RPC_URL,
} from "../utils/constants";
import { JsonRpcProvider } from "ethers";
import { Contract } from "ethers";

class OrderService {
  private limitOrder: LimitOrder | null = null;

  constructor() {
    this.limitOrder = new LimitOrder(HOOK_ADDRESS);
  }

  async initialize(): Promise<void> {
    if (!this.limitOrder) {
      this.limitOrder = new LimitOrder(HOOK_ADDRESS);
    }

    await this.limitOrder.initialize();
  }

  async createOrder(params: OrderCreationParams): Promise<string> {
    await this.initialize();

    if (!this.limitOrder) {
      throw new Error("Order service not initialized");
    }

    return await this.limitOrder.createOrder(params);
  }

  async getUserOrders(userAddress?: string): Promise<any[]> {
    await this.initialize();

    if (!this.limitOrder) {
      throw new Error("Order service not initialized");
    }

    const address = userAddress || (await cofheService.getWalletAddress());
    return await this.limitOrder.getHistoricalOrders(address);
  }

  async getOrderById(orderId: string): Promise<any> {
    await this.initialize();

    if (!this.limitOrder) {
      throw new Error("Order service not initialized");
    }

    return await this.limitOrder.getOrder(orderId);
  }

  async decryptOrder(
    encryptedTriggerTick: any,
    encryptedOrderType: any
  ): Promise<any> {
    await this.initialize();

    if (!this.limitOrder) {
      throw new Error("Order service not initialized");
    }

    return await this.limitOrder.unsealOrderData(
      encryptedTriggerTick,
      encryptedOrderType
    );
  }

  async getWalletAddress(): Promise<string> {
    const addr = await cofheService.getWalletAddress();
    return addr;
  }

  async getBalance(tokenAddress: string): Promise<string> {
    const ERC20_ABI = [
      "function balanceOf(address owner) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ];

    try {
      const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
      const contract = new Contract(tokenAddress, ERC20_ABI, provider);
      const walletAddress = await this.getWalletAddress();
      const [balance, decimals] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
      ]);

      return (await import("ethers")).ethers.formatUnits(balance, decimals);
    } catch (error) {
      console.error("Error fetching balance:", error);
      return "0";
    }
  }

  async getTokenInfo(
    tokenAddress: string
  ): Promise<{ symbol: string; decimals: number }> {
    const ERC20_ABI = [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ];

    try {
      const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
      const contract = new Contract(tokenAddress, ERC20_ABI, provider);
      const [symbol, decimals] = await Promise.all([
        contract.symbol(),
        contract.decimals(),
      ]);

      return { symbol, decimals };
    } catch (error) {
      console.error("Error fetching token info:", error);
      return { symbol: "UNKNOWN", decimals: 18 };
    }
  }

  isBrowserEnvironment(): boolean {
    return cofheService.isBrowserEnvironment();
  }
}

// Export singleton instance
export const orderService = new OrderService();
