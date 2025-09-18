import React from 'react';
import CreateOrder from '../components/orders/CreateOrder';
import styles from './CreateOrderPage.module.css';

const CreateOrderPage: React.FC = () => {
  const handleOrderCreate = (orderData: any) => {
    console.log('Order created:', orderData);
    // Here you could redirect to orders page or show success message
  };

  return (
    <div className={styles.createOrderPage}>
      <div className={styles.header}>
        <h1>Create Limit Order</h1>
        <p>Set up your private limit order with encrypted execution parameters</p>
      </div>

      <div className={styles.formContainer}>
        <CreateOrder onOrderCreate={handleOrderCreate} />
      </div>
    </div>
  );
};

export default CreateOrderPage;