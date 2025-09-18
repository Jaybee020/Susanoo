import React, { useEffect, useState } from "react";
import styles from "./FlashMessage.module.css";

export interface FlashMessageProps {
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose?: () => void;
}

const FlashMessage: React.FC<FlashMessageProps> = ({
  message,
  type,
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Start animation after a small delay
    const animationTimer = setTimeout(() => {
      setIsAnimating(true);
    }, 100);

    // Auto-close after duration
    const closeTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(closeTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300); // Match animation duration
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`${styles.flashMessage} ${styles[type]} ${
        isAnimating ? styles.visible : ""
      }`}
    >
      <div className={styles.content}>
        <span className={styles.icon}>
          {type === "success" && "✓"}
          {type === "error" && "✗"}
          {type === "info" && "ⓘ"}
          {type === "warning" && "⚠"}
        </span>
        <span className={styles.message}>{message}</span>
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close message"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default FlashMessage;