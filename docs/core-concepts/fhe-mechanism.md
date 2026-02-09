---
description: How Fhenix Fully Homomorphic Encryption powers private order evaluation in Susanoo.
icon: lock
---

# The FHE Mechanism

Susanoo uses Fhenix's FHE co-processor to keep order parameters encrypted at every stage. This page explains how FHE is applied in practice.

## What is FHE?

Fully Homomorphic Encryption allows computation on encrypted data without decrypting it first. The result of the computation, when decrypted, matches the result you would get from computing on the plaintext.

In Susanoo's context: the hook can compare an encrypted trigger price against the current pool tick, determine if the order should execute, and produce an encrypted boolean result, all without ever seeing the actual trigger price.

## Encrypted Data Types

Susanoo uses two FHE data types from the Fhenix `FHE.sol` library:

| Type | Purpose | Solidity Declaration |
|------|---------|---------------------|
| `euint32` | Encrypted trigger tick (price level) | `euint32 triggerTick` |
| `ebool` | Encrypted order type (take-profit or stop-loss) | `ebool orderType` |

These are opaque on-chain. Reading the raw storage value reveals nothing about the underlying plaintext.

## Client-Side Encryption

Before an order reaches the blockchain, the trigger parameters are encrypted off-chain using `cofhe.js`:

```typescript
import { cofhejs, Encryptable } from "cofhejs/web";

// Convert tick to unsigned range (add offset for negative tick support)
const TICK_OFFSET = 887272;
const tickWithOffset = triggerTick + TICK_OFFSET;

const encryptedData = await cofhejs.encrypt([
  Encryptable.uint32(BigInt(tickWithOffset)),  // trigger tick
  Encryptable.bool(isTakeProfit),              // order type
]);
```

{% hint style="info" %}
The `TICK_OFFSET` (887,272) converts Uniswap's signed `int24` tick range to an unsigned `uint32` range compatible with FHE operations. The same offset is applied on-chain during condition evaluation.
{% endhint %}

## On-Chain Homomorphic Evaluation

When a swap occurs, the hook evaluates each order's conditions using FHE operations:

```solidity
// All operations occur on encrypted data
euint32 currentTickEnc = FHE.asEuint32(uint32(int32(currentTick) + int32(TICK_OFFSET)));
ebool priceIncreasedEnc = FHE.asEbool(priceIncreased);

// Take Profit: price moved favorably past trigger
ebool takeProfitCondition = FHE.and(
    priceIncreasedEnc,
    FHE.gte(currentTickEnc, order.triggerTick)
);

// Stop Loss: price moved unfavorably past trigger
ebool stopLossCondition = FHE.and(
    FHE.not(priceIncreasedEnc),
    FHE.lte(currentTickEnc, order.triggerTick)
);

// Select based on encrypted order type
ebool shouldExecute = FHE.select(
    order.orderType,        // encrypted: true=TP, false=SL
    takeProfitCondition,
    stopLossCondition
);
```

The critical insight: `order.triggerTick` and `order.orderType` remain encrypted throughout. The `FHE.gte`, `FHE.lte`, `FHE.and`, and `FHE.select` operations all work on ciphertext.

## FHE Operations Used

| Operation | Purpose |
|-----------|---------|
| `FHE.asEuint32(value)` | Encrypt a plaintext uint32 |
| `FHE.asEbool(value)` | Encrypt a plaintext boolean |
| `FHE.gte(a, b)` | Encrypted greater-than-or-equal comparison |
| `FHE.lte(a, b)` | Encrypted less-than-or-equal comparison |
| `FHE.and(a, b)` | Encrypted logical AND |
| `FHE.not(a)` | Encrypted logical NOT |
| `FHE.select(cond, a, b)` | Encrypted ternary: if cond then a else b |
| `FHE.asEuint128(value)` | Type conversion for decryption |
| `FHE.decrypt(value)` | Request threshold decryption from Fhenix network |

## Access Control

FHE values have access permissions. When an order is placed, Susanoo sets up access so that:

- **The hook contract** can read and operate on the encrypted values (needed for condition evaluation)
- **The order placer** can unseal/decrypt their own values (needed to view their own orders)

```solidity
FHE.allowThis(triggerTick);    // Contract can use this value
FHE.allowSender(triggerTick);  // Order placer can unseal it
```

No other address can read the encrypted values.

## Threshold Decryption

After homomorphic evaluation produces an encrypted boolean result, Susanoo requests decryption from the Fhenix threshold decryption network:

1. `FHE.decrypt(shouldExecute)` sends the encrypted result to the network
2. The Fhenix network collectively decrypts the result (no single node sees the plaintext)
3. The decrypted value (`0` or `1`) becomes available on-chain after 1-2 blocks
4. The hook reads it with `FHE.getDecryptResultSafe()` during the next `beforeSwap`

Only the final boolean (execute or not) is ever decrypted. The trigger price and order type remain encrypted forever.
