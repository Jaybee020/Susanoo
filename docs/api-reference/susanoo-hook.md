---
description: Complete reference for the Susanoo.sol hook contract - functions, events, and data structures.
icon: brackets-curly
---

# Susanoo.sol (Hook Contract)

`Susanoo` is the main hook contract. It extends `BaseHook`, implements `IUnlockCallback`, and uses `ReentrancyGuardTransient` for execution safety.

**Deployed Address (Arbitrum Sepolia):** `0x569b28A558D1229E172E77202D580052179d10c0`

## Data Structures

### Order

```solidity
struct Order {
    address trader;          // Address that placed the order
    bool zeroForOne;         // Swap direction (true = token0→token1, false = token1→token0)
    OrderStatus status;      // Placed, Executed, or Cancelled
    ebool orderType;         // Encrypted: true = TakeProfit, false = StopLoss
    euint32 triggerTick;     // Encrypted trigger price (tick with offset)
    uint256 amount;          // Amount of input tokens (in wei)
    PoolId keyId;            // The pool this order belongs to
}
```

### OrderStatus

```solidity
enum OrderStatus {
    Placed,     // 0 - Active, waiting for trigger
    Executed,   // 1 - Successfully executed
    Cancelled   // 2 - Cancelled by the trader
}
```

### OrderDecryptionInfo

```solidity
struct OrderDecryptionInfo {
    uint256 orderId;       // The order being evaluated
    int24 currentTick;     // Tick when decryption was requested
    bool priceIncreased;   // Whether price moved up since last swap
}
```

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `TICK_OFFSET` | `887272` | Added to ticks to convert signed int24 to unsigned uint32 for FHE |

## State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `nextOrderId` | `uint256` | Auto-incrementing counter for order IDs (starts at 1) |
| `orders` | `mapping(uint256 => Order)` | All orders by ID |
| `lastTicks` | `mapping(PoolId => int24)` | Last recorded tick per pool |

## Functions

### placeOrder

Places a new encrypted limit order.

```solidity
function placeOrder(
    PoolKey calldata key,
    bool zeroForOne,
    InEuint32 memory inTriggerTick,
    InEbool memory inOrderType,
    uint256 amount
) external returns (uint256 orderId)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `key` | `PoolKey` | The Uniswap V4 pool key |
| `zeroForOne` | `bool` | Swap direction |
| `inTriggerTick` | `InEuint32` | Encrypted trigger tick (must include TICK_OFFSET) |
| `inOrderType` | `InEbool` | Encrypted order type (true=TP, false=SL) |
| `amount` | `uint256` | Amount of input tokens in wei |

**Returns:** The new order's ID.

**Behavior:**
- Flushes the decryption queue first (prevents buildup)
- Processes encrypted inputs and sets FHE access control
- Transfers `amount` of the input token from `msg.sender` to the hook
- Emits `OrderPlaced`

{% hint style="warning" %}
The caller must approve the hook contract to transfer their tokens before calling `placeOrder`. Only ERC20 tokens are supported (not native ETH).
{% endhint %}

---

### editOrder

Edits an existing order's trigger tick and/or amount.

```solidity
function editOrder(
    PoolKey calldata key,
    uint256 orderId,
    InEuint32 memory inNewTriggerTick,
    int256 amountDelta
) external
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `key` | `PoolKey` | The pool key (must match the order's pool) |
| `orderId` | `uint256` | The order to edit |
| `inNewTriggerTick` | `InEuint32` | New encrypted trigger tick |
| `amountDelta` | `int256` | Positive to add tokens, negative to remove, zero for tick-only change |

**Behavior:**
- Only the original trader can edit their order
- If `amountDelta > 0`: transfers additional tokens from trader to hook
- If `amountDelta < 0`: returns tokens to trader; if amount reaches 0, cancels the order
- If `amountDelta == 0`: only updates the trigger tick
- Emits `OrderEdited` or `OrderCancelled`

---

### getQueueLength

Returns the current decryption queue length for a pool.

```solidity
function getQueueLength(PoolKey calldata key) external view returns (uint256)
```

---

### flushOrder

Manually processes the decryption queue for a pool.

```solidity
function flushOrder(PoolKey calldata key) public
```

Acquires the pool manager lock and calls `_executeDecryptedOrders`. Callable by anyone.

---

### unlockCallback

Called by the Pool Manager when the lock is acquired via `flushOrder`.

```solidity
function unlockCallback(bytes calldata data) external override onlyPoolManager returns (bytes memory)
```

---

## Events

### OrderPlaced

```solidity
event OrderPlaced(
    uint256 orderId,
    address indexed trader,
    euint32 triggerTick,
    bool zeroForOne,
    ebool orderType,
    uint256 amount,
    PoolId indexed keyId
);
```

Emitted when a new order is created. Note that `triggerTick` and `orderType` are encrypted handles.

---

### OrderEdited

```solidity
event OrderEdited(
    uint256 orderId,
    address indexed trader,
    euint32 newTriggerTick,
    uint256 newAmount,
    PoolId indexed keyId
);
```

Emitted when an order's parameters are modified.

---

### OrderExecuted

```solidity
event OrderExecuted(
    uint256 orderId,
    address indexed trader,
    int24 executedTick,
    PoolId indexed keyId
);
```

Emitted when an order is successfully executed. `executedTick` is the pool tick at execution time (plaintext).

---

### OrderCancelled

```solidity
event OrderCancelled(
    uint256 orderId,
    address indexed trader,
    PoolId indexed keyId
);
```

Emitted when an order is cancelled (via `editOrder` with `amountDelta` reducing amount to zero).

---

### DecryptionRequested

```solidity
event DecryptionRequested(
    uint256 orderId,
    euint128 conditionHandle
);
```

Emitted during `afterSwap` when a homomorphic condition evaluation is submitted for decryption.

## Hook Permissions

```solidity
Hooks.Permissions({
    beforeInitialize: false,
    afterInitialize: true,      // Initialize queue and record initial tick
    beforeAddLiquidity: false,
    afterAddLiquidity: false,
    beforeRemoveLiquidity: false,
    afterRemoveLiquidity: false,
    beforeSwap: true,           // Process decryption queue, execute orders
    afterSwap: true,            // Evaluate order conditions, request decryption
    beforeDonate: false,
    afterDonate: false,
    beforeSwapReturnDelta: false,
    afterSwapReturnDelta: false,
    afterAddLiquidityReturnDelta: false,
    afterRemoveLiquidityReturnDelta: false
})
```
