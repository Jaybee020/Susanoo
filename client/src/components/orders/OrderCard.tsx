import React, { useState } from "react";
import { Order } from "../../services/limitOrder";
import { orderService } from "../../services/orderService";
import { useFlashMessage } from "../../contexts/FlashMessageContext";
import LoadingSpinner from "../common/LoadingSpinner";
import styles from "./OrderCard.module.css";

interface OrderCardProps {
  order: Order;
}

interface DecryptedData {
  triggerTick: number;
  orderType: boolean;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(
    null
  );
  const { showSuccess, showError } = useFlashMessage();

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // Placed
        return "#9D75E6";
      case 1: // Executed
        return "#28a745";
      case 2: // Cancelled
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getStatusText = (status: number) => {
    switch (status) {
      case 0:
        return "Placed";
      case 1:
        return "Executed";
      case 2:
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const handleDecrypt = async () => {
    if (!order.triggerTick || !order.orderType) {
      showError("No encrypted data available for this order");
      return;
    }

    setIsDecrypting(true);
    console.log(order);
    try {
      const result = await orderService.decryptOrder(
        order.triggerTick,
        order.orderType
      );

      if (result) {
        setDecryptedData(result);
        showSuccess("Order data decrypted successfully!");
      } else {
        showError("Failed to decrypt order data");
      }
    } catch (error) {
      console.error("Decryption error:", error);
      showError("Error decrypting order: " + (error as Error).message);
    } finally {
      setIsDecrypting(false);
    }
  };

  const formatAmount = (amount: bigint) => {
    try {
      // Convert from wei to human readable (assuming 18 decimals)
      const formatted = Number(amount) / Math.pow(10, 18);
      return formatted.toFixed(6);
    } catch {
      return amount.toString();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatPoolId = (poolId: string) => {
    return `${poolId.slice(0, 8)}...${poolId.slice(-6)}`;
  };

  return (
    <div className={styles.orderCard}>
      <div className={styles.cardHeader}>
        <div className={styles.orderInfo}>
          <span className={styles.orderId}>Order #{order.orderId}</span>
          <span
            className={styles.status}
            style={{ backgroundColor: getStatusColor(order.status) }}
          >
            {getStatusText(order.status)}
          </span>
        </div>
        <div className={styles.orderMeta}>
          {order.timestamp && (
            <span className={styles.timestamp}>
              {new Date(order.timestamp * 1000).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardBody}>
        <div className={styles.orderDetails}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Trader:</span>
            <span className={styles.value}>{formatAddress(order.trader)}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Pool ID:</span>
            <span className={styles.value}>{formatPoolId(order.poolId)}</span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Direction:</span>
            <span className={styles.value}>
              {order.zeroForOne ? "Token0 → Token1" : "Token1 → Token0"}
            </span>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.label}>Amount:</span>
            <span className={styles.value}>{formatAmount(order.amount)}</span>
          </div>

          {order.transactionHash && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Transaction:</span>
              <span className={styles.value}>
                {formatAddress(order.transactionHash)}
              </span>
            </div>
          )}
        </div>

        <div className={styles.encryptedSection}>
          <div className={styles.encryptedHeader}>
            <h4>Encrypted Data</h4>
            {!decryptedData && (
              <button
                className={styles.decryptButton}
                onClick={handleDecrypt}
                disabled={isDecrypting}
              >
                {isDecrypting ? (
                  <>
                    <LoadingSpinner size="small" />
                    Decrypting...
                  </>
                ) : (
                  "🔓 Decrypt"
                )}
              </button>
            )}
          </div>

          {decryptedData ? (
            <div className={styles.decryptedData}>
              <div className={styles.detailRow}>
                <span className={styles.label}>Trigger Tick:</span>
                <span className={styles.value}>
                  {decryptedData.triggerTick}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.label}>Order Type:</span>
                <span className={styles.value}>
                  {decryptedData.orderType ? "Take Profit" : "Stop Loss"}
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.encryptedPlaceholder}>
              <span>🔒 Trigger tick and order type are encrypted</span>
              <span>Click decrypt to reveal private data</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
