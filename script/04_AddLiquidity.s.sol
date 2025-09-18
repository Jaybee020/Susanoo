// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {CurrencyLibrary, Currency} from "v4-core/types/Currency.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {LiquidityAmounts} from "@uniswap/v4-core/test/utils/LiquidityAmounts.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";

import {EasyPosm} from "../test/utils/EasyPosm.sol";
import {Constants} from "./base/Constants.sol";
import {Config} from "./base/Config.sol";

contract AddLiquidityScript is Script, Constants, Config {
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;
    using EasyPosm for IPositionManager;

    /////////////////////////////////////
    // --- Parameters to Configure --- //
    /////////////////////////////////////

    // Pool configuration
    uint24 lpFee = 3000; // 0.30%
    int24 tickSpacing = 60;

    // Liquidity position configuration
    uint256 public token0Amount = 100e18; // 100 tokens
    uint256 public token1Amount = 100e18; // 100 tokens

    // Range of the position
    int24 tickLower = -600; // Must be a multiple of tickSpacing
    int24 tickUpper = 600;

    /////////////////////////////////////

    function run() external {
        require(address(hookContract) != address(0), "Hook contract not set in Config.sol");
        require(!currency0.isAddressZero(), "Currency0 not set in Config.sol");
        require(!currency1.isAddressZero(), "Currency1 not set in Config.sol");
        require(address(posm) != address(0), "Position Manager not set in Config.sol");

        PoolKey memory pool = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: lpFee,
            tickSpacing: tickSpacing,
            hooks: hookContract
        });

        // Get current pool price
        (uint160 sqrtPriceX96,,,) = POOLMANAGER.getSlot0(pool.toId());
        require(sqrtPriceX96 != 0, "Pool not initialized");

        // Convert token amounts to liquidity units
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            TickMath.getSqrtPriceAtTick(tickLower),
            TickMath.getSqrtPriceAtTick(tickUpper),
            token0Amount,
            token1Amount
        );

        // Slippage limits (add 1 wei buffer)
        uint256 amount0Max = token0Amount + 1 wei;
        uint256 amount1Max = token1Amount + 1 wei;

        bytes memory hookData = ZERO_BYTES;

        // Approve tokens to Position Manager
        vm.startBroadcast();
        tokenApprovals();
        vm.stopBroadcast();

        // Add liquidity
        vm.startBroadcast();

        IPositionManager(address(posm)).mint(
            pool, tickLower, tickUpper, liquidity, amount0Max, amount1Max, msg.sender, block.timestamp + 60, hookData
        );
        vm.stopBroadcast();
    }

    function tokenApprovals() public {
        if (!currency0.isAddressZero()) {
            token0.approve(address(PERMIT2), type(uint256).max);
            PERMIT2.approve(address(token0), address(posm), type(uint160).max, type(uint48).max);
        }
        if (!currency1.isAddressZero()) {
            token1.approve(address(PERMIT2), type(uint256).max);
            PERMIT2.approve(address(token1), address(posm), type(uint160).max, type(uint48).max);
        }
    }
}
