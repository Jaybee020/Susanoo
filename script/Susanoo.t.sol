// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

// Foundry libraries
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

// FHE Testing
import {CoFheTest} from "cofhe-mock-contracts/CoFheTest.sol";
import {FHE, InEuint32, InEbool, euint32, ebool} from "cofhe-contracts/FHE.sol";

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

contract SusanooTest is Test, Deployers, CoFheTest {
    using StateLibrary for IPoolManager;
    using PoolIdLibrary for PoolKey;

    Currency token0;
    Currency token1;

    Susanoo susanoo;

    // Test users for FHE testing
    address private alice = makeAddr("alice");
    address private bob = makeAddr("bob");

    // Constants from Susanoo contract
    uint32 constant TICK_OFFSET = uint32(887272); //positive of minimum tick

    function setUp() public {
        // Enable FHE logging for debugging
        setLog(true);

        deployFreshManagerAndRouters();

        (token0, token1) = deployMintAndApprove2Currencies();

        // Calculate the proper hook address based on the hook's permissions
        // Deploy our hook
        uint160 flags = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);
        console.log("Flags:", flags, uint160(Hooks.AFTER_INITIALIZE_FLAG), uint160(Hooks.AFTER_SWAP_FLAG));
        address hookAddress = address(flags);
        console.log("Expected hook address:", hookAddress);

        // Deploy the contract to the expected hook address
        deployCodeTo("Susanoo.sol:Susanoo", abi.encode(manager, ""), hookAddress);
        susanoo = Susanoo(hookAddress);

        // Setup token approvals for test users
        vm.startPrank(alice);
        MockERC20(Currency.unwrap(token0)).approve(address(susanoo), type(uint256).max);
        MockERC20(Currency.unwrap(token1)).approve(address(susanoo), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(bob);
        MockERC20(Currency.unwrap(token0)).approve(address(susanoo), type(uint256).max);
        MockERC20(Currency.unwrap(token1)).approve(address(susanoo), type(uint256).max);
        vm.stopPrank();

        // Give test users some tokens
        deal(Currency.unwrap(token0), alice, 100 ether);
        deal(Currency.unwrap(token1), alice, 100 ether);
        deal(Currency.unwrap(token0), bob, 100 ether);
        deal(Currency.unwrap(token1), bob, 100 ether);

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

    // ========================================
    // FHE-SPECIFIC TESTS
    // ========================================

    function testPlaceEncryptedOrder() public {
        uint32 triggerTick = 12345;
        bool isTakeProfit = true; // true = TakeProfit, false = StopLoss
        uint256 amount = 1 ether;

        // Create encrypted inputs for Alice
        InEuint32 memory encTriggerTick = createInEuint32(triggerTick + TICK_OFFSET, alice);
        InEbool memory encOrderType = createInEbool(isTakeProfit, alice);

        // Alice places encrypted order (must be alice who sends transaction)
        vm.prank(alice);
        uint256 orderId = susanoo.placeOrder(key, false, encTriggerTick, encOrderType, amount);

        // Verify order was placed
        (
            address trader,
            bool zeroForOne,
            Susanoo.OrderStatus status,
            ebool encryptedType,
            euint32 encryptedTrigger,
            uint256 orderAmount,
            PoolId keyId
        ) = susanoo.orders(orderId);

        assertEq(trader, alice);
        assertEq(zeroForOne, false); // MEME -> ETH
        assertEq(uint256(status), uint256(Susanoo.OrderStatus.Placed));
        assertEq(orderAmount, amount);

        // CRITICAL: Test that encrypted values are correct using assertHashValue
        assertHashValue(encryptedTrigger, triggerTick + TICK_OFFSET);
        assertHashValue(encryptedType, isTakeProfit); // ebool test
    }

    function testOrderPrivacy() public {
        uint32 aliceTriggerTick = 12345;
        uint32 bobTriggerTick = 54321;

        // Alice places private order
        InEuint32 memory aliceEncTrigger = createInEuint32(aliceTriggerTick + TICK_OFFSET, alice);
        InEbool memory aliceEncType = createInEbool(true, alice);

        vm.prank(alice);
        uint256 aliceOrderId = susanoo.placeOrder(key, false, aliceEncTrigger, aliceEncType, 1 ether);

        // Bob places different private order
        InEuint32 memory bobEncTrigger = createInEuint32(bobTriggerTick + TICK_OFFSET, bob);
        InEbool memory bobEncType = createInEbool(false, bob);

        vm.prank(bob);
        uint256 bobOrderId = susanoo.placeOrder(key, false, bobEncTrigger, bobEncType, 2 ether);

        // Get order structs - correct field order: trader, zeroForOne, status, orderType, triggerTick, amount, keyId
        (,,, ebool aliceStoredType, euint32 aliceStoredTrigger,,) = susanoo.orders(aliceOrderId);
        (,,, ebool bobStoredType, euint32 bobStoredTrigger,,) = susanoo.orders(bobOrderId);

        // Alice can verify her own values (she has permission)
        assertHashValue(aliceStoredTrigger, aliceTriggerTick + TICK_OFFSET);
        assertHashValue(aliceStoredType, true); // true

        // Bob can verify his own values
        assertHashValue(bobStoredTrigger, bobTriggerTick + TICK_OFFSET);
        assertHashValue(bobStoredType, false); // false

        // CRITICAL: Verify values are different (privacy maintained)
        // In real FHE, Bob couldn't read Alice's values without permission
        // In mocks, we can verify they're stored separately
        assertTrue(euint32.unwrap(aliceStoredTrigger) != euint32.unwrap(bobStoredTrigger));
        assertTrue(ebool.unwrap(aliceStoredType) != ebool.unwrap(bobStoredType));
    }

    function testDecryptionQueue() public {
        // Setup: Alice places order with trigger that WILL be hit
        uint32 triggerTick = 100; // Low trigger for take profit
        InEuint32 memory encTrigger = createInEuint32(triggerTick + TICK_OFFSET, alice);
        InEbool memory encType = createInEbool(true, alice); // Take profit

        vm.prank(alice);
        uint256 orderId = susanoo.placeOrder(key, false, encTrigger, encType, 1 ether);

        // Initial queue should be empty
        assertEq(susanoo.getQueueLength(key), 0);

        // Execute swap that should trigger order (ETH price increase = tick increase)
        SwapParams memory params = SwapParams({
            zeroForOne: false, // Buying ETH with MEME -> ETH price increases
            amountSpecified: -1 ether,
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });

        PoolSwapTest.TestSettings memory testSettings =
            PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false});

        // This should trigger _afterSwap -> _requestDecryptionForPotentialTriggers
        swapRouter.swap(key, params, testSettings, ZERO_BYTES);

        // Verify decryption was requested (queue should have items)
        uint256 queueLength = susanoo.getQueueLength(key);
        console.log("Queue length after swap:", queueLength);

        // Check current tick
        (, int24 currentTick,,) = manager.getSlot0(key.toId());
        console.log("Current tick after swap:", currentTick);
        console.log("Trigger tick:", triggerTick);

        // Verify order is still Placed (not executed yet, waiting for decryption)
        (,, Susanoo.OrderStatus status,,,,) = susanoo.orders(orderId);
        assertEq(uint256(status), uint256(Susanoo.OrderStatus.Placed));
    }

    function testAsyncDecryptionAndExecution() public {
        // Place order that will trigger
        uint32 triggerTick = 100;
        InEuint32 memory encTrigger = createInEuint32(triggerTick + TICK_OFFSET, alice);
        InEbool memory encType = createInEbool(true, alice);

        vm.prank(alice);
        uint256 orderId = susanoo.placeOrder(key, false, encTrigger, encType, 1 ether);

        uint256 aliceToken0BalanceBefore = MockERC20(Currency.unwrap(token0)).balanceOf(alice);

        // Trigger order through swap
        SwapParams memory params =
            SwapParams({zeroForOne: false, amountSpecified: -1 ether, sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1});

        swapRouter.swap(key, params, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES);

        // Simulate time passing for decryption (mock contracts use 1-10 second delays)
        vm.warp(block.timestamp + 11); // Wait longer than max delay

        // Execute another swap to trigger _beforeSwap -> _executeDecryptedOrders
        SwapParams memory triggerParams = SwapParams({
            zeroForOne: true,
            amountSpecified: -0.1 ether, // Small swap to trigger processing
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        swapRouter.swap(
            key, triggerParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Check if order was executed
        (,, Susanoo.OrderStatus status,,,,) = susanoo.orders(orderId);
        console.log("Final order status:", uint256(status));

        // Verify queue was processed
        uint256 finalQueueLength = susanoo.getQueueLength(key);
        console.log("Final queue length:", finalQueueLength);

        // Check Alice's token balance change
        uint256 aliceToken0BalanceAfter = MockERC20(Currency.unwrap(token0)).balanceOf(alice);
        console.log("Alice token0 balance change:", aliceToken0BalanceBefore - aliceToken0BalanceAfter);
    }

    function testMultipleEncryptedOrders() public {
        // Alice: Take profit at high tick
        InEuint32 memory aliceEncTrigger = createInEuint32(300 + TICK_OFFSET, alice);
        InEbool memory aliceEncType = createInEbool(true, alice);

        vm.prank(alice);
        uint256 aliceOrderId = susanoo.placeOrder(key, false, aliceEncTrigger, aliceEncType, 1 ether);

        // Bob: Stop loss at low tick (using proper uint32 conversion for negative tick)
        uint32 bobTriggerWithOffset = uint32(int32(-100) + int32(TICK_OFFSET));
        InEuint32 memory bobEncTrigger = createInEuint32(bobTriggerWithOffset, bob);
        InEbool memory bobEncType = createInEbool(false, bob);

        vm.prank(bob);
        uint256 bobOrderId = susanoo.placeOrder(key, false, bobEncTrigger, bobEncType, 2 ether);

        // Execute swap that should trigger Bob's stop loss but not Alice's take profit
        SwapParams memory params =
            SwapParams({zeroForOne: true, amountSpecified: -3 ether, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1});

        swapRouter.swap(key, params, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES);

        // Check queue has items (at least one order triggered)
        uint256 queueLength = susanoo.getQueueLength(key);
        console.log("Queue length after triggering swap:", queueLength);

        // Process decryption and execution
        vm.warp(block.timestamp + 11);

        // Trigger execution with small swap
        SwapParams memory triggerParams =
            SwapParams({zeroForOne: false, amountSpecified: -0.1 ether, sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1});

        swapRouter.swap(
            key, triggerParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Check final status of both orders
        (,, Susanoo.OrderStatus bobStatus,,,,) = susanoo.orders(bobOrderId);
        (,, Susanoo.OrderStatus aliceStatus,,,,) = susanoo.orders(aliceOrderId);

        console.log("Bob's order status:", uint256(bobStatus));
        console.log("Alice's order status:", uint256(aliceStatus));

        // Check current tick to understand what happened
        (, int24 finalTick,,) = manager.getSlot0(key.toId());
        console.log("Final tick:", finalTick);
    }

    function testTriggerConditionLogic_takeProfitExecute() public {
        // Test the specific trigger logic for MEME->ETH orders
        uint32 takeProfitTrigger = uint32(int32(-100) + int32(TICK_OFFSET)); // Want to sell when tick reaches -100

        // Alice: Take profit order
        InEuint32 memory aliceEncTrigger = createInEuint32(takeProfitTrigger, alice);
        InEbool memory aliceEncType = createInEbool(true, alice);

        vm.prank(alice);
        uint256 aliceOrderId = susanoo.placeOrder(key, false, aliceEncTrigger, aliceEncType, 1 ether);
        //buy token
        SwapParams memory upParams = SwapParams({
            zeroForOne: true, // Buy token -> token price up
            amountSpecified: -2 ether,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        (, int24 tickBefore,,) = manager.getSlot0(key.toId());
        console.log("Tick before up swap:", tickBefore);

        swapRouter.swap(
            key, upParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Process decryption and execution
        vm.warp(block.timestamp + 11);

        (, int24 tickAfterUp,,) = manager.getSlot0(key.toId());
        console.log("Tick after up swap:", tickAfterUp);
        console.log("Take profit trigger:", int32(takeProfitTrigger) - int32(TICK_OFFSET));

        uint256 queueLengthAfterUp = susanoo.getQueueLength(key);
        console.log("Queue length after price up:", queueLengthAfterUp);

        // Perform another swap again to fully complete flow.
        SwapParams memory resetParams =
            SwapParams({zeroForOne: false, amountSpecified: -4 ether, sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1});

        swapRouter.swap(
            key, resetParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Process decryption and execution
        vm.warp(block.timestamp + 11);

        // Check final status of both orders
        (,, Susanoo.OrderStatus aliceStatus,,,,) = susanoo.orders(aliceOrderId);

        console.log("Alice's order status:", uint256(aliceStatus));
        assertEq(uint256(aliceStatus), uint256(Susanoo.OrderStatus.Executed), "Take profit should be executed"); //make sure it is executed

        // (, int24 tickAfterDown,,) = manager.getSlot0(key.toId());
        // console.log("Tick after down swap:", tickAfterDown);
        // console.log("Stop loss trigger (with offset):", );
        // console.log("Stop loss trigger (actual tick):", int32(stopLossTrigger) - int32(TICK_OFFSET));

        uint256 finalQueueLength = susanoo.getQueueLength(key);
        console.log("Final queue length:", finalQueueLength); //e
    }

    function testTriggerConditionLogic_stopLossExecute() public {
        // Test stop loss execution when MEME price goes down (tick goes up)
        uint32 stopLossTrigger = uint32(int32(50) + int32(TICK_OFFSET)); // Stop loss at tick 50

        // Bob: Stop loss order only
        InEuint32 memory bobEncTrigger = createInEuint32(stopLossTrigger, bob);
        InEbool memory bobEncType = createInEbool(false, bob);

        vm.prank(bob);
        uint256 bobOrderId = susanoo.placeOrder(key, false, bobEncTrigger, bobEncType, 1 ether);

        (, int24 tickBefore,,) = manager.getSlot0(key.toId());
        console.log("Tick before down swap:", tickBefore);
        console.log("Stop loss trigger:", int32(stopLossTrigger) - int32(TICK_OFFSET));

        // Sell MEME to decrease price (increase tick) - should trigger stop loss
        SwapParams memory downParams = SwapParams({
            zeroForOne: false, // Sell MEME for ETH -> MEME price down, tick up
            amountSpecified: -3 ether,
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });

        swapRouter.swap(
            key, downParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Process decryption and execution
        vm.warp(block.timestamp + 11);

        (, int24 tickAfterDown,,) = manager.getSlot0(key.toId());
        console.log("Tick after down swap:", tickAfterDown);

        uint256 queueLengthAfterDown = susanoo.getQueueLength(key);
        console.log("Queue length after price down:", queueLengthAfterDown);

        // Trigger execution with small swap
        SwapParams memory triggerParams =
            SwapParams({zeroForOne: true, amountSpecified: -0.1 ether, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1});

        swapRouter.swap(
            key, triggerParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Check final status - stop loss should be executed
        (,, Susanoo.OrderStatus bobStatus,,,,) = susanoo.orders(bobOrderId);

        console.log("Bob's stop loss status:", uint256(bobStatus));
        assertEq(uint256(bobStatus), uint256(Susanoo.OrderStatus.Executed), "Stop loss should be executed");

        uint256 finalQueueLength = susanoo.getQueueLength(key);
        console.log("Final queue length:", finalQueueLength);
    }

    function testTriggerConditionLogic_takeProfitNotExecute() public {
        // Test take profit NOT executing when price doesn't reach trigger
        uint32 takeProfitTrigger = uint32(int32(-100) + int32(TICK_OFFSET)); // Want to sell when tick reaches -100

        // Alice: Take profit order only
        InEuint32 memory aliceEncTrigger = createInEuint32(takeProfitTrigger, alice);
        InEbool memory aliceEncType = createInEbool(true, alice);

        vm.prank(alice);
        uint256 aliceOrderId = susanoo.placeOrder(key, false, aliceEncTrigger, aliceEncType, 1 ether);

        (, int24 tickBefore,,) = manager.getSlot0(key.toId());
        console.log("Tick before swap:", tickBefore);
        console.log("Take profit trigger:", int32(takeProfitTrigger) - int32(TICK_OFFSET));

        // Small price movement that shouldn't trigger take profit (not enough to reach -100)
        SwapParams memory smallUpParams = SwapParams({
            zeroForOne: false, // Buy ETH to move tick upward
            amountSpecified: -0.5 ether, // Small amount - won't reach trigger
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });

        swapRouter.swap(
            key, smallUpParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Process decryption and execution
        vm.warp(block.timestamp + 11);

        (, int24 tickAfterUp,,) = manager.getSlot0(key.toId());
        console.log("Tick after small up swap:", tickAfterUp);

        uint256 queueLengthAfterUp = susanoo.getQueueLength(key);
        console.log("Queue length after small price up:", queueLengthAfterUp);

        // Trigger execution with small swap
        SwapParams memory triggerParams =
            SwapParams({zeroForOne: false, amountSpecified: -0.1 ether, sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1});

        swapRouter.swap(
            key, triggerParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Check final status - take profit should NOT be executed
        (,, Susanoo.OrderStatus aliceStatus,,,,) = susanoo.orders(aliceOrderId);

        console.log("Alice's take profit status:", uint256(aliceStatus));
        assertEq(uint256(aliceStatus), uint256(Susanoo.OrderStatus.Placed), "Take profit should NOT be executed");

        uint256 finalQueueLength = susanoo.getQueueLength(key);
        console.log("Final queue length:", finalQueueLength);
    }

    function testTriggerConditionLogic_stopLossNotExecute() public {
        // Test stop loss NOT executing when price doesn't drop enough
        uint32 stopLossTrigger = uint32(int32(50) + int32(TICK_OFFSET)); // Stop loss at tick 50

        // Bob: Stop loss order only
        InEuint32 memory bobEncTrigger = createInEuint32(stopLossTrigger, bob);
        InEbool memory bobEncType = createInEbool(false, bob);

        vm.prank(bob);
        uint256 bobOrderId = susanoo.placeOrder(key, false, bobEncTrigger, bobEncType, 1 ether);

        (, int24 tickBefore,,) = manager.getSlot0(key.toId());
        console.log("Tick before swap:", tickBefore);
        console.log("Stop loss trigger:", int32(stopLossTrigger) - int32(TICK_OFFSET));

        // Small price movement that shouldn't trigger stop loss (not enough to reach tick 50)
        SwapParams memory smallDownParams = SwapParams({
            zeroForOne: true, // Sell ETH to lower tick
            amountSpecified: -0.5 ether, // Small amount - won't reach trigger
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        swapRouter.swap(
            key, smallDownParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Process decryption and execution
        vm.warp(block.timestamp + 11);

        (, int24 tickAfterDown,,) = manager.getSlot0(key.toId());
        console.log("Tick after small down swap:", tickAfterDown);

        uint256 queueLengthAfterDown = susanoo.getQueueLength(key);
        console.log("Queue length after small price down:", queueLengthAfterDown);

        // Trigger execution with small swap
        SwapParams memory triggerParams =
            SwapParams({zeroForOne: true, amountSpecified: -0.1 ether, sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1});

        swapRouter.swap(
            key, triggerParams, PoolSwapTest.TestSettings({settleUsingBurn: false, takeClaims: false}), ZERO_BYTES
        );

        // Check final status - stop loss should NOT be executed
        (,, Susanoo.OrderStatus bobStatus,,,,) = susanoo.orders(bobOrderId);

        console.log("Bob's stop loss status:", uint256(bobStatus));
        assertEq(uint256(bobStatus), uint256(Susanoo.OrderStatus.Placed), "Stop loss should NOT be executed");

        uint256 finalQueueLength = susanoo.getQueueLength(key);
        console.log("Final queue length:", finalQueueLength);
    }
}
