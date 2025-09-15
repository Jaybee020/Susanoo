// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {SwapParams} from "v4-core/types/PoolOperation.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";

import {PoolId, PoolIdLibrary} from "v4-core/types/PoolId.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";

import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {StateLibrary} from "v4-core/libraries/StateLibrary.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {TickMath} from "v4-core/libraries/TickMath.sol";
import {BalanceDelta} from "v4-core/types/BalanceDelta.sol";

import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract Susanoo is BaseHook, ERC1155, ReentrancyGuard {
    //add helper functions to pool manager to help read storage values
    using StateLibrary for IPoolManager;
    using FixedPointMathLib for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    enum OrderStatus {
        Placed,
        Executed,
        Cancelled
    }
    enum OrderType {
        TakeProfit,
        StopLoss
    }

    struct Order {
        address trader;
        int24 triggerTick;
        bool zeroForOne;
        OrderType orderType;
        uint256 amount;
        OrderStatus status;
        PoolId keyId;
    }

    uint256 public nextOrderId = 1;
    EnumerableSet.UintSet private poolOrders;
    mapping(uint256 => Order) public orders; // orderId => Order
    mapping(PoolId => int24) public lastTicks;
    mapping(PoolId => EnumerableSet.UintSet) private ordersByPoolId; //active orders for a pool

    event OrderPlaced(
        uint256 orderId,
        address indexed trader,
        int24 triggerTick,
        bool zeroForOne,
        OrderType orderType,
        uint256 amount,
        PoolId indexed keyId
    );
    event OrderEdited(
        uint256 orderId, address indexed trader, int24 newTriggerTick, uint256 newAmount, PoolId indexed keyId
    );
    event OrderExecuted(uint256 orderId, address indexed trader, int24 triggerTick, PoolId indexed keyId);
    event OrderCancelled(uint256 orderId, address indexed trader, PoolId indexed keyId);

    constructor(IPoolManager _poolManager, string memory _uri) BaseHook(_poolManager) ERC1155(_uri) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    //TODO:add slippage, handle ETH transfers too.
    function placeOrder(PoolKey calldata key, int24 triggerTick, bool zeroForOne, OrderType orderType, uint256 amount)
        external
        nonReentrant
        returns (uint256)
    {
        int24 tick = _getLowestUsableTick(key.tickSpacing, triggerTick);
        uint256 orderId = nextOrderId;
        PoolId keyId = key.toId();
        Order memory newOrder = Order({
            trader: msg.sender,
            triggerTick: triggerTick,
            zeroForOne: zeroForOne,
            orderType: orderType,
            amount: amount,
            status: OrderStatus.Placed,
            keyId: keyId
        });
        orders[orderId] = newOrder;
        ordersByPoolId[keyId].add(orderId);
        emit OrderPlaced(orderId, msg.sender, triggerTick, zeroForOne, orderType, amount, keyId);
        address token = zeroForOne ? Currency.unwrap(key.currency0) : Currency.unwrap(key.currency1);
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        nextOrderId++;
        return orderId;
    }

    //TODO:add slippage, handle ETH transfers too.
    function editOrder(PoolKey calldata key, uint256 orderId, int24 newTriggerTick, int256 amountDelta)
        external
        nonReentrant
    {
        Order storage order = orders[orderId];
        require(uint256(PoolId.unwrap(order.keyId)) == uint256(PoolId.unwrap(key.toId())), "Invalid PoolKey");
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.Placed, "Order not active");

        uint256 currentAmount = order.amount;
        address token = order.zeroForOne ? Currency.unwrap(key.currency0) : Currency.unwrap(key.currency1);

        order.triggerTick = newTriggerTick;

        if (amountDelta > 0) {
            // Increase amount
            uint256 increaseAmount = uint256(amountDelta);
            uint256 newAmount = currentAmount + increaseAmount;
            order.amount = newAmount;
            IERC20(token).transferFrom(msg.sender, address(this), increaseAmount);
            emit OrderEdited(orderId, msg.sender, newTriggerTick, newAmount, key.toId());
        } else if (amountDelta < 0) {
            // Decrease amount
            uint256 decreaseAmount = uint256(-amountDelta);
            require(decreaseAmount <= currentAmount, "Decrease exceeds current amount");
            uint256 newAmount = currentAmount - decreaseAmount;
            order.amount = newAmount;
            IERC20(token).transfer(msg.sender, decreaseAmount);

            if (newAmount == 0) {
                order.status = OrderStatus.Cancelled;
                ordersByPoolId[order.keyId].remove(orderId);
                emit OrderCancelled(orderId, msg.sender, key.toId());
            } else {
                emit OrderEdited(orderId, msg.sender, newTriggerTick, newAmount, key.toId());
            }
        } else {
            // amountDelta == 0, only trigger tick change
            emit OrderEdited(orderId, msg.sender, newTriggerTick, currentAmount, key.toId());
        }
    }

    function executeOrder(PoolKey calldata key, uint256 orderId) public nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Placed, "Order not active");
        require(uint256(PoolId.unwrap(order.keyId)) == uint256(PoolId.unwrap(key.toId())), "Invalid PoolKey");
        order.status = OrderStatus.Executed;
        BalanceDelta delta = _swapAndSettleBalances(
            key,
            SwapParams({
                zeroForOne: order.zeroForOne,
                //We want to swap exact amount of Input tokens
                amountSpecified: -int256(order.amount),
                // No slippage limits (maximum slippage possible)
                sqrtPriceLimitX96: order.zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            })
        );
        if (order.zeroForOne) {
            //we sold token0 for token1, transfer token1 to user
            Currency currency1 = key.currency1;
            int128 amount1Delta = delta.amount1();
            if (amount1Delta > 0) {
                currency1.transfer(order.trader, uint128(amount1Delta));
            }
        } else {
            //we sold token1 for token0, transfer token0 to user
            Currency currency0 = key.currency0;
            int128 amount0Delta = delta.amount0();
            if (amount0Delta > 0) {
                currency0.transfer(order.trader, uint128(amount0Delta));
            }
        }
        ordersByPoolId[order.keyId].remove(orderId);
        emit OrderExecuted(orderId, order.trader, order.triggerTick, key.toId());
    }

    function _afterInitialize(address, PoolKey calldata key, uint160, int24 tick) internal override returns (bytes4) {
        lastTicks[key.toId()] = tick;
        return this.afterInitialize.selector;
    }

    function _afterSwap(address sender, PoolKey calldata key, SwapParams calldata params, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        // TODO
        if (msg.sender == address(this)) {
            return (this.afterSwap.selector, 0);
        }

        (, int24 currentTick,,) = poolManager.getSlot0(key.toId());
        int24 lastTick = lastTicks[key.toId()];

        _tryExecutingOrders(key, lastTick, currentTick);
        lastTicks[key.toId()] = currentTick;

        return (this.afterSwap.selector, 0);
    }

    function _tryExecutingOrders(PoolKey calldata key, int24 lastTick, int24 currentTick) internal {
        bool priceIncreased = currentTick > lastTick;
        EnumerableSet.UintSet storage poolOrderSet = ordersByPoolId[key.toId()];

        for (uint256 i = 0; i < poolOrderSet.length(); i++) {
            Order memory order = orders[poolOrderSet.at(i)];
            if (order.status != OrderStatus.Placed) {
                continue;
            }
            bool shouldExecute = false;

            if (
                order.orderType == OrderType.TakeProfit //Take Profit scenario
            ) {
                if (order.zeroForOne) {
                    //we are selling token0 for token1, when price of token0 increases
                    shouldExecute = priceIncreased && currentTick >= order.triggerTick;
                } else {
                    //we are selling token1 for token0, when price of token0 decreases
                    shouldExecute = !priceIncreased && currentTick <= order.triggerTick;
                }
            } else {
                //Stop Loss scenario
                if (order.zeroForOne) {
                    //we are selling token0 for token1, when price of token0 decreases
                    shouldExecute = !priceIncreased && currentTick <= order.triggerTick;
                } else {
                    //we are selling token1 for token0, when price of token0 increases
                    shouldExecute = priceIncreased && currentTick >= order.triggerTick;
                }
            }

            if (shouldExecute) {
                executeOrder(key, poolOrderSet.at(i));
            }
        }
    }

    function _swapAndSettleBalances(PoolKey calldata key, SwapParams memory params) internal returns (BalanceDelta) {
        BalanceDelta delta = poolManager.swap(key, params, "");
        //we swapped token0 for token1
        if (params.zeroForOne) {
            //-ve value means we need to pay token0
            if (delta.amount0() < 0) {
                _settle(key.currency0, uint128(-delta.amount0()));
            }
            //+ve value means we need to take token1
            if (delta.amount1() > 0) {
                _take(key.currency1, uint128(delta.amount1()));
            }
        } else {
            //we swapped token 1 for token 0
            if (delta.amount0() > 0) {
                _take(key.currency0, uint128(delta.amount0()));
            }

            if (delta.amount1() < 0) {
                _settle(key.currency1, uint128(-delta.amount1()));
            }
        }

        return delta;
    }

    function _settle(Currency currency, uint128 amount) internal {
        // Transfer tokens to PM and let it know
        poolManager.sync(currency);
        currency.transfer(address(poolManager), amount);
        poolManager.settle();
    }

    function _take(Currency currency, uint128 amount) internal {
        // Take tokens out of PM to our hook contract
        poolManager.take(currency, address(this), amount);
    }

    function _getLowestUsableTick(int24 tickSpacing, int24 tick) internal pure returns (int24) {
        return tick; //just return the current tick for now
    }
}
