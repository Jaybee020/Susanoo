import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "../../contexts/WalletContext";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  const location = useLocation();
  const { address, isConnected, connect } = useWallet();
  const [isConnecting, setIsConnecting] = React.useState(false);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert(
        "Failed to connect wallet. Please make sure MetaMask is installed and unlocked."
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
              to="/swap"
              className={`${styles.navLink} ${
                location.pathname === "/swap" ? styles.active : ""
              }`}
            >
              Swap
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
            {isConnected ? (
              <div className={styles.walletInfo}>
                <span className={styles.walletAddress}>
                  {formatAddress(address)}
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
