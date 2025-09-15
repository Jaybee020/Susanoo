// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// Foundry libraries
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";

import {PoolManager} from "v4-core/PoolManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";

import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";

import {Hooks} from "v4-core/libraries/Hooks.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";

import {Susanoo} from "../src/Susanoo.sol";

contract SusanooTest is Test, Deployers {
    using StateLibrary for IPoolManager;
    using PoolIdLibrary for PoolKey;

    Currency token0;
    Currency token1;

    Susanoo susanoo;

    function setUp() public {
        deployFreshManagerAndRouters();

        (token0, token1) = deployMintAndApprove2Currencies();

        // Calculate the proper hook address based on the hook's permissions
        // Deploy our hook
        uint160 flags = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.AFTER_SWAP_FLAG);
        console.log("Flags:", flags, uint160(Hooks.AFTER_INITIALIZE_FLAG), uint160(Hooks.AFTER_SWAP_FLAG));
        address hookAddress = address(flags);
        console.log("Expected hook address:", hookAddress);

        // Deploy the contract to the expected hook address
        deployCodeTo("Susanoo.sol:Susanoo", abi.encode(manager, ""), hookAddress);
        susanoo = Susanoo(hookAddress);

        MockERC20(Currency.unwrap(token0)).approve(address(susanoo), type(uint256).max);
        MockERC20(Currency.unwrap(token1)).approve(address(susanoo), type(uint256).max);

        (key,) = initPool(token0, token1, susanoo, 3000, SQRT_PRICE_1_1);

        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 10 ether, salt: bytes32(0)}),
            ZERO_BYTES
        );

        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({tickLower: -120, tickUpper: 120, liquidityDelta: 10 ether, salt: bytes32(0)}),
            ZERO_BYTES
        );

        modifyLiquidityRouter.modifyLiquidity(
            key,
            ModifyLiquidityParams({
                tickLower: TickMath.minUsableTick(60),
                tickUpper: TickMath.maxUsableTick(60),
                liquidityDelta: 10 ether,
                salt: bytes32(0)
            }),
            ZERO_BYTES
        );
    }

    function testPlaceOrder() public {
        uint256 originalTokenBalance = token0.balanceOfSelf();
        uint256 amount = 1 ether;
        uint256 orderId = susanoo.placeOrder(key, 100, true, Susanoo.OrderType.TakeProfit, amount);
        uint256 newTokenBalance = token0.balanceOfSelf();

        (
            address orderTrader,
            int24 orderTriggerTick,
            bool orderZeroForOne,
            Susanoo.OrderType orderOrderType,
            uint256 orderAmount,
            Susanoo.OrderStatus orderStatus,
            PoolId orderKeyId
        ) = susanoo.orders(orderId);

        assertEq(susanoo.nextOrderId(), 2);
        assertEq(orderTrader, address(this));
        assertEq(orderTriggerTick, 100);
        assertEq(orderZeroForOne, true);
        assertEq(uint256(orderOrderType), uint256(Susanoo.OrderType.TakeProfit));
        assertEq(orderAmount, amount);
        assertEq(uint256(orderStatus), uint256(Susanoo.OrderStatus.Placed));
        assertEq(originalTokenBalance - newTokenBalance, amount);
        assertEq(uint256(PoolId.unwrap(orderKeyId)), uint256(PoolId.unwrap(key.toId())));
    }

    function testEditOrder_IncreaseAmount() public {
        uint256 amount = 1 ether;
        uint256 orderId = susanoo.placeOrder(key, 100, true, Susanoo.OrderType.TakeProfit, amount);

        uint256 originalTokenBalance = token0.balanceOfSelf();
        susanoo.editOrder(key, orderId, 100, 1 ether);
        uint256 newTokenBalance = token0.balanceOfSelf();

        (,,,, uint256 orderAmount,,) = susanoo.orders(orderId);
        assertEq(orderAmount, 2 ether); // Should be 1 + 1 = 2 ether
        assertEq(originalTokenBalance - newTokenBalance, 1 ether); // Should have spent 1 more ether
    }

    function testEditOrder_DecreaseAmount() public {
        uint256 amount = 2 ether;
        uint256 orderId = susanoo.placeOrder(key, 100, true, Susanoo.OrderType.TakeProfit, amount);

        uint256 originalTokenBalance = token0.balanceOfSelf();
        susanoo.editOrder(key, orderId, 100, -1 ether);
        uint256 newTokenBalance = token0.balanceOfSelf();

        (,,,, uint256 orderAmount,,) = susanoo.orders(orderId);
        assertEq(orderAmount, 1 ether); // Should be 2 - 1 = 1 ether
        assertEq(newTokenBalance - originalTokenBalance, 1 ether); // Should have received 1 ether back
    }

    function testEditOrder_CancelOrder() public {
        uint256 amount = 1 ether;
        uint256 orderId = susanoo.placeOrder(key, 100, true, Susanoo.OrderType.TakeProfit, amount);

        uint256 originalTokenBalance = token0.balanceOfSelf();
        susanoo.editOrder(key, orderId, 100, -1 ether);
        uint256 newTokenBalance = token0.balanceOfSelf();

        (,,,, uint256 orderAmount, Susanoo.OrderStatus orderStatus,) = susanoo.orders(orderId);
        assertEq(orderAmount, 0); // Should be 0 after cancellation
        assertEq(uint256(orderStatus), uint256(Susanoo.OrderStatus.Cancelled));
        assertEq(newTokenBalance - originalTokenBalance, 1 ether); // Should have received full 1 ether back
    }

    function testExecuteOrder_NotExecute() public {
        // Setup separate addresses
        address orderPlacer = makeAddr("orderPlacer");
        address swapExecutor = makeAddr("swapExecutor");

        // Give both addresses token balances
        deal(Currency.unwrap(token0), orderPlacer, 10 ether);
        deal(Currency.unwrap(token0), swapExecutor, 10 ether);

        // Order placer places order
        vm.startPrank(orderPlacer);
        MockERC20(Currency.unwrap(token0)).approve(address(susanoo), type(uint256).max);
        uint256 orderId = susanoo.placeOrder(key, 100, true, Susanoo.OrderType.TakeProfit, 1 ether);
        vm.stopPrank();

        // Swap executor executes swap that should NOT trigger order (same direction as order)
        vm.startPrank(swapExecutor);
        MockERC20(Currency.unwrap(token0)).approve(address(swapRouter), type(uint256).max);
        SwapParams memory params =
            SwapParams({zeroForOne: true, amountSpecified: -1 ether, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1});
        PoolSwapTest.TestSettings memory testSettings =
            PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false});
        swapRouter.swap(key, params, testSettings, ZERO_BYTES);
        vm.stopPrank();

        // Order should still be placed (not executed)
        (,,,,, Susanoo.OrderStatus orderStatus,) = susanoo.orders(orderId);
        assertEq(uint256(orderStatus), uint256(Susanoo.OrderStatus.Placed));
    }

    function testExecuteOrder_Execute() public {
        // Setup separate addresses
        address orderPlacer = makeAddr("orderPlacer");
        address swapExecutor = makeAddr("swapExecutor");

        // Give orderPlacer token0 and swapExecutor token1
        deal(Currency.unwrap(token0), orderPlacer, 10 ether);
        deal(Currency.unwrap(token1), swapExecutor, 10 ether);

        // Order placer places TakeProfit order (sell token0 for token1 when price goes up)
        vm.startPrank(orderPlacer);
        MockERC20(Currency.unwrap(token0)).approve(address(susanoo), type(uint256).max);
        uint256 orderId = susanoo.placeOrder(key, 100, true, Susanoo.OrderType.TakeProfit, 1 ether);
        vm.stopPrank();

        uint256 orderPlacerToken1BalanceBefore = MockERC20(Currency.unwrap(token1)).balanceOf(orderPlacer);

        // Swap executor executes swap in opposite direction to trigger order (sell token1 for token0)
        vm.startPrank(swapExecutor);
        MockERC20(Currency.unwrap(token1)).approve(address(swapRouter), type(uint256).max);
        SwapParams memory params =
            SwapParams({zeroForOne: false, amountSpecified: -1 ether, sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1});
        PoolSwapTest.TestSettings memory testSettings =
            PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false});
        swapRouter.swap(key, params, testSettings, ZERO_BYTES);
        vm.stopPrank();

        // Verify order was executed
        (,,,,, Susanoo.OrderStatus orderStatus,) = susanoo.orders(orderId);
        assertEq(uint256(orderStatus), uint256(Susanoo.OrderStatus.Executed));

        // Verify order placer received token1 from the executed order
        uint256 orderPlacerToken1BalanceAfter = MockERC20(Currency.unwrap(token1)).balanceOf(orderPlacer);
        assertGt(orderPlacerToken1BalanceAfter, orderPlacerToken1BalanceBefore);
    }
}
