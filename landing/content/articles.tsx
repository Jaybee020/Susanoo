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

export const ARTICLES = {
  "how-it-works": {
    slug: "how-it-works",
    title: "How We Built Private Limit Orders on Uniswap v4 with FHE",
    description:
      "Onchain limit orders leak strategy. Susanoo keeps triggers, direction, and timing private using FHE—while executing atomically inside Uniswap v4.",
    pills: ["Uniswap v4", "FHE", "MEV-resistant", "Private intent"],
    sections: [
      {
        id: "why-we-built",
        title: "Why we built Susanoo",
        content: (
          <>
            <p>
              Most people think limit orders are a solved problem, but in DeFi,
              they are not. Every onchain limit order today leaks information
              such as trigger price, order direction, size, and timing. That
              data is visible to every searcher, MEV bot, and adversarial
              counterparty.
            </p>
            <p className="mt-4">
              If you place a stop-loss or take-profit on a public chain, you are
              effectively broadcasting your strategy to the entire market. That
              is why sophisticated traders avoid onchain limit orders. They
              either trade on centralized exchanges or use offchain RFQ systems
              that sacrifice composability and decentralization.
            </p>
            <p className="mt-4">
              We built Susanoo because we think that trade-off is unnecessary.
            </p>
          </>
        ),
      },
      {
        id: "why",
        title: "Why limit orders break on public blockchains",
        content: (
          <>
            <p>
              A limit order is not just an instruction. It is a piece of intent
              that demonstrates what is to be executed, such as:
            </p>
            <p className="mt-4 italic">"When price hits X, do Y."</p>
            <p className="mt-4">
              On Ethereum-style blockchains, that intent has to live onchain in
              plaintext. That creates four systemic problems:
            </p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>MEV bots can front-run or back-run the order</li>
              <li>Other traders can copy or countertrade your strategy</li>
              <li>Liquidity can be manipulated around known triggers</li>
              <li>
                Large traders cannot place orders without signalling to the
                entire market
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "why-fixes-fail",
        title: "Why existing fixes don't solve this",
        content: (
          <>
            <p>There are three ways people try to fix this today:</p>
            <ol className="list-decimal ml-6 mt-3 space-y-2">
              <li>
                <strong>CEXs</strong>: They hide your orders, but they custody
                your funds.
              </li>
              <li>
                <strong>RFQ / offchain orderbooks</strong>: They hide your
                intent, but they break composability and push execution
                offchain.
              </li>
              <li>
                <strong>Private mempools / relays</strong>: They hide
                transactions, not the state. Your limit price is still visible
                onchain.
              </li>
            </ol>
            <p className="mt-4">
              None of these gives you onchain, non-custodial, private execution.
              That is the missing primitive.
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
              Fully Homomorphic Encryption (FHE) allows you to compute on
              encrypted values. That means you can store a trigger price, an
              order type (stop-loss or take-profit), and execution logic in
              encrypted form, and still evaluate whether a condition is true
              without ever decrypting the data.
            </p>
            <p className="mt-4">
              This is how we use FHE to cryptographically enforce privacy in
              Susanoo. We use Fhenix's FHE coprocessor to make this practical
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
            <p>
              Susanoo is a Uniswap v4 hook that manages encrypted limit orders.
              Here is the flow of the app:
            </p>
            <ol className="list-decimal ml-6 space-y-3 mt-4">
              <li>
                <strong>Order placement</strong>: The user encrypts their
                trigger tick, order type (stop-loss or take-profit), and order
                parameters in the frontend using Fhenix's <code>cofhe.js</code>.
                Only the ciphertext is stored onchain.
              </li>
              <li>
                <strong>Condition checking</strong>: On every swap, the hook
                receives the current Uniswap price tick. We homomorphically
                evaluate:
                <ul className="list-disc ml-6 mt-3 space-y-2">
                  <li>Has the price crossed the trigger?</li>
                  <li>Is it a stop-loss or a take-profit?</li>
                  <li>Should this order fire?</li>
                </ul>
                <p className="mt-3">
                  All of this happens on encrypted data where no validator, no
                  searcher, and no LP sees the trigger price.
                </p>
              </li>
              <li>
                <strong>Threshold decryption</strong>: If the condition
                evaluates to "true", the Fhenix network produces a decryption
                share confirming that the order should execute without revealing
                why.
              </li>
              <li>
                <strong>Atomic execution</strong>: On the next hook callback,
                Susanoo executes the trade atomically inside Uniswap with full
                slippage protection. From the outside, all anyone sees is a
                normal Uniswap swap. They never see the trigger, the strategy,
                and the order logic.
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
              Susanoo is not just MEV protection. It is our approach to a new
              execution primitive: <strong>private onchain intent</strong>.
            </p>
            <p className="mt-4">This enables:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Stop-losses that cannot be hunted</li>
              <li>Take-profits that cannot be gamed</li>
              <li>Large orders that do not leak</li>
              <li>Institutions to use AMMs without signalling</li>
            </ul>
            <p className="mt-4">
              And because it is a Uniswap v4 hook, it remains fully composable.
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
              FHE has costs. We will not deny that there is a small tradeoff,
              but we think it is a small price for eliminating strategy leakage
              and MEV extraction.
            </p>
            <p className="mt-4">
              Currently, FHE costs roughly <strong>15-20%</strong> gas overhead
              per order and <strong>1-2 blocks</strong> of decryption latency.
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
  "intent-layer": {
    slug: "intent-layer",
    title: "The Intent Layer Is Broken: Why DeFi Needs Private Execution",
    description:
      "Transparency was the promise of DeFi, but public intent has become a tax for serious traders. We break down why MEV is structural and why private execution must be a native primitive.",
    pills: ["MEV", "Private execution", "DeFi", "FHE"],
    sections: [
      {
        id: "transparency-tax",
        title: "Transparency has become a tax",
        content: (
          <>
            <p>
              DeFi is transparent. That was the original promise. But for
              traders, transparency has turned into a tax they pay on every
              execution, and that cost compounds over time.
            </p>
          </>
        ),
      },
      {
        id: "mev-structural",
        title: "MEV is part of the system",
        content: (
          <>
            <p>When you trade on a DEX, every part of your intent is public:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Your price</li>
              <li>Your size</li>
              <li>Your direction</li>
              <li>Your timing</li>
            </ul>
            <p className="mt-4">
              Bots do not need to predict your moves because they can literally
              read you in the mempool.
            </p>
            <p className="mt-4">That is why:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Sandwich attacks exist</li>
              <li>Stop-losses get hunted</li>
              <li>Large orders get pre-positioned against</li>
            </ul>
            <p className="mt-4">
              MEV is not merely about reordering transactions. It is about
              exploiting visible intents that leak from execution.
            </p>
          </>
        ),
      },
      {
        id: "cex-gravity",
        title: "Why users keep going back to CEXs",
        content: (
          <>
            <p>
              Centralized exchanges are opaque, which is bad for trust, but that
              same opacity shields traders by hiding:
            </p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Order books</li>
              <li>Trigger prices</li>
              <li>Liquidation levels</li>
              <li>Strategies</li>
            </ul>
            <p className="mt-4">
              So traders are forced to choose: transparency with MEV, or privacy
              with custody risk. DeFi still does not offer a third option.
            </p>
          </>
        ),
      },
      {
        id: "missing-layer",
        title: "The missing private execution layer",
        content: (
          <>
            <p>
              Blockchains gave us trustless settlement, censorship resistance,
              and composability. What they did not provide is private intent,
              private triggers, or private execution. That missing capability
              keeps derivatives, limit orders, and professional trading
              offchain—not because DeFi cannot support them, but because it
              leaks too much data.
            </p>
          </>
        ),
      },
      {
        id: "fhe-changes",
        title: "What FHE changes",
        content: (
          <>
            <p>
              Fully Homomorphic Encryption lets blockchains compute on encrypted
              data. Prices can stay hidden, logic can stay hidden, and
              strategies can stay hidden while still executing onchain. Privacy
              becomes a native execution primitive that applications can build
              into their flows.
            </p>
          </>
        ),
      },
      {
        id: "susanoo-test",
        title: "Susanoo is the first real test",
        content: (
          <>
            <p>
              With Susanoo, limit orders no longer live in the public state. The
              chain knows an order exists and that it should execute, but it
              never learns:
            </p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>At what price</li>
              <li>Why it should trigger</li>
              <li>How the trader designed it</li>
            </ul>
            <p className="mt-4">That is what private execution looks like.</p>
          </>
        ),
      },
      {
        id: "long-term",
        title: "Why this matters long-term",
        content: (
          <>
            <p>Once intent can stay private, traders gain access to:</p>
            <ul className="list-disc ml-6 mt-3 space-y-2">
              <li>Fair liquidation systems</li>
              <li>Dark-pool style AMMs</li>
              <li>Institutional-grade DeFi</li>
              <li>Strategies that are harder to copy or attack</li>
            </ul>
            <p className="mt-4">This is how DeFi grows beyond retail.</p>
          </>
        ),
      },
    ],
    footerNote:
      "This article is provided for clarity and education. It may be updated as the protocol evolves.",
  },
};
