import {
  type WalletClient,
  type PublicClient,
  type Address,
  parseEther,
  formatEther,
} from "viem";
import { erc20Abi } from "../abis/erc20.js";
import { getConfig } from "../config.js";

export async function fundBotWallets(
  masterWallet: WalletClient,
  publicClient: PublicClient,
  botWallets: WalletClient[],
  token0: Address,
  token1: Address
) {
  const config = getConfig();
  const minBalance = parseEther(config.BOT_MIN_BALANCE);
  const fundAmount = parseEther(config.BOT_FUND_AMOUNT);
  const masterAddress = masterWallet.account!.address;

  console.log(`[Bot:Funder] Checking balances for ${botWallets.length} wallet(s)...`);

  for (const wallet of botWallets) {
    const botAddress = wallet.account!.address;
    const shortAddr = botAddress.slice(0, 8) + "...";

    for (const token of [token0, token1]) {
      const balance = await publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [botAddress],
      });

      if (balance < minBalance) {
        // Check master has enough
        const masterBalance = await publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [masterAddress],
        });

        if (masterBalance < fundAmount) {
          console.warn(
            `[Bot:Funder] Master wallet low on ${token.slice(0, 8)}... (${formatEther(masterBalance)}), skipping fund for ${shortAddr}`
          );
          continue;
        }

        console.log(
          `[Bot:Funder] Funding ${shortAddr} with ${formatEther(fundAmount)} of ${token.slice(0, 8)}...`
        );

        const hash = await masterWallet.writeContract({
          address: token,
          abi: erc20Abi,
          functionName: "transfer",
          args: [botAddress, fundAmount],
          chain: masterWallet.chain,
          account: masterWallet.account!,
        });

        await publicClient.waitForTransactionReceipt({ hash });
        console.log(`[Bot:Funder] Funded ${shortAddr} (tx: ${hash.slice(0, 10)}...)`);
      }
    }
  }

  console.log("[Bot:Funder] Funding check complete");
}
