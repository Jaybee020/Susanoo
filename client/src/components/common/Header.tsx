import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { orderService } from "../../services/orderService";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  const location = useLocation();
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadWalletAddress();
  }, []);

  const loadWalletAddress = async () => {
    try {
      const address = await orderService.getWalletAddress();
      setWalletAddress(address);
    } catch (error) {
      console.error("Failed to load wallet address:", error);
    }
  };

  const handleConnectWallet = async () => {
    if (!orderService.isBrowserEnvironment()) {
      alert(
        "Wallet connection only available in browser with MetaMask installed"
      );
      return;
    }

    setIsConnecting(true);
    try {
      await orderService.connectWallet();
      await loadWalletAddress();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert(
        "Failed to connect wallet. Please make sure MetaMask is installed and unlocked."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>
              <img
                src="/logo.svg"
                alt="Susanoo"
                style={{ width: "24px", height: "24px" }}
              />
            </span>
            <span className={styles.logoText}>Susanoo</span>
          </Link>

          <nav className={styles.nav}>
            <Link
              to="/"
              className={`${styles.navLink} ${
                location.pathname === "/" ? styles.active : ""
              }`}
            >
              Trade
            </Link>
            <Link
              to="/create"
              className={`${styles.navLink} ${
                location.pathname === "/create" ? styles.active : ""
              }`}
            >
              Create Order
            </Link>
          </nav>

          <div className={styles.rightSection}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                placeholder="Q Search markets..."
                className={styles.searchInput}
                disabled
              />
            </div>
            <div className={styles.iconButton}>
              <span>🌙</span>
            </div>
            <div className={styles.iconButton}>
              <span>🔄</span>
            </div>
            <div className={styles.iconButton}>
              <span>🔔</span>
            </div>
            {walletAddress ? (
              <div className={styles.walletInfo}>
                <span className={styles.walletAddress}>
                  {formatAddress(walletAddress)}
                </span>
              </div>
            ) : (
              <button
                onClick={handleConnectWallet}
                disabled={isConnecting}
                className={styles.connectButton}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
