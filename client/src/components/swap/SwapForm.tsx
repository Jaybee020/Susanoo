import React, { useState, useEffect } from "react";
import { parseEther } from "ethers";
import PoolValidator from "../pools/PoolValidator";
import { PoolInfo } from "../../services/poolService";
import { executeSwap } from "../../services/swapService";
import { orderService } from "../../services/orderService";
import { useFlashMessage } from "../../contexts/FlashMessageContext";
import { useWallet } from "../../contexts/WalletContext";
import { DEFAULT_DEPLOYED_POOL_ID } from "../../utils/constants";
import styles from "./SwapForm.module.css";

const SwapForm: React.FC = () => {
  const [poolId, setPoolId] = useState(DEFAULT_DEPLOYED_POOL_ID);
  const [isPoolValid, setIsPoolValid] = useState(false);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [zeroForOne, setZeroForOne] = useState(true);
  const [amount, setAmount] = useState("");
  const [isSwapping, setIsSwapping] = useState(false);
  const [token0Balance, setToken0Balance] = useState("0");
  const [token1Balance, setToken1Balance] = useState("0");
  const { showSuccess, showError } = useFlashMessage();
  const { isConnected } = useWallet();

  useEffect(() => {
    if (poolInfo && isConnected) {
      loadBalances();
    }
  }, [poolInfo, isConnected]);

  const loadBalances = async () => {
    if (!poolInfo) return;
    try {
      const [bal0, bal1] = await Promise.all([
        orderService.getBalance(poolInfo.currency0),
        orderService.getBalance(poolInfo.currency1),
      ]);
      setToken0Balance(bal0);
      setToken1Balance(bal1);
    } catch (error) {
      console.error("Failed to load balances:", error);
    }
  };

  const handlePoolValidation = (valid: boolean, info?: PoolInfo) => {
    setIsPoolValid(valid);
    setPoolInfo(info || null);
  };

  const handleSwap = async () => {
    if (!poolInfo || !amount || !isConnected) return;

    setIsSwapping(true);
    try {
      const amountWei = parseEther(amount);
      const txHash = await executeSwap(
        {
          currency0: poolInfo.currency0,
          currency1: poolInfo.currency1,
          fee: poolInfo.fee,
          tickSpacing: poolInfo.tickSpacing,
          hooks: poolInfo.hooks,
        },
        zeroForOne,
        amountWei
      );
      showSuccess(`Swap executed! TX: ${txHash}`);
      setAmount("");
      loadBalances();
    } catch (error: any) {
      console.error("Swap failed:", error);
      showError(error?.message || "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className={styles.swapForm}>
      <div className={styles.formGroup}>
        <label className={styles.label}>Pool ID</label>
        <input
          type="text"
          className={styles.input}
          value={poolId}
          onChange={(e) => setPoolId(e.target.value)}
          placeholder="Enter pool ID (0x...)"
        />
        {poolId && (
          <PoolValidator
            poolId={poolId}
            onValidation={handlePoolValidation}
          />
        )}
      </div>

      {poolInfo && (
        <div className={styles.poolInfoBox}>
          <div className={styles.poolInfoRow}>
            <span className={styles.poolInfoLabel}>Current Tick</span>
            <span className={styles.poolInfoValue}>{poolInfo.tick}</span>
          </div>
          <div className={styles.poolInfoRow}>
            <span className={styles.poolInfoLabel}>Pair</span>
            <span className={styles.poolInfoValue}>
              {poolInfo.token0Symbol} / {poolInfo.token1Symbol}
            </span>
          </div>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>Direction</label>
        <div className={styles.directionToggle}>
          <button
            type="button"
            className={`${styles.directionBtn} ${zeroForOne ? styles.directionBtnActive : ""}`}
            onClick={() => setZeroForOne(true)}
          >
            Sell {poolInfo?.token0Symbol || "Token0"}
          </button>
          <button
            type="button"
            className={`${styles.directionBtn} ${!zeroForOne ? styles.directionBtnActive : ""}`}
            onClick={() => setZeroForOne(false)}
          >
            Buy {poolInfo?.token0Symbol || "Token0"}
          </button>
        </div>
      </div>

      {poolInfo && isConnected && (
        <div className={styles.balances}>
          <div className={styles.balanceItem}>
            <span className={styles.balanceLabel}>{poolInfo.token0Symbol}</span>
            <span className={styles.balanceValue}>{parseFloat(token0Balance).toFixed(4)}</span>
          </div>
          <div className={styles.balanceItem}>
            <span className={styles.balanceLabel}>{poolInfo.token1Symbol}</span>
            <span className={styles.balanceValue}>{parseFloat(token1Balance).toFixed(4)}</span>
          </div>
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>Amount</label>
        <input
          type="number"
          className={styles.input}
          placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="any"
        />
      </div>

      <button
        className={styles.submitBtn}
        onClick={handleSwap}
        disabled={!isPoolValid || !amount || isSwapping || !isConnected}
      >
        {!isConnected
          ? "Connect Wallet"
          : isSwapping
            ? "Swapping..."
            : "Swap"}
      </button>
    </div>
  );
};

export default SwapForm;
