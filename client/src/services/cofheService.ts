import { ethers } from "ethers";
import { cofhejs, Encryptable, FheTypes } from "cofhejs/web";
import { PRIVATE_KEY, PROVIDER_RPC_URL } from "../utils/constants";
import { Wallet } from "ethers";
import { JsonRpcProvider } from "ethers";

class CofheService {
  private provider: ethers.BrowserProvider | ethers.JsonRpcProvider;

  constructor() {
    this.provider = new JsonRpcProvider(PROVIDER_RPC_URL);
  }

  async getSigner() {
    const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
    const signer = new Wallet(PRIVATE_KEY, provider);
    return signer;
  }

  async initialize(): Promise<void> {
    // if (this.isInitialized) return;

    try {
      const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
      const signer = new Wallet(PRIVATE_KEY, provider);
      await cofhejs.initializeWithEthers({
        ethersProvider: this.provider,
        ethersSigner: signer,
        environment: "TESTNET",
      });

      // this.isInitialized = true;
      console.log("FhenixJS initialized successfully");
    } catch (error) {
      console.error("Failed to initialize FhenixJS:", error);
      throw new Error("FhenixJS initialization failed");
    }
  }

  async createPermit() {
    const signer = await this.getSigner();
    const signerAddr = await signer.getAddress();
    await this.ensureInitialized();

    try {
      await cofhejs.createPermit({
        type: "self",
        issuer: signerAddr,
      });
      const permission = cofhejs.getPermit();
      console.log("Got permission", permission);
      return permission;
    } catch (error) {
      console.error("Failed to create permit:", error);
      throw new Error("Permit creation failed");
    }
  }

  async encryptData(data: any[]): Promise<any> {
    await this.ensureInitialized();

    try {
      const encryptedData = await cofhejs.encrypt(data);
      return encryptedData;
    } catch (error) {
      console.log("Failed to encrypt data:", error);
      throw new Error("Data encryption failed");
    }
  }

  async unsealData(sealedData: any, expectedType: FheTypes): Promise<any> {
    await this.ensureInitialized();

    try {
      const permit = await this.createPermit();

      console.log("permit for unsealing", permit);
      console.log(sealedData);

      const unsealed = await cofhejs.unseal(
        sealedData,
        expectedType,
        permit.data?.issuer,
        permit.data?.getHash()
      );
      console.log("unsealed", unsealed, expectedType);
      return unsealed;
    } catch (error) {
      console.log("Failed to unseal data:", error);
      throw new Error("Data unsealing failed");
    }
  }

  async encryptOrderData(
    triggerTick: number,
    orderType: boolean
  ): Promise<any> {
    await this.ensureInitialized();

    try {
      // Convert tick to uint32 by adding offset (handle negative ticks)
      const TICK_OFFSET = 887272;
      const tickWithOffset = triggerTick + TICK_OFFSET;

      const encryptedData = await this.encryptData([
        Encryptable.uint32(BigInt(tickWithOffset)),
        Encryptable.bool(orderType),
      ]);

      return encryptedData;
    } catch (error) {
      console.log("Failed to encrypt order data:", error);
      // throw new Error("Order data encryption failed");
    }
  }

  async unsealOrderData(
    encryptedTriggerTick: any,
    encryptedOrderType: any
  ): Promise<{ triggerTick: number; orderType: boolean } | null> {
    await this.ensureInitialized();

    try {
      const TICK_OFFSET = 887272;
      console.log(encryptedTriggerTick, encryptedOrderType);

      const [unsealedTriggerTick, unsealedOrderType] = await Promise.all([
        this.unsealData(encryptedTriggerTick, FheTypes.Uint32),
        this.unsealData(encryptedOrderType, FheTypes.Bool),
      ]);

      console.log(unsealedOrderType, unsealedTriggerTick);

      if (unsealedTriggerTick !== null && unsealedOrderType !== null) {
        return {
          triggerTick: Number(unsealedTriggerTick) - TICK_OFFSET,
          orderType: unsealedOrderType as boolean,
        };
      }

      return null;
    } catch (error) {
      console.log("Failed to unseal order data:", error);
      return null;
    }
  }

  getProvider() {
    return this.provider;
  }

  async getWalletAddress(): Promise<string> {
    const signer = await this.getSigner();
    return await signer.getAddress();
  }

  private async ensureInitialized(): Promise<void> {
    await this.initialize();
  }

  // Check if we're in a browser environment
  isBrowserEnvironment(): boolean {
    return typeof window !== "undefined" && !!window.ethereum;
  }

  // Connect to MetaMask or other browser wallet
  async connectWallet(): Promise<void> {
    if (!this.isBrowserEnvironment()) {
      throw new Error("Wallet connection only available in browser");
    }

    try {
      // Request account access
      if (!window.ethereum) {
        throw new Error("MetaMask not installed");
      }
      await window.ethereum.request({ method: "eth_requestAccounts" });

      // Reinitialize with connected wallet
      this.provider = new ethers.BrowserProvider(window.ethereum);
      // this.isInitialized = false; // Reset to reinitialize with new signer

      await this.initialize();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw new Error("Wallet connection failed");
    }
  }
}

// Export singleton instance
export const cofheService = new CofheService();
