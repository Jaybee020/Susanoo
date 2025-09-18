import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import styles from "./TokenBalance.module.css";
import { PROVIDER_RPC_URL } from "../../utils/constants";

interface TokenBalanceProps {
  tokenAddress: string;
  walletAddress: string;
  symbol?: string;
  decimals?: number;
}

const TokenBalance: React.FC<TokenBalanceProps> = ({
  tokenAddress,
  walletAddress,
  symbol = "TOKEN",
  decimals = 18,
}) => {
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
  ];

  useEffect(() => {
    if (
      tokenAddress &&
      walletAddress &&
      ethers.isAddress(tokenAddress) &&
      ethers.isAddress(walletAddress)
    ) {
      fetchBalance();
    }
  }, [tokenAddress, walletAddress]);

  const fetchBalance = async () => {
    setIsLoading(true);
    setError("");

    try {
      const provider = new ethers.JsonRpcProvider(PROVIDER_RPC_URL);
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

      const balanceWei = await contract.balanceOf(walletAddress);
      const formattedBalance = ethers.formatUnits(balanceWei, decimals);

      // Format to show reasonable number of decimals
      const balanceNumber = parseFloat(formattedBalance);
      setBalance(balanceNumber.toFixed(6));
    } catch (err) {
      setError("Failed to fetch balance");
      setBalance("0");
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenAddress || !walletAddress) {
    return null;
  }

  return (
    <div className={styles.tokenBalance}>
      <div className={styles.label}>Balance:</div>
      <div className={styles.balance}>
        {isLoading ? (
          <span className={styles.loading}>Loading...</span>
        ) : error ? (
          <span className={styles.error}>Error</span>
        ) : (
          <span>
            {balance} {symbol}
          </span>
        )}
      </div>
    </div>
  );
};

export default TokenBalance;
