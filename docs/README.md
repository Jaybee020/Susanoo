---
description: >-
  Encrypted limit orders for Uniswap V4 powered by Fully Homomorphic Encryption.
  Place take-profit and stop-loss orders without revealing your strategy.
icon: shield-halved
layout:
  width: wide
  title:
    visible: true
  description:
    visible: true
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
---

# What is Susanoo?

Susanoo is a Uniswap V4 hook that enables **fully private limit orders** using Fully Homomorphic Encryption (FHE). It allows traders to place take-profit and stop-loss orders on-chain without ever exposing their trigger prices, order types, or trading strategies to the public blockchain.

{% hint style="info" %}
Susanoo is the first FHE-based limit order hook in the Uniswap ecosystem, pioneering a zero-strategy-leakage design for on-chain conditional trading.
{% endhint %}

## Why Susanoo?

In traditional DeFi, every limit order you place is fully visible on-chain. This means:

- MEV bots can **front-run** your stop-loss and take-profit orders
- Sophisticated actors can **extract your strategy** from the public order book
- Your trigger prices become targets for **price manipulation**

Susanoo eliminates this by keeping all critical order parameters encrypted at rest, during evaluation, and until execution. Your strategy stays private.

## Key Features

{% columns %}
{% column %}
### Private Order Parameters

Trigger prices and order types are encrypted using Fhenix FHE. No one on-chain can see when or why your order will execute.
{% endcolumn %}

{% column %}
### Automatic Execution

Orders are evaluated homomorphically every time a swap occurs in the pool. When conditions are met, orders execute atomically.
{% endcolumn %}
{% endcolumns %}

{% columns %}
{% column %}
### Take-Profit & Stop-Loss

Supports both order types, encrypted as a single boolean. Observers cannot distinguish between them.
{% endcolumn %}

{% column %}
### Built on Uniswap V4

Natively integrates with the Uniswap V4 hook system, leveraging `beforeSwap` and `afterSwap` lifecycle hooks.
{% endcolumn %}
{% endcolumns %}

## Quick Links

<table data-view="cards">
    <thead>
        <tr>
            <th>Title</th>
            <th data-card-target data-type="content-ref">Target</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>Quick Start Guide</td>
            <td><a href="getting-started/quick-start.md">Quick Start</a></td>
        </tr>
        <tr>
            <td>How It Works</td>
            <td><a href="introduction/how-it-works.md">How It Works</a></td>
        </tr>
        <tr>
            <td>Contract Reference</td>
            <td><a href="api-reference/susanoo-hook.md">API Reference</a></td>
        </tr>
    </tbody>
</table>
