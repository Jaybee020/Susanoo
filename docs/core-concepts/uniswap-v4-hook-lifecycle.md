---
description: How Susanoo integrates with the Uniswap V4 pool lifecycle through hooks.
icon: arrows-spin
---

# The Uniswap v4 Hook Lifecycle

Susanoo is implemented as a Uniswap V4 **hook**, a smart contract that plugs into the pool manager's swap lifecycle. This page explains which hooks Susanoo uses and what happens at each stage.

## Hook Permissions

Susanoo registers three hook callbacks:

| Hook | Flag | Purpose |
|------|------|---------|
| `afterInitialize` | `AFTER_INITIALIZE_FLAG` | Set up the decryption queue and record the initial tick |
| `beforeSwap` | `BEFORE_SWAP_FLAG` | Process the decryption queue and execute triggered orders |
| `afterSwap` | `AFTER_SWAP_FLAG` | Evaluate all active orders against the new price |

All other hooks (`beforeAddLiquidity`, `afterRemoveLiquidity`, `beforeDonate`, etc.) are disabled.

## Lifecycle Flow

```
Pool Initialization
        |
        v
  afterInitialize
  - Create decryption Queue for this pool
  - Record initial tick in lastTicks mapping
        |
        v
  [Normal pool operation begins]
        |
        v
  ┌─────────────────────────────────┐
  │         Swap Transaction        │
  │                                 │
  │  1. beforeSwap fires            │
  │     └─ Process decryption queue │
  │        └─ Execute valid orders  │
  │                                 │
  │  2. Pool Manager executes swap  │
  │                                 │
  │  3. afterSwap fires             │
  │     └─ Detect price change      │
  │     └─ Evaluate all orders      │
  │        (FHE homomorphic ops)    │
  │     └─ Request decryption       │
  │     └─ Queue encrypted handles  │
  │     └─ Update lastTick          │
  │                                 │
  └─────────────────────────────────┘
        |
        v
  [Next swap repeats the cycle]
```

## Phase 1: afterSwap (Condition Evaluation)

When a swap completes, `afterSwap` detects whether the price moved up or down by comparing `currentTick` with `lastTick`. It then iterates over all active orders for this pool:

```solidity
function _afterSwap(...) internal override returns (bytes4, int128) {
    // Skip if this is a self-triggered swap (order execution)
    if (msg.sender == address(this)) {
        return (this.afterSwap.selector, 0);
    }

    (, int24 currentTick,,) = poolManager.getSlot0(key.toId());
    int24 lastTick = lastTicks[key.toId()];

    // Evaluate all orders with encrypted condition logic
    _requestDecryptionForPotentialTriggers(key, lastTick, currentTick);
    lastTicks[key.toId()] = currentTick;
}
```

For each order, it computes the encrypted execution condition and requests decryption from the Fhenix network. The encrypted result handle is pushed to the pool's decryption queue.

{% hint style="info" %}
The `msg.sender == address(this)` guard prevents infinite recursion. When the hook executes an order (which is itself a swap), the resulting `afterSwap` callback is skipped.
{% endhint %}

## Phase 2: beforeSwap (Order Execution)

Before the next swap executes, `beforeSwap` processes the decryption queue:

```solidity
function _beforeSwap(...) internal override returns (bytes4, BeforeSwapDelta, uint24) {
    _executeDecryptedOrders(key);
    return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
}
```

The queue is processed FIFO. For each item:

1. Check if the Fhenix network has returned the decryption result
2. If not yet decrypted, stop processing (preserves ordering)
3. If decrypted and result is `1` (true): execute the order's swap
4. If decrypted and result is `0` (false): discard (conditions not met)

## Order Execution

When an order triggers, the hook:

1. Marks the order as `Executed`
2. Performs the swap through the Pool Manager using the order's parameters
3. Settles token balances (pays input tokens, receives output tokens)
4. Transfers the output tokens to the trader's address
5. Removes the order from the active orders set

```solidity
function _executeOrder(PoolKey memory key, uint256 orderId) private {
    Order storage order = orders[orderId];
    order.status = OrderStatus.Executed;

    BalanceDelta delta = _swapAndSettleBalances(key, SwapParams({
        zeroForOne: order.zeroForOne,
        amountSpecified: -int256(order.amount),
        sqrtPriceLimitX96: order.zeroForOne
            ? TickMath.MIN_SQRT_PRICE + 1
            : TickMath.MAX_SQRT_PRICE - 1
    }));

    // Transfer output tokens to trader
    // ...
}
```

## The Queue System

Each pool has its own `Queue` contract instance. The queue stores `euint128` handles (references to encrypted values pending decryption):

- **Push**: After `afterSwap` evaluates an order and requests decryption
- **Peek/Pop**: During `beforeSwap` when processing results
- **FIFO ordering**: Ensures orders are evaluated in the sequence they were triggered

## Manual Queue Flushing

The `flushOrder` function allows anyone to manually trigger queue processing outside of normal swap flow. This is useful when orders are pending but no new swaps are occurring:

```solidity
function flushOrder(PoolKey calldata key) public {
    poolManager.unlock(abi.encode(key));
}
```

This acquires the pool manager lock and processes the decryption queue via the `unlockCallback`.
