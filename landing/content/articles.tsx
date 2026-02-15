import React from "react";

export type ArticleSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  pills: string[];
  sections: ArticleSection[];
  footerNote?: string;
};

export const ARTICLES: Record<string, Article> = {
  "how-it-works": {
    slug: "how-it-works",
    title: "How We Built Private Limit Orders on Uniswap v4 with FHE",
    description:
      "Onchain limit orders leak strategy. Susanoo keeps triggers, direction, and timing private using FHE—while executing atomically inside Uniswap v4.",
    pills: ["Uniswap v4", "FHE", "MEV-resistant", "Private intent"],
    sections: [
      {
        id: "why",
        title: "Why limit orders break on public blockchains",
        content: (
          <>
            <p>
              Every onchain limit order today leaks information such as trigger
              price, order direction, size, and timing. That data is visible to
              every searcher, MEV bot, and adversarial counterparty.
            </p>
            <p>
              If you place a stop-loss or take-profit on a public chain, you’re
              effectively broadcasting your strategy to the entire market.
            </p>
            <p className="mt-4">That creates systemic problems:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>MEV bots can front-run or back-run the order</li>
              <li>Other traders can copy or countertrade your strategy</li>
              <li>Liquidity can be manipulated around known triggers</li>
              <li>
                Large traders can’t place orders without signalling to the entire
                market
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "why-fixes-fail",
        title: "Why existing fixes don’t solve this",
        content: (
          <>
            <p>There are three common approaches today:</p>
            <ol className="list-decimal ml-6 mt-3 space-y-2">
              <li>
                <strong>CEXs</strong>: hide your orders, but custody your funds.
              </li>
              <li>
                <strong>RFQ / offchain orderbooks</strong>: hide your intent, but
                break composability and push execution offchain.
              </li>
              <li>
                <strong>Private mempools / relays</strong>: hide transactions,
                not the state—your limit price is still visible onchain.
              </li>
            </ol>
            <p className="mt-4">
              None of these gives you onchain, non-custodial, private execution.
              That’s the missing primitive.
            </p>
          </>
        ),
      },
      {
        id: "what-fhe-changes",
        title: "What FHE changes",
        content: (
          <>
            <p>
              Fully Homomorphic Encryption (FHE) allows computation on encrypted
              values. You can store trigger prices, order type, and execution
              logic encrypted, and still evaluate whether conditions are true
              without decrypting the data.
            </p>
            <p className="mt-4">
              Susanoo uses Fhenix’s FHE coprocessor to make this practical
              onchain.
            </p>
          </>
        ),
      },
      {
        id: "flow",
        title: "How Susanoo works",
        content: (
          <>
            <ol className="list-decimal ml-6 space-y-3">
              <li>
                <strong>Order placement</strong>: the user encrypts their trigger
                tick, order type (stop-loss or take-profit), and parameters in
                the frontend (via <code>cofhe.js</code>). Only ciphertext is
                stored onchain.
              </li>
              <li>
                <strong>Condition checking</strong>: on every swap, the hook
                receives the current Uniswap price tick and homomorphically
                evaluates whether the encrypted condition has been met—without
                exposing trigger values.
              </li>
              <li>
                <strong>Threshold decryption</strong>: if the condition evaluates
                to true, the Fhenix network produces a decryption share that
                confirms the order should execute without revealing why.
              </li>
              <li>
                <strong>Atomic execution</strong>: on the next hook callback,
                Susanoo executes the trade atomically inside Uniswap, with full
                slippage protection. To observers it looks like a normal swap.
              </li>
            </ol>
          </>
        ),
      },
      {
        id: "different",
        title: "Why this is different",
        content: (
          <>
            <p>
              Susanoo isn’t just MEV protection. It’s a new execution primitive:
              <strong> private onchain intent</strong>.
            </p>
            <p className="mt-4">This enables:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Stop-losses that can’t be hunted</li>
              <li>Take-profits that can’t be gamed</li>
              <li>Large orders that don’t leak</li>
              <li>Institutions to use AMMs without signalling</li>
            </ul>
            <p className="mt-4">
              And because it’s a Uniswap v4 hook, it remains fully composable.
            </p>
          </>
        ),
      },
      {
        id: "tradeoffs",
        title: "Tradeoffs",
        content: (
          <>
            <p>
              FHE has costs. There’s a real tradeoff, but it’s a small price to
              eliminate strategy leakage and MEV extraction.
            </p>
            <p className="mt-4">
              Today, the overhead is roughly <strong>15–20%</strong> additional
              gas per order and <strong>1–2 blocks</strong> of decryption latency,
              and it should improve as the underlying systems mature.
            </p>
          </>
        ),
      },
      {
        id: "what-it-means",
        title: "What Susanoo means",
        content: (
          <>
            <p>Private limit orders are just the first application.</p>
            <p className="mt-4">The same architecture enables:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Private liquidation triggers and hidden LP ranges</li>
              <li>Encrypted trading strategies</li>
              <li>Dark-pool style execution on public chains</li>
            </ul>
            <p className="mt-4">
              Susanoo is not a feature. It is the first real private execution
              layer for DeFi.
            </p>
          </>
        ),
      },
    ],
    footerNote:
      "This article is provided for clarity and education. It may be updated as the protocol evolves.",
  },
};

