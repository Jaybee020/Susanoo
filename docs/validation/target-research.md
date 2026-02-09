---
description: >-
  Defining Susanoo's ideal user through on-chain persona analysis
  and identifying target integrator protocols.
icon: crosshairs
---

# Part 3: Target Research

## 1. Susanoo's On-Chain Persona

### User Profile: The Mid-Level Active Trader

| Attribute | Detail |
| --- | --- |
| **Wallet age** | 6–24 months — many active DeFi traders operate through newly created hot wallets and temporary wallets in this range ([Dune](https://dune.com/)) |
| **Transaction frequency** | 5–20 trades per week (mix of swaps, limit fills, occasional leverage opens) |
| **Primary protocols** | Uniswap, Matcha, dYdX, and sometimes CoW |
| **Trade size band** | $1K–$50K per position |

### Key Behaviour & Vulnerability

This trader operates in the **$1K–$50K band** — big enough to move price in some pools but not so large as to be handled by OTC liquidity. This category has been found to be the **most common target for sandwich bots** because it sits in the profitable range for extraction.

{% hint style="warning" %}
The `avg_victim_volume_per_sandwich_usd` metric on [Dune dashboards](https://dune.com/) confirms that mid-size trades are disproportionately targeted — large enough to be profitable for bots, small enough that traders lack institutional protections.
{% endhint %}

### The Ideal User

Our ideal user of Susanoo is the **active DeFi trader** who executes limit/intent orders large enough to move thin pools but small enough that public mempool exposure makes them profitable targets for sniping and sandwich bots.

---

## 2. Ideal Integrator Target List

### Direct User Acquisition

Susanoo will be used by the regular trader as identified above. This will be done primarily by funneling users through the Susanoo UI that implements the protocol.

- **Landing page:** [susanoo.netlify.app](https://lucky-toffee-a797fa.netlify.app)

### Protocol Integration Candidates

Each candidate is chosen because:

1. They run orderflow where limit (intent) leaks matter
2. They've publicly discussed MEV or integrated MEV protection
3. They gain competitive advantage from adding privacy hooks

{% columns %}
{% column %}
### Bunni v2 Contributors

The team is building LP automation. Stop-loss and rebalancing strategies get farmed constantly. Encrypted triggers would protect their vault logic from being reverse-engineered.
{% endcolumn %}

{% column %}
### Steer Protocol

Vault rebalancing logic leaks alpha. Steer would benefit from encrypted triggers that prevent adversaries from front-running automated rebalance events.
{% endcolumn %}
{% endcolumns %}
