---
description: >-
  The core hypothesis behind Susanoo: the problem, the user, the solution,
  and the FHE-powered unfair advantage.
icon: lightbulb
---

# Part 1: Initial Hypothesis

## 1. The Problem

**What specific, acute problem are you solving?**

Institutions and retail traders are often targeted by counterparties when the details of their trading positions and setups are made public. This can be done using MEV bots or a coordinated attack.

{% hint style="danger" %}
Every limit order placed on a public blockchain is fully visible — trigger prices, order types, and position sizes are all exposed. This creates a roadmap for adversaries to exploit.
{% endhint %}

## 2. The User

**Who exactly has this problem?**

Traders whose positions can alter the market based on their limit orders. This includes:

- **Institutional traders** managing significant positions across DeFi protocols
- **Active retail traders** operating in the $1K–$50K range on thin pools
- **High-profile traders** like [James Wynn](https://x.com/jameswynnreal), whose public positions have been repeatedly targeted for liquidation

## 3. The Solution

**What is your 1-sentence solution?**

{% hint style="success" %}
Susanoo provides fully private limit orders to DeFi using Fully Homomorphic Encryption (FHE).
{% endhint %}

## 4. The "Unfair Advantage"

**Why is this only possible (or 10x better) with FHE/Fhenix?**

Susanoo, through FHE, enables advanced strategies like stop-loss and take-profit **without fear of being front-run** by sophisticated bots. This allows institutions and large holders to execute significant positions without telegraphing their moves to the entire market.

{% columns %}
{% column %}
### Without FHE

- Order parameters are public on-chain
- MEV bots can front-run triggers
- Strategies are reverse-engineered from order books
- Traders must accept information leakage as a cost of doing business
{% endcolumn %}

{% column %}
### With FHE (Susanoo)

- Trigger prices encrypted as `euint32`
- Order types encrypted as `ebool`
- Conditions evaluated homomorphically — no decryption until execution
- Zero strategy leakage by design
{% endcolumn %}
{% endcolumns %}
