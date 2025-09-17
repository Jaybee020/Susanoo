import { cofhejs } from "cofhejs/node";
import { JsonRpcProvider, Wallet } from "ethers";

export const PRIVATE_KEY = "";
export const HOOK_ADDRESS = "";
export const PROVIDER_RPC_URL = "";

// initialize your web3 provider
const provider = new JsonRpcProvider("http://127.0.0.1:42069");
const wallet = new Wallet(PRIVATE_KEY, provider);

// initialize cofhejs Client with ethers (it also supports viem)

async function initCofheJs() {
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: wallet,
    environment: "TESTNET",
  });
}
