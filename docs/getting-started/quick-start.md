---
description: Go from zero to a private encrypted limit order on testnet in under 15 minutes.
icon: bolt
---

# Quick Start: Your First Private Order

**Goal:** Execute your first FHE-encrypted limit order on the Susanoo hook, either locally with Anvil or on the Arbitrum Sepolia testnet.

{% hint style="info" %}
Make sure you've completed the [Prerequisites](prerequisites.md) and [Installation](installation.md) steps before starting.
{% endhint %}

## Option A: Using the Frontend (Recommended)

The fastest way to interact with Susanoo is through the web frontend.

{% stepper %}
{% step %}
## Set up environment variables

Create a `.env` file in the `client/` directory:

```bash
VITE_PRIVATE_KEY=your_private_key_here
VITE_PROVIDER_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
```

Replace `your_private_key_here` with the private key of a wallet that has testnet ETH and test tokens on Arbitrum Sepolia.
{% endstep %}

{% step %}
## Start the development server

```bash
cd client
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.
{% endstep %}

{% step %}
## Create your first private order

1. Enter the **Pool ID** or click "Use Default Pool" to use the pre-deployed pool
2. The pool info loads automatically, showing the current price and your token balances
3. Select an **Order Type**: Take Profit or Stop Loss
4. Choose a **Percentage** for your trigger (e.g., 10% take profit)
5. Enter the **Amount** of tokens to trade
6. Click **Create Order**

Behind the scenes, the frontend:
- Encrypts your trigger tick and order type using `cofhe.js`
- Approves the token transfer to the hook contract
- Submits the encrypted order on-chain
{% endstep %}

{% step %}
## Verify your order

Navigate to the Orders page (`/`). Your order appears with:
- **Public data**: Order ID, trader address, amount, status
- **Encrypted data**: Trigger tick and order type shown as locked

Click **Decrypt** to unseal your own order's private parameters. Only you (the order placer) can decrypt these values.
{% endstep %}
{% endstepper %}

## Option B: Local Deployment with Anvil

For a fully local experience without needing testnet access:

{% stepper %}
{% step %}
## Start Anvil

```bash
anvil
```

This starts a local blockchain on `http://localhost:8545` with pre-funded accounts.
{% endstep %}

{% step %}
## Deploy the full ecosystem

```bash
forge script script/Anvil.s.sol --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

{% hint style="info" %}
The private key above is Anvil's default Account 0. Never use this on a real network.
{% endhint %}

You'll see output like:

```
Currency currency0 = Currency.wrap(0x95401dc...);
Currency currency1 = Currency.wrap(0x998abeb...);
Pool initialized
Liquidity added

Susanoo ecosystem deployed successfully!

Update Config.sol with these addresses:
PoolManager poolManager = IPoolManager(0x84eA74d...);
IHooks hookContract = IHooks(0x303C556...);
```
{% endstep %}

{% step %}
## Update configuration

Copy the addresses from the deployment output into `script/base/Config.sol` for subsequent script interactions.
{% endstep %}

{% step %}
## Place an order via script

Edit the order parameters in `script/05_PlaceOrder.s.sol`, then run:

```bash
forge script script/05_PlaceOrder.s.sol --rpc-url http://localhost:8545 --broadcast
```
{% endstep %}

{% step %}
## Trigger and execute

Execute a market swap to move the price and trigger your order:

```bash
forge script script/06_ExecuteSwap.s.sol --rpc-url http://localhost:8545 --broadcast
```

Then flush the decryption queue:

```bash
forge script script/07_FlushOrders.s.sol --rpc-url http://localhost:8545 --broadcast
```
{% endstep %}
{% endstepper %}

## What Just Happened?

1. Your trigger price and order type were **encrypted client-side** using FHE before ever touching the blockchain
2. The encrypted order was stored on-chain; no one can read the trigger conditions
3. When a swap occurred, the hook **evaluated your conditions homomorphically** (on encrypted data)
4. The FHE network decrypted only the boolean result (execute or not), never your actual trigger price
5. On the next swap, the hook executed your order atomically

{% hint style="success" %}
You've just placed and executed a fully private limit order. Your trigger price and strategy were never exposed on-chain.
{% endhint %}

## Next Steps

- Learn the details: [The FHE Mechanism](../core-concepts/fhe-mechanism.md)
- Build a custom integration: [Integrating Private Orders into a Swap UI](../guides/integrating-private-orders-into-a-swap-ui.md)
- Understand the contracts: [Susanoo.sol Reference](../api-reference/susanoo-hook.md)
