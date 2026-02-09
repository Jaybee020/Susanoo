---
description: >-
  The validated problem statement and value proposition that Susanoo
  is built upon.
icon: seal
---

# Part 4: Validated Thesis

## Validated Problem

{% hint style="danger" %}
Publicly visible trade intent and limit-order information on mempools and order books create a **predictable attack surface** that MEV searchers and adversarial counterparties exploit — producing hundreds of millions of extracted value and millions of dollars worth of daily sandwich/front-run events.
{% endhint %}

This is experienced as real losses and user frustration that we have seen across trading communities on X. The evidence is clear:

- **$314M+** extracted on Ethereum alone (Flashbots MEV-Explore)
- **$1B+** estimated cumulative extraction across all ecosystems
- **Thousands** of sandwich attacks documented daily on Dune dashboards
- **High-profile traders** publicly documenting liquidation hunting against their positions

---

## Validated Solution & Value Prop

{% hint style="success" %}
Susanoo gives DEXes and wallets a **cryptographic privacy layer** for limit orders (FHE-based). It prevents mempool/orderbook intent leakage without re-routing flows or introducing any centralized relays. This protects users from front-running, sniping, and liquidation hunting by restoring **predictable execution and trust** to traders.
{% endhint %}

### Why Susanoo Wins

{% stepper %}
{% step %}
### Cryptographic, Not Trust-Based

Unlike private RPCs and relays, Susanoo uses Fully Homomorphic Encryption to provide **mathematically guaranteed** privacy. There is no trusted third party that can leak or reorder your orders.
{% endstep %}

{% step %}
### Native Uniswap V4 Integration

Susanoo operates as a native hook — no flow-breaking batch auctions, no alternative settlement primitives. Traders stay within the Uniswap ecosystem with the same UX they already know.
{% endstep %}

{% step %}
### Zero Strategy Leakage

Trigger prices are encrypted as `euint32`, order types as `ebool`. Conditions are evaluated homomorphically during `afterSwap` — no observer can distinguish between a take-profit and a stop-loss, or determine at what price an order will execute.
{% endstep %}

{% step %}
### Protects the Most Vulnerable Segment

Mid-level traders in the $1K–$50K range are disproportionately targeted by sandwich bots. Susanoo directly addresses this by making their intent invisible on-chain.
{% endstep %}
{% endstepper %}
