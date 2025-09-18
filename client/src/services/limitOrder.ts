import { ethers, MaxUint256 } from "ethers";
import { cofheService } from "./cofheService";
import {
  OrderStatus,
  OrderType,
  HOOK_ADDRESS,
  PROVIDER_RPC_URL,
  PRIVATE_KEY,
} from "../utils/constants";
import { JsonRpcProvider } from "ethers";
import { Wallet } from "ethers";
import SusanooABI from "../utils/abi.json";
import { Contract } from "ethers";

export interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface Order {
  orderId: string;
  trader: string;
  zeroForOne: boolean;
  status: OrderStatus;
  orderType: boolean; // true = TakeProfit, false = StopLoss
  triggerTick: number;
  amount: bigint;
  poolId: string;
  transactionHash?: string;
  blockNumber?: number;
  timestamp?: number;
}

export interface EncryptedOrderData {
  encryptedTriggerTick: any;
  encryptedOrderType: any;
}

export interface OrderCreationParams {
  poolKey: PoolKey;
  zeroForOne: boolean;
  triggerTick: number;
  orderType: OrderType;
  amount: bigint;
}

export interface OrderEditParams {
  orderId: string;
  poolKey: PoolKey;
  newTriggerTick?: number;
  amountDelta?: bigint; // positive to add, negative to remove
}

export class LimitOrder {
  private provider;
  private contractAddress: string;

  // Susanoo contract ABI (essential functions only)
  private static readonly ABI = SusanooABI.abi;

  constructor(contractAddress: string = HOOK_ADDRESS) {
    this.provider = cofheService.getProvider();
    this.contractAddress = contractAddress;
  }

  /**
   * Initialize cofhejs for FHE operations
   */
  async initialize(): Promise<void> {
    await cofheService.initialize();
  }

  getContractWithoutSigner() {
    return new ethers.Contract(
      this.contractAddress,
      LimitOrder.ABI,
      this.provider
    );
  }

  getContract() {
    const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
    const signer = new Wallet(PRIVATE_KEY, provider);
    return new ethers.Contract(this.contractAddress, LimitOrder.ABI, signer);
  }
  /**
   * Create a new limit order with encrypted trigger tick and order type
   */
  async createOrder(params: OrderCreationParams): Promise<string> {
    try {
      await this.initialize();

      // Encrypt order parameters using cofhejs
      const encryptedData = await cofheService.encryptOrderData(
        params.triggerTick,
        params.orderType === OrderType.TakeProfit
      );

      await this.approveToken(
        params.zeroForOne ? params.poolKey.currency0 : params.poolKey.currency1
      );

      if (
        !encryptedData ||
        !encryptedData.data ||
        encryptedData.data.length < 2
      ) {
        throw new Error("Failed to encrypt order data");
      }

      console.log(
        encryptedData.data,
        params.poolKey,
        params.zeroForOne,
        params.amount
      );

      // Execute transaction
      const tx = await this.getContract().placeOrder(
        params.poolKey,
        params.zeroForOne,
        encryptedData.data[0], // encrypted trigger tick
        encryptedData.data[1], // encrypted order type
        params.amount,
        { gasLimit: 30000000 }
      );

      const receipt = await tx.wait();

      // Extract order ID from logs
      const orderPlacedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed =
            this.getContractWithoutSigner().interface.parseLog(log);
          return parsed?.name === "OrderPlaced";
        } catch {
          return false;
        }
      });

      if (orderPlacedEvent) {
        const parsed =
          this.getContractWithoutSigner().interface.parseLog(orderPlacedEvent);
        if (parsed) {
          return parsed.args.orderId.toString();
        }
      }

      throw new Error("Order creation failed - no OrderPlaced event found");
    } catch (error) {
      console.log("Error creating order:", error);
      throw error;
    }
  }

  /**
   * Edit an existing order
   */
  async editOrder(params: OrderEditParams): Promise<string> {
    try {
      await this.initialize();

      if (!params.newTriggerTick) {
        throw new Error("New trigger tick is required for order editing");
      }

      // Encrypt new trigger tick
      const encryptedData = await cofheService.encryptOrderData(
        params.newTriggerTick,
        true
      );

      if (
        !encryptedData ||
        !encryptedData.data ||
        encryptedData.data.length < 1
      ) {
        throw new Error("Failed to encrypt trigger tick");
      }

      // Execute transaction
      const tx = await this.getContract().editOrder(
        params.poolKey,
        params.orderId,
        encryptedData.data[0],
        params.amountDelta || 0,
        { gasLimit: 30000000 }
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error("Error editing order:", error);
      throw error;
    }
  }

  /**
   * Get order details by ID (public data only)
   */
  async getOrder(orderId: string): Promise<Partial<Order>> {
    try {
      const orderData = await this.getContractWithoutSigner().orders(orderId);

      return {
        orderId,
        trader: orderData.trader,
        zeroForOne: orderData.zeroForOne,
        status: orderData.status,
        amount: orderData.amount,
        poolId: orderData.keyId,
        // Note: triggerTick and orderType are encrypted and not directly readable
      };
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  }

  /**
   * Get historical orders for a specific trader
   */
  async getHistoricalOrders(
    traderAddress?: string,
    fromBlock: number = 0,
    toBlock: number | string = "latest"
  ): Promise<Order[]> {
    try {
      const filter = this.getContractWithoutSigner().filters.OrderPlaced(
        null, // orderId
        traderAddress || null // trader (null means all traders)
      );

      const events = await this.getContractWithoutSigner().queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      const orders: Order[] = [];

      for (const event of events) {
        if ("args" in event && event.args) {
          const args = event.args;
          orders.push({
            orderId: args.orderId.toString(),
            trader: args.trader,
            zeroForOne: args.zeroForOne,
            status: OrderStatus.Placed, // Initially placed
            orderType: args.orderType, // This is encrypted in reality
            triggerTick: Number(args.triggerTick), // This is encrypted in reality
            amount: args.amount,
            poolId: args.keyId,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: (await event.getBlock())?.timestamp,
          });
        }
      }

      return orders;
    } catch (error) {
      console.error("Error fetching historical orders:", error);
      throw error;
    }
  }

  /**
   * Get order execution history
   */
  async getExecutionHistory(
    traderAddress?: string,
    fromBlock: number = 0,
    toBlock: number | string = "latest"
  ): Promise<any[]> {
    try {
      const filter = this.getContractWithoutSigner().filters.OrderExecuted(
        null, // orderId
        traderAddress || null // trader
      );

      const events = await this.getContractWithoutSigner().queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      const executions = [];

      for (const event of events) {
        if ("args" in event && event.args) {
          const args = event.args;
          executions.push({
            orderId: args.orderId.toString(),
            trader: args.trader,
            executedTick: args.executedTick,
            poolId: args.keyId,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: (await event.getBlock())?.timestamp,
          });
        }
      }

      return executions;
    } catch (error) {
      console.error("Error fetching execution history:", error);
      throw error;
    }
  }

  /**
   * Get order cancellation history
   */
  async getCancellationHistory(
    traderAddress?: string,
    fromBlock: number = 0,
    toBlock: number | string = "latest"
  ): Promise<any[]> {
    try {
      const filter = this.getContractWithoutSigner().filters.OrderCancelled(
        null, // orderId
        traderAddress || null // trader
      );

      const events = await this.getContractWithoutSigner().queryFilter(
        filter,
        fromBlock,
        toBlock
      );

      const cancellations = [];

      for (const event of events) {
        if ("args" in event && event.args) {
          const args = event.args;
          cancellations.push({
            orderId: args.orderId.toString(),
            trader: args.trader,
            poolId: args.keyId,
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: (await event.getBlock())?.timestamp,
          });
        }
      }

      return cancellations;
    } catch (error) {
      console.error("Error fetching cancellation history:", error);
      throw error;
    }
  }

  /**
   * Get the current decryption queue length for a pool
   */
  async getQueueLength(poolKey: PoolKey): Promise<number> {
    try {
      const length = await this.getContractWithoutSigner().getQueueLength(
        poolKey
      );
      return Number(length);
    } catch (error) {
      console.error("Error fetching queue length:", error);
      throw error;
    }
  }

  /**
   * Get next available order ID
   */
  async getNextOrderId(): Promise<string> {
    try {
      const nextId = await this.getContractWithoutSigner().nextOrderId();
      return nextId.toString();
    } catch (error) {
      console.error("Error fetching next order ID:", error);
      throw error;
    }
  }

  async approveToken(tokenAddress: string) {
    const ERC20_ABI = [
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
      "function approve(address spender, uint256 value) returns (bool)",
    ];

    try {
      const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
      const signer = new Wallet(PRIVATE_KEY, provider);
      const contract = new Contract(tokenAddress, ERC20_ABI, signer);
      const approveTx = await contract.approve(HOOK_ADDRESS, MaxUint256);

      const receipt = await approveTx.wait();
      console.log("Successfully gave approval");
    } catch (error) {
      console.error("Error fetching token info:", error);
      return { symbol: "UNKNOWN", decimals: 18 };
    }
  }

  /**
   * Unseal encrypted order data (if user has permission)
   */
  async unsealOrderData(
    encryptedTriggerTick: any,
    encryptedOrderType: any
  ): Promise<{ triggerTick: number; orderType: boolean } | null> {
    try {
      const result = await cofheService.unsealOrderData(
        encryptedTriggerTick,
        encryptedOrderType
      );

      return result;
    } catch (error) {
      console.error("Error unsealing order data:", error);
      return null;
    }
  }

  /**
   * Create a permit for accessing encrypted data
   */
  async createPermit(): Promise<any> {
    try {
      const permit = await cofheService.createPermit();
      return permit;
    } catch (error) {
      console.error("Error creating permit:", error);
      throw error;
    }
  }
}
