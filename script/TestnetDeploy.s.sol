// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

import {Constants} from "./base/Constants.sol";
import {Susanoo} from "../src/Susanoo.sol";
import {MockToken} from "../src/MockToken.sol";

/// @notice Testnet deployment script for Susanoo ecosystem
contract TestnetDeployScript is Script, Constants {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    struct DeploymentAddresses {
        address susanooHook;
        address token0;
        address token1;
        PoolId poolId;
    }

    /////////////////////////////////////
    // --- Parameters to Configure --- //
    /////////////////////////////////////

    // Token configurations
    string constant TOKEN0_NAME = "Wrapped Ethereum";
    string constant TOKEN0_SYMBOL = "WETH";
    uint8 constant TOKEN0_DECIMALS = 18;

    string constant TOKEN1_NAME = "Test Meme Token";
    string constant TOKEN1_SYMBOL = "TMEME";
    uint8 constant TOKEN1_DECIMALS = 18;

    // Pool configuration
    uint24 constant LP_FEE = 3000; // 0.30%
    int24 constant TICK_SPACING = 60;
    uint160 constant STARTING_PRICE = SQRT_PRICE_1_1; // 1:1 ratio

    // Token supply (adjust for testnet)
    uint256 constant INITIAL_SUPPLY = 1_000_000 ether; // 1M tokens

    /////////////////////////////////////

    function run() external returns (DeploymentAddresses memory addresses) {
        // Verify deployer has sufficient balance
        require(msg.sender.balance > 0.1 ether, "Insufficient ETH balance for deployment");

        vm.startBroadcast();
        // 1. Deploy Susanoo Hook
        addresses.susanooHook = address(deployHook());
        console.log("Susanoo Hook deployed:", addresses.susanooHook);

        // 2. Deploy Test Tokens
        (addresses.token0, addresses.token1) = deployTestTokens();
        console.log("Token0 (%s):", TOKEN0_SYMBOL, addresses.token0);
        console.log("Token1 (%s):", TOKEN1_SYMBOL, addresses.token1);

        // 3. Initialize Pool
        console.log("");
        console.log("Step 3: Initializing Pool...");
        addresses.poolId = initializePool(addresses.susanooHook, addresses.token0, addresses.token1);
        console.log("Pool initialized with ID:", vm.toString(PoolId.unwrap(addresses.poolId)));

        vm.stopBroadcast();

        // 4. Output deployment summary
        printDeploymentSummary(addresses);

        return addresses;
    }

    function deployHook() internal returns (Susanoo susanoo) {
        // Hook contracts must have specific flags encoded in the address
        uint160 permissions = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);

        console.log("   Mining hook address with permissions:", permissions);

        // Mine a salt that will produce a hook address with the correct permissions
        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, permissions, type(Susanoo).creationCode, abi.encode(address(POOLMANAGER)));

        console.log("   Target hook address:", hookAddress);
        console.log("   Salt:", vm.toString(salt));

        // Deploy the hook using CREATE2
        susanoo = new Susanoo{salt: salt}(IPoolManager(POOLMANAGER));
        require(address(susanoo) == hookAddress, "Hook address mismatch");

        return susanoo;
    }

    function deployTestTokens() internal returns (address token0, address token1) {
        MockToken tokenA = new MockToken(TOKEN0_NAME, TOKEN0_SYMBOL, TOKEN0_DECIMALS);
        MockToken tokenB = new MockToken(TOKEN1_NAME, TOKEN1_SYMBOL, TOKEN1_DECIMALS);

        // Ensure token0 < token1 (Uniswap requirement)
        if (address(tokenA) < address(tokenB)) {
            token0 = address(tokenA);
            token1 = address(tokenB);
        } else {
            token0 = address(tokenB);
            token1 = address(tokenA);
        }

        // Mint tokens to deployer
        MockToken(token0).mint(msg.sender, INITIAL_SUPPLY);
        MockToken(token1).mint(msg.sender, INITIAL_SUPPLY);

        console.log("   Minted", INITIAL_SUPPLY / 1e18, "tokens each to deployer");
    }

    

    function initializePool(address hook, address token0, address token1) internal returns (PoolId poolId) {
        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(token0),
            currency1: Currency.wrap(token1),
            fee: LP_FEE,
            tickSpacing: TICK_SPACING,
            hooks: IHooks(hook)
        });

        poolId = poolKey.toId();

        // Initialize the pool
        POOLMANAGER.initialize(poolKey, STARTING_PRICE);

        console.log("   Pool Fee:", LP_FEE);
        console.log("   Tick Spacing:", uint256(uint24(TICK_SPACING)));
        console.log("   Starting Price:", STARTING_PRICE);
    }

    function printDeploymentSummary(DeploymentAddresses memory addresses) internal view {
        console.log("");
        console.log("Deployment Complete!");
        console.log("");
        console.log("Contract Addresses:");
        console.log("   Susanoo Hook:    ", addresses.susanooHook);
        console.log("   Token0 (%s):     ", TOKEN0_SYMBOL, addresses.token0);
        console.log("   Token1 (%s):    ", TOKEN1_SYMBOL, addresses.token1);
        console.log("   Pool ID:         ", vm.toString(PoolId.unwrap(addresses.poolId)));
        console.log("");
        console.log("Configuration for Config.sol:");
        console.log("   IHooks hookContract = IHooks(", vm.toString(addresses.susanooHook), ");");
        console.log("   Currency currency0 = Currency.wrap(", vm.toString(addresses.token0), ");");
        console.log("   Currency currency1 = Currency.wrap(", vm.toString(addresses.token1), ");");
        console.log("");
        console.log("  Next Steps:");
        console.log("   1. Update script/base/Config.sol with the addresses above");
        console.log("   2. Deploy Position Manager (optional for advanced operations)");
        console.log("   3. Add liquidity using 04_AddLiquidity.s.sol");
        console.log("   4. Test order placement with 05_PlaceOrder.s.sol");
        console.log("");
        console.log(" Verification Commands:");
        console.log("   forge verify-contract", addresses.susanooHook, "src/Susanoo.sol:Susanoo --chain", block.chainid);
        console.log("   forge verify-contract", addresses.token0, "src/MockToken.sol:MockToken --chain", block.chainid);
        console.log("   forge verify-contract", addresses.token1, "src/MockToken.sol:MockToken --chain", block.chainid);
    }
}
