---
description: Trust assumptions, threat model, and what Susanoo does and does not protect against.
icon: shield
---

# Security Model

Understanding Susanoo's security model is essential for integrators and users. This page documents what is protected, what is not, and the trust assumptions involved.

## What Susanoo Protects

| Threat | Protection | How |
|--------|-----------|-----|
| Front-running of limit orders | Protected | Trigger prices are encrypted; bots cannot see when orders will execute |
| Strategy extraction | Protected | Order type (TP/SL) is encrypted; observers cannot classify orders |
| Price manipulation around known levels | Protected | Trigger levels are hidden, removing the target |
| Order book analysis | Protected | No cleartext order book exists on-chain |

## What Susanoo Does NOT Protect

| Scenario | Status | Explanation |
|----------|--------|-------------|
| Trade amounts | **Public** | Order amounts are visible on-chain (required for ERC20 transfers) |
| Trade direction | **Public** | `zeroForOne` is unencrypted (simplified for current implementation) |
| Trader identity | **Public** | Wallet addresses are visible (standard blockchain transparency) |
| Post-execution privacy | **Public** | Once an order executes, the swap itself is visible |
| MEV on the execution swap | **Not protected** | The execution swap is a normal Uniswap swap and can be sandwiched |

## Trust Assumptions

### 1. Fhenix Threshold Decryption Network

Susanoo relies on the Fhenix network to:
- Correctly evaluate homomorphic operations
- Honestly perform threshold decryption (returning the true result)
- Not collude to decrypt encrypted order parameters

{% hint style="warning" %}
If a majority of the Fhenix threshold decryption nodes collude, they could theoretically decrypt stored order parameters. This is the primary trust assumption of the system.
{% endhint %}

### 2. Uniswap V4 Pool Manager

The hook operates within the Uniswap V4 framework. Susanoo trusts:
- The Pool Manager to correctly call hook functions at the right lifecycle points
- Price feeds (`getSlot0`) to reflect actual pool state
- The settlement system to correctly handle token transfers

### 3. Smart Contract Correctness

The FHE condition logic must correctly implement the intended take-profit and stop-loss semantics. A bug in the homomorphic evaluation could cause orders to execute at wrong prices or fail to execute when they should.

## Known Limitations

### Execution Delay

Due to asynchronous FHE decryption, there is a minimum 1-transaction delay between when conditions are met and when execution occurs. During this delay:
- The price may move further (positive or negative slippage)
- No slippage protection is currently implemented on execution

### No Slippage Protection

Orders execute with maximum slippage tolerance (`MIN_SQRT_PRICE + 1` or `MAX_SQRT_PRICE - 1`). In a volatile market, this could result in worse-than-expected execution prices.

### Queue Processing Limits

The decryption queue is processed sequentially in `beforeSwap`. If many orders trigger simultaneously, gas limits may prevent all orders from being processed in a single transaction.

### Public Amount

The trade amount is public, which reveals the size of each order. A sophisticated observer could potentially correlate order sizes with trading patterns, even without knowing trigger prices.

## Reentrancy Protection

Susanoo uses OpenZeppelin's `ReentrancyGuardTransient` on critical functions (`_executeOrder`, `flushOrder`) to prevent reentrancy attacks during token transfers and swap execution.

## Access Control

- Only the order placer can unseal (view) their own encrypted parameters
- The hook contract has compute access to encrypted values (necessary for evaluation)
- No admin keys or privileged roles exist in the current implementation
