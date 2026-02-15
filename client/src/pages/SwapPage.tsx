import React from "react";
import SwapForm from "../components/swap/SwapForm";
import styles from "./SwapPage.module.css";

const SwapPage: React.FC = () => {
  return (
    <div className={styles.swapPage}>
      <div className={styles.header}>
        <h1>Swap</h1>
        <p>Trade tokens directly through the Uniswap V4 pool</p>
      </div>

      <div className={styles.formContainer}>
        <SwapForm />
      </div>
    </div>
  );
};

export default SwapPage;
