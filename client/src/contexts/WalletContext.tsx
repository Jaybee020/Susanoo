import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { ethers } from "ethers";

interface WalletContextType {
  address: string;
  signer: ethers.JsonRpcSigner | null;
  provider: ethers.BrowserProvider | null;
  isConnected: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState("");
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const isConnected = !!address;

  const handleAccountsChanged = useCallback(async (accounts: string[]) => {
    if (accounts.length === 0) {
      setAddress("");
      setSigner(null);
      setProvider(null);
      setChainId(null);
      return;
    }

    if (window.ethereum) {
      const bp = new ethers.BrowserProvider(window.ethereum);
      const s = await bp.getSigner();
      const network = await bp.getNetwork();
      setProvider(bp);
      setSigner(s);
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
    }
  }, []);

  const handleChainChanged = useCallback(() => {
    // Reload on chain change to reset all state cleanly
    window.location.reload();
  }, []);

  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;

    eth.on?.("accountsChanged", handleAccountsChanged);
    eth.on?.("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", handleAccountsChanged);
      eth.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    const accounts: string[] = await window.ethereum.request({ method: "eth_requestAccounts" });
    const bp = new ethers.BrowserProvider(window.ethereum);
    const s = await bp.getSigner();
    const network = await bp.getNetwork();

    setProvider(bp);
    setSigner(s);
    setAddress(accounts[0]);
    setChainId(Number(network.chainId));
  }, []);

  const disconnect = useCallback(() => {
    setAddress("");
    setSigner(null);
    setProvider(null);
    setChainId(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, signer, provider, isConnected, chainId, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};
