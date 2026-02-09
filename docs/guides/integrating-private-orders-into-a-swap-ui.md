---
description: Step-by-step guide to integrating Susanoo's encrypted limit orders into a custom frontend.
icon: code
---

# Integrating Private Orders into a Swap UI

This guide walks you through building a custom frontend that creates encrypted limit orders using the Susanoo hook. By the end, you'll have a working integration that encrypts order parameters client-side and submits them on-chain.

## Overview

The integration involves three layers:

1. **cofhe.js** - Encrypts trigger parameters before they touch the blockchain
2. **ethers.js** - Interacts with the Susanoo smart contract
3. **Your UI** - Collects order parameters from the user

## Step 1: Install Dependencies

```bash
npm install cofhejs ethers
```

## Step 2: Initialize cofhe.js

Before encrypting any data, initialize the FHE SDK with a signer:

```typescript
import { cofhejs } from "cofhejs/web";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("YOUR_RPC_URL");
const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

await cofhejs.initializeWithEthers({
  ethersProvider: provider,
  ethersSigner: signer,
  environment: "TESTNET",
});
```

{% hint style="warning" %}
In a production app, use a browser wallet (MetaMask) instead of a hardcoded private key. Use `ethers.BrowserProvider(window.ethereum)` to get the signer.
{% endhint %}

## Step 3: Encrypt Order Parameters

The two values that must be encrypted are:

- **Trigger tick** (uint32): The price level at which the order should execute
- **Order type** (bool): `true` for Take Profit, `false` for Stop Loss

```typescript
import { Encryptable } from "cofhejs/web";

async function encryptOrderParams(triggerTick: number, isTakeProfit: boolean) {
  // Convert signed tick to unsigned range for FHE compatibility
  const TICK_OFFSET = 887272;
  const tickWithOffset = triggerTick + TICK_OFFSET;

  const encrypted = await cofhejs.encrypt([
    Encryptable.uint32(BigInt(tickWithOffset)),
    Encryptable.bool(isTakeProfit),
  ]);

  return {
    encryptedTriggerTick: encrypted.data[0],
    encryptedOrderType: encrypted.data[1],
  };
}
```

{% hint style="info" %}
The `TICK_OFFSET` of 887,272 is the absolute value of Uniswap's minimum tick. Adding this converts the signed int24 tick range to an unsigned uint32 range that FHE can work with.
{% endhint %}

## Step 4: Approve Token Transfer

Before placing an order, approve the hook contract to transfer your tokens:

```typescript
import { MaxUint256 } from "ethers";

const ERC20_ABI = [
  "function approve(address spender, uint256 value) returns (bool)",
];

const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
await tokenContract.approve(HOOK_ADDRESS, MaxUint256);
```

## Step 5: Submit the Order

Call `placeOrder` on the Susanoo contract with the encrypted parameters:

```typescript
import SusanooABI from "./abi.json";

const susanoo = new ethers.Contract(HOOK_ADDRESS, SusanooABI.abi, signer);

const tx = await susanoo.placeOrder(
  poolKey,                           // { currency0, currency1, fee, tickSpacing, hooks }
  false,                             // zeroForOne (false = selling token1 for token0)
  encryptedData.encryptedTriggerTick,
  encryptedData.encryptedOrderType,
  ethers.parseEther("1.0"),          // amount in wei
  { gasLimit: 30000000 }
);

const receipt = await tx.wait();
```

## Step 6: Extract the Order ID

Parse the `OrderPlaced` event from the transaction receipt:

```typescript
const orderPlacedEvent = receipt.logs.find((log) => {
  try {
    const parsed = susanoo.interface.parseLog(log);
    return parsed?.name === "OrderPlaced";
  } catch {
    return false;
  }
});

if (orderPlacedEvent) {
  const parsed = susanoo.interface.parseLog(orderPlacedEvent);
  const orderId = parsed.args.orderId.toString();
  console.log("Order created:", orderId);
}
```

## Complete Example

<details>
<summary>Full integration code</summary>

```typescript
import { cofhejs, Encryptable } from "cofhejs/web";
import { ethers, MaxUint256 } from "ethers";
import SusanooABI from "./abi.json";

const HOOK_ADDRESS = "0x569b28A558D1229E172E77202D580052179d10c0";
const TICK_OFFSET = 887272;

async function createPrivateOrder(
  rpcUrl: string,
  privateKey: string,
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
  },
  triggerTick: number,
  isTakeProfit: boolean,
  amountInEther: string
) {
  // 1. Setup
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);

  // 2. Initialize FHE
  await cofhejs.initializeWithEthers({
    ethersProvider: provider,
    ethersSigner: signer,
    environment: "TESTNET",
  });

  // 3. Encrypt
  const encrypted = await cofhejs.encrypt([
    Encryptable.uint32(BigInt(triggerTick + TICK_OFFSET)),
    Encryptable.bool(isTakeProfit),
  ]);

  // 4. Approve token
  const tokenAddress = poolKey.currency1; // selling token1
  const erc20 = new ethers.Contract(
    tokenAddress,
    ["function approve(address,uint256) returns (bool)"],
    signer
  );
  await (await erc20.approve(HOOK_ADDRESS, MaxUint256)).wait();

  // 5. Place order
  const susanoo = new ethers.Contract(HOOK_ADDRESS, SusanooABI.abi, signer);
  const tx = await susanoo.placeOrder(
    poolKey,
    false,
    encrypted.data[0],
    encrypted.data[1],
    ethers.parseEther(amountInEther),
    { gasLimit: 30000000 }
  );

  const receipt = await tx.wait();

  // 6. Get order ID
  for (const log of receipt.logs) {
    try {
      const parsed = susanoo.interface.parseLog(log);
      if (parsed?.name === "OrderPlaced") {
        return parsed.args.orderId.toString();
      }
    } catch {}
  }

  throw new Error("OrderPlaced event not found");
}
```

</details>

## Calculating Trigger Ticks from Percentages

To convert a percentage-based input ("10% take profit") to a tick value:

```typescript
function calculateTargetTick(
  currentTick: number,
  percentage: number,
  isTakeProfit: boolean
): number {
  // Each tick represents ~0.01% price change
  // percentage * 100 gives approximate tick delta
  const tickDelta = Math.round(percentage * 100);

  return isTakeProfit
    ? currentTick + tickDelta   // Price must go up for take profit
    : currentTick - tickDelta;  // Price must go down for stop loss
}
```

## Next Steps

- [Reading Encrypted Order Data](reading-encrypted-order-data.md) - View your own encrypted orders
- [Susanoo.sol Reference](../api-reference/susanoo-hook.md) - Full contract API
