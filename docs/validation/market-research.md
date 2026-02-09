---
description: >-
  Quantifying the MEV problem, documenting public complaints, and analyzing
  the competitive landscape that Susanoo addresses.
icon: chart-line
---

# Part 2: Market & Problem Research

## 2.1 Quantify the Pain

### Ecosystem Data

The scale of MEV extraction is well-documented across the ecosystem:

- [Flashbots' historical MEV quantification / MEV-Explore findings](https://medium.com/flashbots/quantifying-mev-introducing-mev-explore-v0-5ccbee0f0d02) — the original dataset that put numbers to MEV extraction on Ethereum
- [Dune's public dashboards](https://dune.com/) — multiple community dashboards tracking sandwich attacks and daily counts across chains

### The Big Number

{% hint style="warning" %}
Flashbots' early MEV-Explore data shows at least **$314M extracted on Ethereum alone**. Broader industry research from CoW Protocol, academic papers, and multi-chain Dune dashboards indicates the real figure is already in the **hundreds of millions to well over $1B** across ecosystems.
{% endhint %}

This makes MEV one of the largest and most persistent structural leaks in DeFi.

### What This Means

MEV, sandwiching, and counterparty trades are a **multi-hundred-million-dollar structural leakage** that is revealed through trading intent vectors such as limit orders. Dashboards and traders on X show thousands of sandwiches per day and historical totals in the hundreds of millions. Some protocol reports summarize the cumulative impact into the **billion-dollar range**.

---

## 2.2 Find the Public Complaint

Since limit orders are clearly visible on order books — either through UIs or on-chain — the following examples document both the intent routes exposed through leveraged positions and the problems of sandwich bots.

{% stepper %}
{% step %}
### Uniswap Protocol Blog

[Uniswap — Why Swaps Fail and What You Can Do](https://blog.uniswap.org/why-swaps-fail-and-what-you-can-do)

Uniswap and other protocol blogs explicitly publish guidance about MEV and protective measures.

> "Mempool exposure: When a swap enters the public mempool, it can be seen publicly and acted on before it's confirmed. Bots may frontrun or sandwich the transaction, causing it to fail or settle at a worse rate."

{% endstep %}

{% step %}
### Coordinated Liquidation Hunting on X

[Post by @Cbb0fe](https://x.com/Cbb0fe/status/1992681998754701542)

> "If you are willing to hunt this dude with size, drop a DM, setting up a team right now and already got good size."

The trader was eventually blown into a huge loss.

{% endstep %}

{% step %}
### James Wynn — Targeted for Liquidation

[Post by @jameswynnreal](https://x.com/jameswynnreal/status/1929577589728797029)

> "They coming for me again? Liquidation price: 103,612"

They eventually went for him and got him liquidated.

{% endstep %}
{% endstepper %}

{% hint style="info" %}
These examples were sourced from X (fmr. Twitter) and protocol blogs. Many traders in the industry use X as a form of journal, and we see real trades that are provable on-chain.
{% endhint %}

---

## 2.3 Solution Landscape & Competition

{% tabs %}
{% tab title="Flashbots / MEV-Protect" %}
### Competitor 1: Flashbots / MEV-Protect / Bundles

**Their solution:** Private bundles and builder/searcher marketplace (Flashbots MEV relays, MEV-Inspect/Explore). These tools provide a path to avoid public mempool exposure by submitting bundles directly to builders.

**Why it's insufficient for Susanoo's use case:**

- Still requires **trust in the relay/builder** — not cryptographic privacy
- Private bundles reduce mempool exposure but do **not cryptographically hide order intent** or enable complex logic like secret stop-loss logic executed trustlessly
- Not native to Uniswap V4 hooks; integration surface differs for limit-order hooks

{% endtab %}

{% tab title="CoW Protocol" %}
### Competitor 2: CoW Protocol (CoW Swap / MEV Blocker)

**Their solution:** Intent-based batching and solver auction which eliminates classic sandwich profitability by batching and auctioning execution across solvers.

**Why it's insufficient:**

- Requires **re-routing orderflow** to a different settlement primitive (batch auctions), not a drop-in Uniswap V4 hook
- Good for swaps/intent, but doesn't provide **cryptographic secrecy** for off-chain order details or allow private limit orders within Uniswap V4 without major UX flow changes

{% endtab %}

{% tab title="Eden / Private RPCs / Jito" %}
### Competitor 3: Eden Network / Private RPCs / Jito

**Their solution:** Private transaction lanes and private RPCs to route transactions away from public mempool exposure. Eden, Jito (Solana), and RPC protectors like Blocknative provide this.

**Why it's insufficient:**

- **Centralization:** You must trust the private relay not to leak or reorder
- Effective for single-tx privacy but do **not enable on-chain, verifiable execution semantics** for encrypted limit orders or FHE-based order logic
- Not a cryptographic, blockchain-native way to hide intent while still allowing DeFi hooks to evaluate orders on-chain

{% endtab %}
{% endtabs %}

### The Gap

{% hint style="info" %}
Existing solutions reduce exposure but are either **(a)** flow-breaking (batch auctions), **(b)** trust-based (private relays), or **(c)** incomplete for complex on-chain limit order semantics.

That's why cryptographic approaches (FHE) + native Uniswap V4 hooks are a differentiated proposition for Susanoo.
{% endhint %}
