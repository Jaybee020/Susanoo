---
description: Why on-chain limit orders need privacy, and the real cost of transparency in DeFi.
icon: triangle-exclamation
---

# The Problem We Solve

## Transparent Orders Are Exploitable Orders

Traditional limit orders on AMMs like Uniswap are fully visible on-chain. The moment a trader places a stop-loss at tick -100 or a take-profit at tick 200, that information becomes public. This creates a cascade of problems.

### Front-Running

MEV bots continuously monitor pending limit orders. When they detect a stop-loss about to trigger, they can execute trades ahead of the order to profit from the predictable price movement. The trader gets a worse execution price, and the MEV bot captures the difference.

### Strategy Extraction

Visible order books expose trading strategies. If a sophisticated actor sees a cluster of take-profit orders at a specific price level, they gain information about market sentiment and positioning that they can trade against.

### Price Manipulation

Known liquidity points (visible trigger prices) become targets. Bad actors can temporarily push prices to trigger stop-losses, causing forced selling, and then buy back at a lower price. This is especially damaging for large orders.

### Information Asymmetry

The transparency that is supposed to make DeFi fair ends up creating an uneven playing field. Sophisticated bots and actors can see and exploit the strategies of retail traders, while the reverse is not true.

## The Privacy Gap

| What's Needed | What Exists Today | What Susanoo Provides |
|---------------|-------------------|----------------------|
| Hidden trigger prices | Prices visible on-chain | `euint32 triggerTick` (encrypted) |
| Hidden order types | Order type visible on-chain | `ebool orderType` (encrypted) |
| Private execution logic | Conditions evaluated in the clear | Homomorphic condition evaluation |
| MEV resistance | Orders exploitable by bots | Zero-strategy-leakage design |

## The Cost to Traders

Without privacy, traders face a hidden tax on every limit order:

- **Worse execution prices** from front-running
- **Reduced trade alpha** from strategy visibility
- **Forced liquidations** from price manipulation around known levels
- **Institutional reluctance** to use on-chain limit orders for large positions

Susanoo addresses all of these by ensuring that order parameters remain encrypted from placement through evaluation to execution. The only thing that becomes public is the final execution itself, after the fact.
