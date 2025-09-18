import React, { useState, useEffect } from "react";
import { poolService, PoolInfo } from "../../services/poolService";
import styles from "./PoolValidator.module.css";
import { POOLKEY } from "../../utils/constants";

interface PoolValidatorProps {
  poolId: string;
  onValidation: (isValid: boolean, poolInfo?: PoolInfo) => void;
}

const PoolValidator: React.FC<PoolValidatorProps> = ({
  poolId,
  onValidation,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [error, setError] = useState<string>("");

  const HOOK_ADDRESS = POOLKEY.hooks;

  useEffect(() => {
    if (poolId) {
      validatePool();
    } else {
      setPoolInfo(null);
      setError("");
      onValidation(false);
    }
  }, [poolId]);

  const validatePool = async () => {
    setIsValidating(true);
    setError("");

    try {
      // Validate pool ID format first
      const isValidFormat = await poolService.validatePoolId(poolId);
      if (!isValidFormat) {
        setError("Invalid pool ID format. Must be a 32-byte hex string.");
        onValidation(false);
        return;
      }

      // Fetch actual pool info
      const fetchedPoolInfo = await poolService.getPoolInfo(poolId);

      // Check if pool uses the correct hook
      const isValidHook =
        fetchedPoolInfo.hooks.toLowerCase() === HOOK_ADDRESS.toLowerCase();

      setPoolInfo(fetchedPoolInfo);

      if (isValidHook) {
        onValidation(true, fetchedPoolInfo);
      } else {
        setError("Pool does not use the Susanoo hook contract");
        onValidation(false);
      }
    } catch (err) {
      setError("Failed to validate pool. Please check the pool ID.");
      onValidation(false);
    } finally {
      setIsValidating(false);
    }
  };

  if (!poolId) {
    return null;
  }

  return (
    <div className={styles.poolValidator}>
      {isValidating && (
        <div className={styles.validating}>
          <div className={styles.spinner}></div>
          <span>Validating pool...</span>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span>❌ {error}</span>
        </div>
      )}

      {poolInfo && !error && (
        <div className={styles.poolInfo}>
          <div className={styles.validationStatus}>
            <span className={styles.valid}>✅ Valid Susanoo pool</span>
          </div>

          <div className={styles.poolDetails}>
            <div className={styles.detail}>
              <span className={styles.label}>Pool ID:</span>
              <span className={styles.value}>
                {poolInfo.poolId.slice(0, 6)}...{poolInfo.poolId.slice(-4)}
              </span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Token Pair:</span>
              <span className={styles.value}>
                {poolInfo.token0Symbol}/{poolInfo.token1Symbol}
              </span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Fee Tier:</span>
              <span className={styles.value}>{poolInfo.fee / 10000}%</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Current Tick:</span>
              <span className={styles.value}>{String(poolInfo.tick)}</span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Liquidity:</span>
              <span className={styles.value}>
                {poolInfo.liquidity.toString()}
              </span>
            </div>
            <div className={styles.detail}>
              <span className={styles.label}>Hook:</span>
              <span className={styles.value}>
                {poolInfo.hooks.slice(0, 6)}...{poolInfo.hooks.slice(-4)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoolValidator;
