---
description: Transparent documentation of known risks, edge cases, and how they are handled.
icon: triangle-exclamation
---

# Known Risks & Mitigations

## Economic Risks

### No Slippage Protection on Order Execution

**Risk:** When an order executes, it uses the maximum possible slippage tolerance (`MIN_SQRT_PRICE + 1` or `MAX_SQRT_PRICE - 1`). In volatile markets, this could result in significantly worse execution prices.

**Mitigation:** This is a known limitation of the current implementation. A future version could allow users to specify an encrypted slippage tolerance alongside their trigger tick.

**Severity:** Medium

---

### Execution Delay

**Risk:** The asynchronous FHE decryption process introduces a minimum 1-transaction delay between trigger detection and order execution. During this delay, the price may continue to move, potentially resulting in execution at a price worse than the trigger.

**Mitigation:** The delay is inherent to the FHE model. Users should account for this when setting trigger prices. The `flushOrder` function allows manual queue processing to minimize delay.

**Severity:** Low-Medium

---

### Public Trade Amounts

**Risk:** While trigger prices and order types are encrypted, trade amounts are public. A sophisticated observer could correlate large order amounts with trading patterns or use amount visibility to make inferences about the order placer's strategy.

**Mitigation:** Future integration with FHEERC20 tokens could encrypt amounts as well. For now, users should be aware that amounts are visible.

**Severity:** Low

## Technical Risks

### Fhenix Network Availability

**Risk:** If the Fhenix threshold decryption network is unavailable or slow, orders will remain queued indefinitely. They will not execute until decryption results are returned.

**Mitigation:** The queue system preserves order integrity. Once the network recovers, pending items will be processed in order. No orders are lost.

**Severity:** Medium

---

### Gas Limit on Queue Processing

**Risk:** If many orders are queued for a single pool, processing all of them in a single `beforeSwap` call may exceed the block gas limit, leaving some orders unprocessed.

**Mitigation:** The queue processes sequentially and stops gracefully when an item hasn't been decrypted yet. Remaining items carry over to the next transaction. The `flushOrder` function can also be called independently.

**Severity:** Low

---

### Order Evaluation on Every Swap

**Risk:** Every swap in a pool evaluates all active orders, even those far from triggering. With many active orders, this increases gas costs for every swap in that pool.

**Mitigation:** This is a fundamental trade-off of the FHE privacy model (encrypted triggers cannot be pre-filtered). Gas optimization through batched FHE operations is on the roadmap.

**Severity:** Medium (for pools with many active orders)

## Trust Assumptions

### Fhenix Threshold Decryption

**Risk:** If a majority of Fhenix threshold decryption nodes collude, they could theoretically decrypt encrypted order parameters (trigger prices and order types).

**Mitigation:** Fhenix uses a distributed threshold scheme where no single node can decrypt independently. The security of this system depends on the honest majority assumption of the Fhenix network.

**Severity:** Medium (depends on Fhenix network security)

---

### Mock vs. Production FHE

**Risk:** Local testing uses mock FHE contracts that simulate encryption/decryption. Behavior on the real Fhenix network may differ in timing, gas costs, and edge cases.

**Mitigation:** Testnet deployment on Arbitrum Sepolia uses real Fhenix infrastructure. Always test on testnet before any production use.

**Severity:** Low (testing concern only)
