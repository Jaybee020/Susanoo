---
description: Deploy the full Susanoo ecosystem locally with Anvil and run through test scenarios.
icon: flask
---

# Local Deployment & Testing

This guide covers deploying Susanoo to a local Anvil instance and running through common testing scenarios.

## Full Ecosystem Deployment

The simplest way to deploy everything at once:

{% stepper %}
{% step %}
## Start Anvil

```bash
anvil
```

This starts a local blockchain at `http://localhost:8545` with 10 pre-funded accounts (10,000 ETH each).
{% endstep %}

{% step %}
## Deploy with the Anvil Script

```bash
forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

This deploys:
- Uniswap V4 Pool Manager and routers
- Susanoo hook contract (address-mined for correct hook flags)
- Two test tokens (ETHJ and MEME)
- A pool initialized at 1:1 price with full-range liquidity
{% endstep %}

{% step %}
## Save the Addresses

Copy the output addresses into `script/base/Config.sol`:

```solidity
IHooks hookContract = IHooks(0x...);          // Susanoo hook
Currency currency0 = Currency.wrap(0x...);     // ETHJ token
Currency currency1 = Currency.wrap(0x...);     // MEME token
IPositionManager posm = IPositionManager(0x...);
```
{% endstep %}
{% endstepper %}

## Step-by-Step Deployment (Alternative)

If you prefer deploying each component individually:

```bash
# 1. Deploy the hook
forge script script/01_DeployHook.s.sol --rpc-url http://localhost:8545 --broadcast

# 2. Deploy test tokens
forge script script/02_DeployTokens.s.sol --rpc-url http://localhost:8545 --broadcast

# 3. Update Config.sol with addresses, then:

# 4. Create pool
forge script script/03_CreatePool.s.sol --rpc-url http://localhost:8545 --broadcast

# 5. Add liquidity
forge script script/04_AddLiquidity.s.sol --rpc-url http://localhost:8545 --broadcast
```

## Pool Configuration

| Parameter | Value |
|-----------|-------|
| Fee tier | 3,000 (0.30%) |
| Tick spacing | 60 |
| Initial price | 1:1 (`SQRT_PRICE_1_1`) |
| Hook flags | `AFTER_INITIALIZE`, `BEFORE_SWAP`, `AFTER_SWAP` |
| Liquidity range | Full range (`minUsableTick(60)` to `maxUsableTick(60)`) |

## Testing Scenarios

### Scenario 1: Take Profit Execution

A take-profit order triggers when the price moves favorably past the trigger tick.

1. Place order with `triggerTick = -100`, `isTakeProfit = true`, `zeroForOne = false`
2. Execute a swap that increases the token price (moves tick downward past -100)
3. Wait for decryption (simulated by advancing time in tests)
4. Execute another swap to trigger `beforeSwap` queue processing
5. Verify the order status changed to `Executed`

### Scenario 2: Stop Loss Execution

A stop-loss order triggers when the price moves unfavorably past the trigger tick.

1. Place order with `triggerTick = 50`, `isTakeProfit = false`, `zeroForOne = false`
2. Execute a swap that decreases the token price (moves tick upward past 50)
3. Process the decryption queue
4. Verify execution

### Scenario 3: Order Does NOT Trigger

Verify that orders don't execute when conditions aren't met.

1. Place order with a trigger tick far from the current price
2. Execute a small swap that doesn't reach the trigger
3. Verify the order remains in `Placed` status

### Scenario 4: Multiple Orders

Test that multiple orders from different users interact correctly.

1. Alice places a take-profit order
2. Bob places a stop-loss order
3. Execute a swap that triggers one but not the other
4. Verify correct execution of only the triggered order

## Running the Test Suite

```bash
# Run all tests with verbose output
forge test -vvv

# Run a specific test
forge test --match-test testPlaceEncryptedOrder -vvvv

# Run with gas reporting
forge test --gas-report
```

### Test Coverage

| Test | What It Verifies |
|------|-----------------|
| `testPlaceEncryptedOrder` | Encrypted order creation and storage |
| `testOrderPrivacy` | Different users' encrypted values are distinct |
| `testDecryptionQueue` | Queue population after swap triggers |
| `testAsyncDecryptionAndExecution` | Full lifecycle: place, trigger, decrypt, execute |
| `testMultipleEncryptedOrders` | Multiple orders with different trigger conditions |
| `testTriggerConditionLogic_takeProfitExecute` | Take profit executes when conditions are met |
| `testTriggerConditionLogic_stopLossExecute` | Stop loss executes when conditions are met |
| `testTriggerConditionLogic_takeProfitNotExecute` | Take profit does NOT execute when conditions are not met |
| `testTriggerConditionLogic_stopLossNotExecute` | Stop loss does NOT execute when conditions are not met |

{% hint style="info" %}
The test suite uses `CoFheTest` from `cofhe-mock-contracts` which provides helper functions like `createInEuint32` and `assertHashValue` for working with mock FHE values.
{% endhint %}

## Useful Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| Execute swap | `forge script script/06_ExecuteSwap.s.sol --rpc-url http://localhost:8545 --broadcast` | Move the pool price |
| Flush orders | `forge script script/07_FlushOrders.s.sol --rpc-url http://localhost:8545 --broadcast` | Process the decryption queue |
| Get quote | `forge script script/08_GetQuote.s.sol --rpc-url http://localhost:8545` | Check pool state and queue length |
| Debug contracts | `forge script script/DebugContracts.s.sol --rpc-url http://localhost:8545` | Inspect deployed contract state |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Hook contract not set" | Update `Config.sol` with deployed hook address |
| "Currency not set" | Update `Config.sol` with token addresses |
| "Pool not initialized" | Run the `CreatePool` script first |
| "Insufficient allowance" | Approve tokens for the hook contract |
| "Queue is empty" | Orders may have already been processed |
| Gas estimation failures | Add `--legacy` flag or set `--gas-limit 10000000` |

## Testnet Deployment

For Arbitrum Sepolia deployment:

```bash
export RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
export PRIVATE_KEY="your_private_key"

forge script script/TestnetDeploy.s.sol --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast
```

Save the deployed addresses to `Config.sol` and update the frontend constants in `client/src/utils/constants.ts`.
