---
description: How to read and unseal encrypted order parameters that only the order placer can view.
icon: eye
---

# Reading Encrypted Order Data

When you place a private order on Susanoo, your trigger tick and order type are stored as encrypted values on-chain. Only you (the order placer) can decrypt and view these values. This guide shows how.

## Public vs. Encrypted Order Data

When you query an order, you get a mix of public and encrypted fields:

| Field | Visibility | Type |
|-------|-----------|------|
| `trader` | Public | `address` |
| `zeroForOne` | Public | `bool` |
| `status` | Public | `OrderStatus` (Placed/Executed/Cancelled) |
| `amount` | Public | `uint256` |
| `keyId` | Public | `PoolId` |
| `triggerTick` | **Encrypted** | `euint32` |
| `orderType` | **Encrypted** | `ebool` |

## Reading Public Data

Public fields can be read by anyone using a standard contract call:

```typescript
const susanoo = new ethers.Contract(HOOK_ADDRESS, SusanooABI.abi, provider);
const order = await susanoo.orders(orderId);

console.log("Trader:", order.trader);
console.log("Amount:", ethers.formatEther(order.amount));
console.log("Status:", order.status); // 0=Placed, 1=Executed, 2=Cancelled
console.log("Direction:", order.zeroForOne ? "Token0→Token1" : "Token1→Token0");
```

The encrypted fields (`triggerTick` and `orderType`) will return opaque handles, not the actual values.

## Unsealing Encrypted Data

To view your own encrypted values, you need to create a **permit** and then **unseal** the data.

### Step 1: Create a Permit

```typescript
import { cofhejs, FheTypes } from "cofhejs/web";

// Initialize cofhe.js (must use the same signer that placed the order)
await cofhejs.initializeWithEthers({
  ethersProvider: provider,
  ethersSigner: signer,
  environment: "TESTNET",
});

// Create a self-permit
const signerAddress = await signer.getAddress();
await cofhejs.createPermit({
  type: "self",
  issuer: signerAddress,
});

const permit = cofhejs.getPermit();
```

{% hint style="warning" %}
The permit must be created with the same wallet that placed the order. Other wallets will fail to unseal the data.
{% endhint %}

### Step 2: Unseal the Values

```typescript
const TICK_OFFSET = 887272;

// Get the encrypted handles from the order
const order = await susanoo.orders(orderId);

// Unseal trigger tick
const unsealedTick = await cofhejs.unseal(
  order.triggerTick,
  FheTypes.Uint32,
  permit.data?.issuer,
  permit.data?.getHash()
);

// Unseal order type
const unsealedType = await cofhejs.unseal(
  order.orderType,
  FheTypes.Bool,
  permit.data?.issuer,
  permit.data?.getHash()
);

// Convert tick back from unsigned to signed range
const actualTick = Number(unsealedTick) - TICK_OFFSET;
const isTakeProfit = unsealedType as boolean;

console.log("Trigger Tick:", actualTick);
console.log("Order Type:", isTakeProfit ? "Take Profit" : "Stop Loss");
```

## Reading Orders via Events

For a list of all your historical orders, query the `OrderPlaced` event:

```typescript
const filter = susanoo.filters.OrderPlaced(
  null,            // orderId (any)
  traderAddress    // your address
);

const events = await susanoo.queryFilter(filter, 0, "latest");

for (const event of events) {
  if ("args" in event && event.args) {
    console.log("Order ID:", event.args.orderId.toString());
    console.log("Amount:", ethers.formatEther(event.args.amount));
    // triggerTick and orderType in events are encrypted handles
  }
}
```

## Checking Order Execution

To see if and when your orders were executed, query the `OrderExecuted` event:

```typescript
const execFilter = susanoo.filters.OrderExecuted(null, traderAddress);
const executions = await susanoo.queryFilter(execFilter, 0, "latest");

for (const event of executions) {
  if ("args" in event && event.args) {
    console.log("Order", event.args.orderId.toString(), "executed at tick", event.args.executedTick);
  }
}
```

## Monitoring the Decryption Queue

Check the current queue depth for a pool:

```typescript
const queueLength = await susanoo.getQueueLength(poolKey);
console.log("Pending decryptions:", queueLength.toString());
```

A non-zero queue length means orders have been evaluated but are waiting for FHE decryption results. These will be processed on the next swap or `flushOrder` call.
