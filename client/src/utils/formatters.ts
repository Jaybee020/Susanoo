import { OrderStatus, OrderType } from './constants';

/**
 * Format order status for display
 */
export function formatOrderStatus(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Placed:
      return 'Active';
    case OrderStatus.Executed:
      return 'Executed';
    case OrderStatus.Cancelled:
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color class
 */
export function getStatusColor(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.Placed:
      return 'active';
    case OrderStatus.Executed:
      return 'executed';
    case OrderStatus.Cancelled:
      return 'cancelled';
    default:
      return 'unknown';
  }
}

/**
 * Format order type for display
 */
export function formatOrderType(orderType: boolean | number): string {
  // Handle both boolean and OrderType enum
  const isTakeProfit = typeof orderType === 'boolean' ? orderType : orderType === OrderType.TakeProfit;
  return isTakeProfit ? 'Take Profit' : 'Stop Loss';
}

/**
 * Format wallet address for display
 */
export function formatAddress(address: string, length: number = 6): string {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Format amount for display
 */
export function formatAmount(amount: bigint | string, decimals: number = 18): string {
  const amountStr = amount.toString();
  const formatted = Number(amountStr) / Math.pow(10, decimals);

  if (formatted < 0.000001) {
    return formatted.toExponential(2);
  }

  return formatted.toFixed(6);
}

/**
 * Format pool ID for display
 */
export function formatPoolId(poolId: string): string {
  return formatAddress(poolId, 8);
}