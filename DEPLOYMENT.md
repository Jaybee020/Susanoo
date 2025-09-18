# Susanoo Local Deployment Guide

## Quick Start

### 1. Start Local Blockchain
```bash
anvil
```

### 2. Deploy Complete Ecosystem
```bash
forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast -vv
```

---

## Deployment Information

### Core Contracts

| Contract | Address | Description |
|----------|---------|-------------|
| Pool Manager | `0x5FbDB2315678afecb367f032d93F642f64180aa3` | Uniswap V4 Pool Manager |
| Susanoo Hook | `[Generated via mining]` | Private limit order hook |
| Position Manager | `[Deployed during setup]` | Liquidity position management |
| Permit2 | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` | Token approval management |

### Test Tokens

| Token | Symbol | Address | Supply |
|-------|--------|---------|--------|
| Ethereum-Jay | ETHJ | `[Token0 Address]` | 1,000,000 tokens |
| Meme Token | MEME | `[Token1 Address]` | 1,000,000 tokens |

### Router Contracts

| Router | Address | Purpose |
|--------|---------|---------|
| LP Router | `[Deployed]` | Liquidity modifications |
| Swap Router | `[Deployed]` | Swap execution |
| Donate Router | `[Deployed]` | Pool donations |

---

## Configuration Template

After deployment, update `script/base/Config.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

import {Constants} from "./Constants.sol";

abstract contract Config is Constants {
    // UPDATE THESE ADDRESSES AFTER DEPLOYMENT
    IHooks hookContract = IHooks(0x[SUSANOO_HOOK_ADDRESS]);
    Currency currency0 = Currency.wrap(0x[TOKEN0_ADDRESS]); // ETHJ
    Currency currency1 = Currency.wrap(0x[TOKEN1_ADDRESS]); // MEME
    IPositionManager posm = IPositionManager(0x[POSITION_MANAGER_ADDRESS]);

    // Computed values
    IERC20 token0 = IERC20(Currency.unwrap(currency0));
    IERC20 token1 = IERC20(Currency.unwrap(currency1));
}
```

---

## Pool Configuration

### Pool Parameters
- **Fee Tier**: 3000 (0.30%)
- **Tick Spacing**: 60
- **Initial Price**: 1:1 (SQRT_PRICE_1_1)
- **Hook Flags**: AFTER_INITIALIZE | BEFORE_SWAP | AFTER_SWAP

### Liquidity Ranges
- **Full Range**: `[TickMath.minUsableTick(60), TickMath.maxUsableTick(60)]`
- **Initial Liquidity**: 100 ETH equivalent in both tokens

---

## Order System Configuration

### Order Types
- **Take Profit**: `ebool = true`
- **Stop Loss**: `ebool = false`

### Trigger Tick Encoding
```solidity
// Convert actual tick to encrypted format
uint32 encryptedTriggerTick = uint32(int32(actualTick) + int32(TICK_OFFSET));
```

### Direction Settings
- **zeroForOne = false**: Selling MEME for ETHJ (most common use case)
- **zeroForOne = true**: Selling ETHJ for MEME

---

## Script Usage Examples

### Place Encrypted Order
```bash
# Edit parameters in script/05_PlaceOrder.s.sol first:
# - triggerTick: Target price level
# - isTakeProfit: true/false
# - orderAmount: Amount to trade

forge script script/05_PlaceOrder.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Execute Market Swap
```bash
# Edit parameters in script/06_ExecuteSwap.s.sol:
# - zeroForOne: Direction
# - amountSpecified: Swap amount

forge script script/06_ExecuteSwap.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Monitor System
```bash
# Check pool status and queue length
forge script script/08_GetQuote.s.sol --rpc-url http://localhost:8545 --call

# Process pending orders
forge script script/07_FlushOrders.s.sol --rpc-url http://localhost:8545 --broadcast
```

---

## Step-by-Step Deployment (Alternative)

If you prefer individual deployment steps:

### 1. Deploy Hook
```bash
forge script script/01_DeployHook.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 2. Deploy Tokens
```bash
forge script script/02_DeployTokens.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 3. Update Config.sol
Copy addresses from deployment output and update `script/base/Config.sol`

### 4. Create Pool
```bash
forge script script/03_CreatePool.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 5. Add Liquidity
```bash
forge script script/04_AddLiquidity.s.sol --rpc-url http://localhost:8545 --broadcast
```

---

## Testing Scenarios

### Scenario 1: Take Profit Order
1. Place order with `triggerTick = 100`, `isTakeProfit = true`
2. Execute buy swap (ETHJ → MEME) to increase tick
3. Order should trigger when tick reaches 100

### Scenario 2: Stop Loss Order
1. Place order with `triggerTick = -100`, `isTakeProfit = false`
2. Execute sell swap (MEME → ETHJ) to decrease tick
3. Order should trigger when tick reaches -100

### Scenario 3: Queue Management
1. Place multiple orders
2. Execute triggering swaps
3. Monitor queue with `GetQuote.s.sol`
4. Flush queue with `FlushOrders.s.sol`

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Hook contract not set" | Update Config.sol with deployed hook address |
| "Currency not set" | Update Config.sol with token addresses |
| "Pool not initialized" | Run CreatePool script first |
| "Insufficient allowance" | Check token approvals |
| "Queue is empty" | Orders may have auto-executed |

### Gas Issues
```bash
# Use legacy gas estimation
forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast --legacy

# Set gas limit manually
forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast --gas-limit 10000000
```

### Debug Mode
```bash
# Maximum verbosity
forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast -vvvv
```

---

## Network Information

### Anvil Default Accounts
- **Account 0**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (10,000 ETH)
- **Account 1**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (10,000 ETH)
- **Account 2**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` (10,000 ETH)

### RPC Endpoints
- **Local**: `http://localhost:8545`
- **Chain ID**: 31337 (Anvil default)

---

## Security Notes

### Local Development Only
- These configurations are for **local testing only**
- Private keys are publicly known Anvil defaults
- **Never use these addresses or keys on mainnet**

### FHE Considerations
- Uses mock FHE contracts with simulated delays
- Real FHE networks will have different behavior
- Encryption/decryption timing may vary

---

## Next Steps

After successful local deployment:

1. **Test Order Flows**: Place and execute various order types
2. **Monitor Queue Behavior**: Watch decryption and execution patterns
3. **Stress Testing**: Place multiple orders and execute complex scenarios
4. **Gas Optimization**: Profile gas usage for optimization opportunities
5. **Testnet Deployment**: Deploy to Sepolia/Goerli for extended testing

---

## Support

For issues or questions:
- Check the [README.md](./script/README.md) for detailed script documentation
- Review the [test files](./script/Susanoo.t.sol) for usage examples
- Ensure all dependencies are installed via `forge install`