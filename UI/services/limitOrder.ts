import { ethers } from "ethers";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/node";
import { Provider } from "ethers";

export enum OrderStatus {
  Placed = 0,
  Executed = 1,
  Cancelled = 2,
}

export enum OrderType {
  TakeProfit = 1,
  StopLoss = 0,
}

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
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contract: ethers.Contract;

  // Susanoo contract ABI (essential functions only)
  private static readonly ABI = [
    "function placeOrder(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, bool zeroForOne, tuple(uint256 securityZone, bytes ciphertext) inTriggerTick, tuple(uint256 securityZone, bytes ciphertext) inOrderType, uint256 amount) external returns (uint256)",
    "function editOrder(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 orderId, tuple(uint256 securityZone, bytes ciphertext) inNewTriggerTick, int256 amountDelta) external",
    "function orders(uint256) external view returns (address trader, bool zeroForOne, uint8 status, uint256 orderType, uint256 triggerTick, uint256 amount, bytes32 keyId)",
    "function nextOrderId() external view returns (uint256)",
    "function getQueueLength(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key) external view returns (uint256)",
    "event OrderPlaced(uint256 orderId, address indexed trader, uint256 triggerTick, bool zeroForOne, uint256 orderType, uint256 amount, bytes32 indexed keyId)",
    "event OrderEdited(uint256 orderId, address indexed trader, uint256 newTriggerTick, uint256 newAmount, bytes32 indexed keyId)",
    "event OrderExecuted(uint256 orderId, address indexed trader, int24 executedTick, bytes32 indexed keyId)",
    "event OrderCancelled(uint256 orderId, address indexed trader, bytes32 indexed keyId)",
  ];

  // Tick offset constant from Susanoo contract
  private static readonly TICK_OFFSET = 887272;

  constructor(
    provider: ethers.Provider,
    signer: ethers.Signer,
    contractAddress: string
  ) {
    this.provider = provider;
    this.signer = signer;
    this.contract = new ethers.Contract(
      contractAddress,
      LimitOrder.ABI,
      signer
    );
  }

  /**
   * Initialize cofhejs for FHE operations
   */
  async initialize(
    environment: "LOCAL" | "TESTNET" | "MAINNET" = "TESTNET"
  ): Promise<void> {
    await cofhejs.initializeWithEthers({
      ethersProvider: this.provider,
      ethersSigner: this.signer,
      environment,
    });
  }

  /**
   * Create a new limit order with encrypted trigger tick and order type
   */
  async createOrder(params: OrderCreationParams): Promise<string> {
    try {
      // Convert tick to uint32 by adding offset (handle negative ticks)
      const tickWithOffset = params.triggerTick + LimitOrder.TICK_OFFSET;

      // Encrypt order parameters
      const encryptedData = await cofhejs.encrypt([
        Encryptable.uint32(BigInt(tickWithOffset)),
        Encryptable.bool(params.orderType === OrderType.TakeProfit),
      ]);

      if (!encryptedData.data) {
        throw new Error("Failed to encrypt order data");
      }

      // Execute transaction
      const tx = await this.contract.placeOrder(
        params.poolKey,
        params.zeroForOne,
        encryptedData.data[0], // encrypted trigger tick
        encryptedData.data[1], // encrypted order type
        params.amount
      );

      const receipt = await tx.wait();

      // Extract order ID from logs
      const orderPlacedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === "OrderPlaced";
        } catch {
          return false;
        }
      });

      if (orderPlacedEvent) {
        const parsed = this.contract.interface.parseLog(orderPlacedEvent);
        if (parsed) {
          return parsed.args.orderId.toString();
        }
      }

      throw new Error("Order creation failed - no OrderPlaced event found");
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  /**
   * Edit an existing order
   */
  async editOrder(params: OrderEditParams): Promise<string> {
    try {
      const newTickWithOffset = params.newTriggerTick
        ? params.newTriggerTick + LimitOrder.TICK_OFFSET
        : 0; // If not provided, use 0 (contract will handle)

      // Encrypt new trigger tick
      const encryptedTriggerTick = await cofhejs.encrypt([
        Encryptable.uint32(BigInt(newTickWithOffset)),
      ]);

      if (!encryptedTriggerTick.data) {
        throw new Error("Failed to encrypt trigger tick");
      }

      // Execute transaction
      const tx = await this.contract.editOrder(
        params.poolKey,
        params.orderId,
        encryptedTriggerTick.data[0],
        params.amountDelta || 0
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
      const orderData = await this.contract.orders(orderId);

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
      const filter = this.contract.filters.OrderPlaced(
        null, // orderId
        traderAddress || null // trader (null means all traders)
      );

      const events = await this.contract.queryFilter(
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
      const filter = this.contract.filters.OrderExecuted(
        null, // orderId
        traderAddress || null // trader
      );

      const events = await this.contract.queryFilter(
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
      const filter = this.contract.filters.OrderCancelled(
        null, // orderId
        traderAddress || null // trader
      );

      const events = await this.contract.queryFilter(
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
      const length = await this.contract.getQueueLength(poolKey);
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
      const nextId = await this.contract.nextOrderId();
      return nextId.toString();
    } catch (error) {
      console.error("Error fetching next order ID:", error);
      throw error;
    }
  }

  /**
   * Utility function to create permits for unsealing encrypted data
   */
  async createPermit(): Promise<any> {
    try {
      const userAddress = await this.signer.getAddress();
      const permit = await cofhejs.createPermit({
        type: "self",
        issuer: userAddress,
      });
      return permit;
    } catch (error) {
      console.error("Error creating permit:", error);
      throw error;
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
      const permit = await this.createPermit();

      const [unsealedTriggerTick, unsealedOrderType] = await Promise.all([
        cofhejs.unseal(
          encryptedTriggerTick,
          FheTypes.Uint32,
          permit.data.issuer,
          permit.data.getHash()
        ),
        cofhejs.unseal(
          encryptedOrderType,
          FheTypes.Bool,
          permit.data.issuer,
          permit.data.getHash()
        ),
      ]);

      if (unsealedTriggerTick.success && unsealedOrderType.success) {
        return {
          triggerTick:
            Number(unsealedTriggerTick.data) - LimitOrder.TICK_OFFSET,
          orderType: unsealedOrderType.data as boolean,
        };
      }

      return null;
    } catch (error) {
      console.error("Error unsealing order data:", error);
      return null;
    }
  }
}
