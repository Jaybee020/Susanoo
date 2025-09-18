import { cofhejs } from "cofhejs/node";
import { JsonRpcProvider, Wallet } from "ethers";

export const PRIVATE_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
export const HOOK_ADDRESS = "0x303C5560eb3229fe2b73f920513aDAAaba1a90c0";
export const PROVIDER_RPC_URL = "http://127.0.0.1:8545";

// initialize your web3 provider
const provider = new JsonRpcProvider(PROVIDER_RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);

// initialize cofhejs Client with ethers (it also supports viem)

async function initCofheJs() {
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: wallet,
    environment: "TESTNET",
  });
}
