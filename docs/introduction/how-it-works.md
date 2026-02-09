---
description: A high-level overview of how Susanoo uses FHE and Uniswap V4 hooks to execute private limit orders.
icon: gears
---

# How It Works

Susanoo uses a **two-phase execution pattern** that combines Fhenix's Fully Homomorphic Encryption with the Uniswap V4 hook lifecycle. Here's how a private order flows from placement to execution.

## The Three-Step Flow

{% stepper %}
{% step %}
## 1. Encrypt & Place

The trader encrypts their trigger price and order type (take-profit or stop-loss) off-chain using Fhenix's `cofhe.js` library. The encrypted parameters are submitted to the Susanoo hook contract, which stores them on-chain. The tokens to be swapped are transferred to the hook.

At this point, no one, not even the blockchain validators, can see the trigger conditions.
{% endstep %}

{% step %}
## 2. Evaluate Homomorphically

Every time a swap occurs in the pool, the `afterSwap` hook fires. Susanoo evaluates all active orders against the new price using **homomorphic operations on encrypted data**. It computes whether each order's conditions are met without ever decrypting the trigger price or order type.

The encrypted boolean result is sent to the Fhenix threshold decryption network and queued for processing.
{% endstep %}

{% step %}
## 3. Execute Atomically

On the next swap, the `beforeSwap` hook processes the decryption queue. For any order where the decrypted result is `true` (conditions met), the hook executes the swap atomically through the Uniswap V4 Pool Manager and transfers the output tokens to the trader.
{% endstep %}
{% endstepper %}

## Architecture Diagram

```
Trader                    Susanoo Hook                  Fhenix Network
  |                           |                              |
  |-- encrypt(triggerTick, -->|                              |
  |   orderType) + tokens     |                              |
  |                           |-- store encrypted order      |
  |                           |                              |
  |                     [Pool Swap Occurs]                   |
  |                           |                              |
  |                    afterSwap fires                       |
  |                           |-- FHE.and/gte/select ------->|
  |                           |   (homomorphic evaluation)   |
  |                           |-- FHE.decrypt(result) ------>|
  |                           |-- queue.push(handle)         |
  |                           |                              |
  |                     [Next Pool Swap]                     |
  |                           |                              |
  |                    beforeSwap fires                      |
  |                           |<-- decrypted result ---------|
  |                           |                              |
  |                           |-- if result == 1:            |
  |<-- output tokens --------|     execute swap              |
```

## What Stays Private vs. Public

| Data | Visibility | Why |
|------|-----------|-----|
| Trigger price | **Encrypted** | Prevents front-running and price manipulation |
| Order type (TP/SL) | **Encrypted** | Prevents strategy extraction |
| Trade direction | Public | Needed for pool routing (simplified for current implementation) |
| Trade amount | Public | Required for ERC20 token transfers |
| Trader address | Public | Required for token custody and settlement |
| Order execution | Public (after the fact) | The swap itself is visible once it happens |

## Key Innovation: Asynchronous Yet Atomic

The FHE decryption process is inherently asynchronous (it takes 1-2 blocks for the Fhenix network to return results). Susanoo handles this gracefully through its queue system:

1. **`afterSwap`**: Requests decryption and queues the encrypted result handle
2. **`beforeSwap`** (next transaction): Checks if decryption is complete and executes

This means there is a minimum 1-transaction delay between an order's conditions being met and its execution. This delay is a fundamental trade-off of using FHE for privacy, but the order execution itself remains atomic and safe within Uniswap's pool manager.
