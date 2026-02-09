---
description: Required tools and setup before working with Susanoo.
icon: list-check
---

# Prerequisites

Before you begin, make sure you have the following installed and configured.

## Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | v16+ | Frontend and cofhe.js SDK |
| [Foundry](https://book.getfoundry.sh/getting-started/installation) | Latest | Smart contract compilation, testing, and deployment |
| [Git](https://git-scm.com/) | Latest | Repository management and submodule handling |

## Network Access

{% tabs %}
{% tab title="Local Development" %}
For local development, you'll use **Anvil** (included with Foundry) as your local blockchain. No external network access is required.

```bash
# Verify Anvil is installed
anvil --version
```
{% endtab %}

{% tab title="Testnet (Arbitrum Sepolia)" %}
For testnet deployment and the live frontend, you need:

- **Arbitrum Sepolia RPC URL** (e.g., `https://sepolia-rollup.arbitrum.io/rpc`)
- **Testnet ETH** on Arbitrum Sepolia for gas fees
- **A private key** for transaction signing

You can get testnet ETH from the [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia).
{% endtab %}
{% endtabs %}

## Fhenix Dependencies

Susanoo relies on Fhenix's FHE tooling:

- **cofhe.js** (client-side): Used to encrypt order parameters before submission. Installed automatically via `npm install` in the client directory.
- **cofhe-contracts** (on-chain): The FHE Solidity library for encrypted operations. Included as a git submodule.
- **cofhe-mock-contracts** (testing): Mock FHE contracts for local testing with Foundry. Included as a git submodule.

{% hint style="warning" %}
The mock FHE contracts simulate encryption/decryption with configurable delays. Real FHE network behavior will differ in timing and gas costs.
{% endhint %}

## Wallet Setup

For the frontend application, you need a wallet with:

- A private key exported and available for the `.env` file
- The wallet connected to Arbitrum Sepolia (Chain ID: 421614)

{% hint style="danger" %}
Never use a private key that holds real funds for development or testing. Use a dedicated development wallet.
{% endhint %}
