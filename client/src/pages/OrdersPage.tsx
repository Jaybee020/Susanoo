import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '../services/orderService';
import { Order } from '../services/limitOrder';
import { useFlashMessage } from '../contexts/FlashMessageContext';
import OrderCard from '../components/orders/OrderCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import styles from './OrdersPage.module.css';

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [walletAddress, setWalletAddress] = useState<string>('');
  const { showError } = useFlashMessage();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      // Get wallet address first
      const address = await orderService.getWalletAddress();
      setWalletAddress(address);

      // Fetch user orders
      const userOrders = await orderService.getUserOrders(address);
      setOrders(userOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      showError('Failed to load orders: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadOrders();
  };

  return (
    <div className={styles.ordersPage}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>My Orders</h1>
          <p>View and manage your private limit orders</p>
          {walletAddress && (
            <div className={styles.walletInfo}>
              <span className={styles.walletLabel}>Wallet:</span>
              <span className={styles.walletAddress}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? <LoadingSpinner size="small" /> : '🔄'} Refresh
          </button>
          <Link to="/create" className={styles.createButton}>
            + Create New Order
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <LoadingSpinner />
          <p>Loading your orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📋</div>
          <h3>No orders found</h3>
          <p>You haven't created any limit orders yet.</p>
          <Link to="/create" className={styles.createOrderLink}>
            Create your first order
          </Link>
        </div>
      ) : (
        <div className={styles.ordersContainer}>
          <div className={styles.ordersHeader}>
            <h2>Order History ({orders.length})</h2>
            <div className={styles.orderStats}>
              <span className={styles.stat}>
                Active: {orders.filter(o => o.status === 0).length}
              </span>
              <span className={styles.stat}>
                Executed: {orders.filter(o => o.status === 1).length}
              </span>
              <span className={styles.stat}>
                Cancelled: {orders.filter(o => o.status === 2).length}
              </span>
            </div>
          </div>

          <div className={styles.ordersList}>
            {orders.map((order) => (
              <OrderCard key={order.orderId} order={order} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;