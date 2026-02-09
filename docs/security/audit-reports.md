---
description: Links to security audits and review reports for the Susanoo protocol.
icon: file-certificate
---

# Audit Reports

{% hint style="warning" %}
Susanoo has not yet undergone a formal security audit. The contracts are currently deployed on testnet only and should be considered experimental.
{% endhint %}

## Planned Audits

| Audit | Scope | Status |
|-------|-------|--------|
| Smart Contract Audit | `Susanoo.sol`, `Queue.sol` | Planned |
| FHE Integration Review | Homomorphic condition logic, access control patterns | Planned |
| Economic/Game Theory Review | MEV resistance claims, incentive alignment | Planned |

## Pre-Audit Measures

While a formal audit is pending, the following measures are in place:

- **Reentrancy protection** via OpenZeppelin's `ReentrancyGuardTransient`
- **Comprehensive test suite** covering encrypted order placement, condition evaluation, execution, and edge cases
- **Use of battle-tested libraries**: OpenZeppelin contracts, Uniswap V4 core, Solmate
- **FHE mock testing** with Fhenix's `CoFheTest` framework for encrypted value verification

## Reporting Vulnerabilities

If you discover a security vulnerability, please report it responsibly. See the [Bug Bounty Program](bug-bounty-program.md) page for details.

{% hint style="danger" %}
Do not use Susanoo with real funds until a formal audit has been completed. The current deployment is for testing and demonstration purposes only.
{% endhint %}
