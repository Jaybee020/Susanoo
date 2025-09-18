import React, { useState } from "react";
import { useForm } from "react-hook-form";
import PoolValidator from "../pools/PoolValidator";
import { PoolInfo } from "../../services/poolService";
import TokenBalance from "../common/TokenBalance";
import LoadingSpinner from "../common/LoadingSpinner";
import {
  PERCENTAGE_OPTIONS,
  OrderType,
  DEFAULT_DEPLOYED_POOL_ID,
} from "../../utils/constants";
import { calculateTargetTick } from "../../utils/priceConversion";
import { orderService } from "../../services/orderService";
import { poolService } from "../../services/poolService";
import styles from "./CreateOrder.module.css";
import { parseEther } from "ethers";
import { useFlashMessage } from "../../contexts/FlashMessageContext";

interface CreateOrderFormData {
  poolId: string;
  amount: string;
  orderType: "takeProfit" | "stopLoss";
  percentage: number;
  customPercentage?: number;
}

interface CreateOrderProps {
  onOrderCreate?: (orderData: any) => void;
}

const CreateOrder: React.FC<CreateOrderProps> = ({ onOrderCreate }) => {
  const [isPoolValid, setIsPoolValid] = useState(false);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const { showSuccess, showError } = useFlashMessage();

  React.useEffect(() => {
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateOrderFormData>();

  const watchedFields = watch();
  const orderType = watchedFields.orderType;
  const percentage = watchedFields.percentage;

  const handlePoolValidation = (isValid: boolean, info?: PoolInfo) => {
    setIsPoolValid(isValid);
    setPoolInfo(info || null);
  };

  const onSubmit = async (data: CreateOrderFormData) => {
    if (!isPoolValid || !poolInfo) {
      return;
    }

    setIsCreatingOrder(true);

    try {
      const finalPercentage =
        data.percentage === 0 ? data.customPercentage || 0 : data.percentage;

      // Use actual current tick from pool info
      const currentTick = poolInfo.tick;
      const targetTick = calculateTargetTick(
        Number(currentTick),
        finalPercentage,
        data.orderType === "takeProfit"
      );

      const orderData = {
        poolKey: {
          currency0: poolInfo.currency0,
          currency1: poolInfo.currency1,
          fee: poolInfo.fee,
          tickSpacing: poolInfo.tickSpacing,
          hooks: poolInfo.hooks,
        },
        zeroForOne: false, // Always false as specified
        triggerTick: targetTick,
        orderType:
          data.orderType === "takeProfit"
            ? OrderType.TakeProfit
            : OrderType.StopLoss,
        amount: parseEther(data.amount), // Convert to wei token decimal is 18
      };

      // Create order using the order service with real cofhejs
      const orderId = await orderService.createOrder(orderData);
      console.log("Order created with ID:", orderId);

      if (onOrderCreate) {
        onOrderCreate({ ...orderData, orderId });
      }

      showSuccess(`Order created successfully! Order ID: ${orderId}`);
    } catch (error) {
      console.error("Error creating order:", error);
      showError("Failed to create order: " + (error as Error).message);
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const getPercentageOptions = () => {
    return orderType === "takeProfit"
      ? PERCENTAGE_OPTIONS.takeProfit
      : PERCENTAGE_OPTIONS.stopLoss;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={styles.createOrderForm}>
      {/* Pool ID Input */}
      <div className={styles.formGroup}>
        <label htmlFor="poolId" className={styles.label}>
          Pool ID
        </label>
        <input
          id="poolId"
          type="text"
          placeholder={`0x... (default: ${DEFAULT_DEPLOYED_POOL_ID.slice(
            0,
            6
          )}...)`}
          className={styles.input}
          {...register("poolId", {
            required: "Pool ID is required",
            pattern: {
              value: /^0x[a-fA-F0-9]{64}$/,
              message: "Invalid pool ID format. Must be a 32-byte hex string.",
            },
          })}
        />
        <button
          type="button"
          onClick={() => setValue("poolId", DEFAULT_DEPLOYED_POOL_ID)}
          className={styles.defaultButton}
        >
          Use Default Pool
        </button>
        {errors.poolId && (
          <span className={styles.error}>{errors.poolId.message}</span>
        )}

        {watchedFields.poolId && (
          <PoolValidator
            poolId={watchedFields.poolId}
            onValidation={handlePoolValidation}
          />
        )}
      </div>

      {/* Token Balances - only show if pool is valid */}
      {isPoolValid && poolInfo && walletAddress && (
        <div className={styles.balances}>
          <h3>Pool Information & Your Balances</h3>
          <div className={styles.poolInfoGrid}>
            <div className={styles.poolInfoItem}>
              <span className={styles.infoLabel}>Current Price:</span>
              <span className={styles.infoValue}>
                {parseFloat(
                  poolService
                    .calculatePrice(
                      BigInt(poolInfo.sqrtPriceX96),
                      poolInfo.token0Decimals,
                      poolInfo.token1Decimals
                    )
                    .toString()
                ).toFixed(6)}{" "}
                {poolInfo.token1Symbol}/{poolInfo.token0Symbol}
              </span>
            </div>
            <div className={styles.poolInfoItem}>
              <span className={styles.infoLabel}>Current Tick:</span>
              <span className={styles.infoValue}>{String(poolInfo.tick)}</span>
            </div>
          </div>
          <div className={styles.balanceGrid}>
            <TokenBalance
              tokenAddress={poolInfo.currency0}
              walletAddress={walletAddress}
              symbol={poolInfo.token0Symbol}
            />
            <TokenBalance
              tokenAddress={poolInfo.currency1}
              walletAddress={walletAddress}
              symbol={poolInfo.token1Symbol}
            />
          </div>
        </div>
      )}

      {/* Order Type Selection */}
      <div className={styles.formGroup}>
        <label className={styles.label}>Order Type</label>
        <div className={styles.radioGroup}>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="takeProfit"
              {...register("orderType", {
                required: "Please select an order type",
              })}
            />
            <span>Take Profit</span>
          </label>
          <label className={styles.radioLabel}>
            <input
              type="radio"
              value="stopLoss"
              {...register("orderType", {
                required: "Please select an order type",
              })}
            />
            <span>Stop Loss</span>
          </label>
        </div>
        {errors.orderType && (
          <span className={styles.error}>{errors.orderType.message}</span>
        )}
      </div>

      {/* Percentage Selection */}
      {orderType && (
        <div className={styles.formGroup}>
          <label className={styles.label}>
            {orderType === "takeProfit" ? "Take Profit at" : "Stop Loss at"}
          </label>
          <div className={styles.percentageGrid}>
            {getPercentageOptions().map((pct) => (
              <label key={pct} className={styles.percentageLabel}>
                <input
                  type="radio"
                  value={pct}
                  {...register("percentage", {
                    required: "Please select a percentage",
                  })}
                />
                <span>{pct}%</span>
              </label>
            ))}
            <label className={styles.percentageLabel}>
              <input type="radio" value={0} {...register("percentage")} />
              <span>Custom</span>
            </label>
          </div>

          {percentage === 0 && (
            <input
              type="number"
              placeholder="Enter custom percentage"
              className={styles.input}
              min="0.1"
              max="100"
              step="0.1"
              {...register("customPercentage", {
                required:
                  percentage === 0 ? "Custom percentage is required" : false,
                min: { value: 0.1, message: "Minimum 0.1%" },
                max: { value: 100, message: "Maximum 100%" },
              })}
            />
          )}
          {errors.percentage && (
            <span className={styles.error}>{errors.percentage.message}</span>
          )}
          {errors.customPercentage && (
            <span className={styles.error}>
              {errors.customPercentage.message}
            </span>
          )}
        </div>
      )}

      {/* Amount Input */}
      <div className={styles.formGroup}>
        <label htmlFor="amount" className={styles.label}>
          Amount
        </label>
        <input
          id="amount"
          type="number"
          placeholder="0.0"
          step="0.000001"
          min="0"
          className={styles.input}
          {...register("amount", {
            required: "Amount is required",
            min: { value: 0.000001, message: "Amount must be greater than 0" },
          })}
        />
        {errors.amount && (
          <span className={styles.error}>{errors.amount.message}</span>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isPoolValid || isCreatingOrder}
        className={styles.submitButton}
      >
        {isCreatingOrder ? (
          <>
            <LoadingSpinner size="small" />
            Creating Order...
          </>
        ) : (
          "Create Order"
        )}
      </button>
    </form>
  );
};

export default CreateOrder;
