---
description: Gas overhead, latency characteristics, and performance benchmarks for Susanoo.
icon: gauge-high
---

# Gas & Performance

FHE operations add computational overhead compared to plaintext limit orders. This page documents the performance characteristics developers should expect.

## Gas Overhead

| Operation | Approximate Overhead | Notes |
|-----------|---------------------|-------|
| Order placement | ~15-20% above a standard contract call | Includes FHE input processing and access control setup |
| Per-order evaluation (afterSwap) | Significant | 7 FHE operations per order (asEuint32, asEbool, gte/lte, and, not, select) |
| Decryption request | Moderate | One `FHE.decrypt()` call per evaluated order |
| Queue processing (beforeSwap) | Low | Reading decrypted results and conditional execution |
| Order execution swap | Standard Uniswap V4 swap gas | No FHE overhead on the actual swap |

{% hint style="info" %}
Gas costs for FHE operations depend on the Fhenix co-processor implementation. On testnets with mock contracts, gas is lower than production. Plan for higher gas on mainnet.
{% endhint %}

## Latency

| Metric | Value | Explanation |
|--------|-------|-------------|
| Encryption (client-side) | < 1 second | `cofhe.js` encrypts locally before submission |
| Decryption (Fhenix network) | 1-2 blocks | Threshold decryption takes at least one block |
| Order evaluation to execution | Minimum 1 transaction | Due to the async decrypt pattern |

The two-phase execution model means an order cannot trigger and execute in the same transaction. The sequence is:

1. **Transaction N**: Swap occurs, `afterSwap` evaluates orders and requests decryption
2. **Block(s) pass**: Fhenix network performs threshold decryption
3. **Transaction N+1**: Next swap's `beforeSwap` reads decrypted results and executes valid orders

## Scaling Considerations

### Orders Per Pool

Each swap evaluates **all active orders** for that pool in `afterSwap`. With N active orders:
- N homomorphic condition evaluations (7 FHE ops each)
- N decryption requests queued
- Gas scales linearly with the number of active orders

### Queue Depth

The decryption queue processes items sequentially until it hits an item that hasn't been decrypted yet. Deep queues from multiple rounds of evaluation without execution will process oldest items first.

### Batch Processing

The `flushOrder` function can be called independently to process the decryption queue outside of normal swap flow. This helps prevent queue buildup.

## Optimization Notes

| Technique | Status | Impact |
|-----------|--------|--------|
| FHE operation batching | Future | Could reduce per-order gas by grouping evaluations |
| Selective evaluation (skip orders far from trigger) | Not possible | Trigger prices are encrypted; cannot pre-filter |
| Gas-optimized queue processing | Current | Queue uses OpenZeppelin's `DoubleEndedQueue` for O(1) push/pop |
| Compiler optimization | Current | Foundry optimizer set to 800 runs with Cancun EVM target |

{% hint style="warning" %}
Because trigger prices are encrypted, the hook cannot skip orders that are "far" from triggering. Every active order must be evaluated on every swap. This is a fundamental trade-off of the FHE privacy model.
{% endhint %}

## Foundry Configuration

The project uses specific Foundry settings for FHE compatibility:

```toml
[profile.default]
solc_version = '0.8.26'
evm_version = "cancun"
optimizer_runs = 800
ffi = true          # Required for FHE system calls
isolate = true      # Required for FHE testing (prevents variable sharing)
```
