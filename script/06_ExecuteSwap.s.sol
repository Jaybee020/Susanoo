// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {CurrencyLibrary, Currency} from "v4-core/types/Currency.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";

import {Constants} from "./base/Constants.sol";
import {Config} from "./base/Config.sol";

contract ExecuteSwapScript is Script, Constants, Config {
    using CurrencyLibrary for Currency;

    // Slippage tolerance to allow for unlimited price impact
    uint160 public constant MIN_PRICE_LIMIT = TickMath.MIN_SQRT_PRICE + 1;
    uint160 public constant MAX_PRICE_LIMIT = TickMath.MAX_SQRT_PRICE - 1;

    /////////////////////////////////////
    // --- Parameters to Configure --- //
    /////////////////////////////////////

    // Pool configuration
    uint24 lpFee = 3000; // 0.30%
    int24 tickSpacing = 60;

    // Swap configuration
    bool zeroForOne = true; // true = sell token0 for token1, false = sell token1 for token0
    int256 amountSpecified = 10e18; // Amount to swap (5 tokens)

    // PoolSwapTest Contract address - UPDATE THIS FOR YOUR NETWORK
    PoolSwapTest swapRouter = PoolSwapTest(address(0xf3A39C86dbd13C45365E57FB90fe413371F65AF8)); // UPDATE THIS ADDRESS

    /////////////////////////////////////

    function run() external {
        require(address(hookContract) != address(0), "Hook contract not set in Config.sol");
        require(!currency0.isAddressZero(), "Currency0 not set in Config.sol");
        require(!currency1.isAddressZero(), "Currency1 not set in Config.sol");
        require(address(swapRouter) != address(0), "Swap router address not set");

        PoolKey memory pool = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: lpFee,
            tickSpacing: tickSpacing,
            hooks: hookContract
        });

        console.log("Executing swap with parameters:");
        console.log("  Direction:", zeroForOne ? "Token0 -> Token1" : "Token1 -> Token0");
        console.log("  Amount:", uint256(amountSpecified) / 1e18, "tokens");

        // Check balances and pool state
        console.log("");
        console.log("Pre-swap checks:");
        console.log("Executing swap...");
        console.log("  User token0 balance:", token0.balanceOf(msg.sender) / 1e18, "tokens");
        console.log("  User token1 balance:", token1.balanceOf(msg.sender) / 1e18, "tokens");

        // // Get current tick before swap
        // (uint160 sqrtPriceBefore, int24 tickBefore,,) = POOLMANAGER.getSlot0(pool.toId());
        // console.log("  Current tick:", tickBefore);
        // console.log("  Current price:", sqrtPriceBefore);

        // Approve tokens to the swap router
        vm.startBroadcast();
        if (zeroForOne) {
            console.log("  Approving token0 to swap router...");
            token0.approve(address(swapRouter), uint256(amountSpecified));
        } else {
            console.log("  Approving token1 to swap router...");
            token1.approve(address(swapRouter), uint256(amountSpecified));
        }
        vm.stopBroadcast();

        // Setup swap parameters
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(amountSpecified), // Negative for exact input
            sqrtPriceLimitX96: zeroForOne ? MIN_PRICE_LIMIT : MAX_PRICE_LIMIT // Unlimited impact
        });

        // In v4, users have the option to receive native ERC20s or wrapped ERC1155 tokens
        PoolSwapTest.TestSettings memory testSettings =
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});

        bytes memory hookData = ZERO_BYTES;

        vm.broadcast();
        swapRouter.swap(pool, params, testSettings, hookData);

        // Get current tick after swap
        // (uint160 sqrtPriceAfter, int24 tickAfter,,) = POOLMANAGER.getSlot0(pool.toId());

        // console.log("Swap executed successfully!");
        // console.log("");
        // console.log("Results:");
        // console.log("  Tick before:", tickBefore);
        // console.log("  Tick after:", tickAfter);
        // console.log("  Tick change:", tickAfter - tickBefore);
        // console.log("  Price before:", sqrtPriceBefore);
        // console.log("  Price after:", sqrtPriceAfter);

        // if (tickAfter > tickBefore) {
        //     console.log("  Price movement: UP (good for take profit on token1->token0)");
        // } else if (tickAfter < tickBefore) {
        //     console.log("  Price movement: DOWN (good for stop loss on token1->token0)");
        // } else {
        //     console.log("  Price movement: NO CHANGE");
        // }
    }
}
