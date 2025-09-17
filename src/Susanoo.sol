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
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/types/BeforeSwapDelta.sol";

import {FixedPointMathLib} from "solmate/src/utils/FixedPointMathLib.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "cofhe-contracts/FHE.sol";
import {Queue} from "./Queue.sol";
import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";

contract Susanoo is BaseHook, IUnlockCallback, ReentrancyGuard {
    //add helper functions to pool manager to help read storage values
    using StateLibrary for IPoolManager;
    using FixedPointMathLib for uint256;
    using EnumerableSet for EnumerableSet.UintSet;

    // NOTE: More natural syntax with euint operations by using FHE library
    // All euint types are wrapped forms of uint256, therefore using library
    // for uint256 works for all euint types
    using FHE for uint256;

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
        bool zeroForOne; //is there need to encrypt this? In my usecase, it would always be False because this hook is for selling token1 for token0 via TakeProfit or StopLoss to degen traders.So ETH/MEME tokens, where token1 is MEME token and token0 is ETH. So when price of MEME increases, we sell MEME for ETH. When price of MEME decreases, we sell MEME for ETH.
        OrderStatus status;
        ebool orderType; //going to encrypt as ebool true is TakeProfit, false is StopLoss
        euint32 triggerTick; //going to encrypt
        uint256 amount; //amount should be public.(How do make private using FHERC20?)
        PoolId keyId;
    }

    struct OrderDecryptionInfo {
        uint256 orderId;
        int24 currentTick; // tick when decryption was requested
        bool priceIncreased;
    }

    uint32 constant TICK_OFFSET = uint32(887272); //positive of minimum tick
    bytes internal constant ZERO_BYTES = bytes("");
    uint256 public nextOrderId = 1;
    EnumerableSet.UintSet private poolOrders;
    mapping(uint256 => Order) public orders; // orderId => Order
    mapping(PoolId => int24) public lastTicks;
    mapping(PoolId => EnumerableSet.UintSet) private ordersByPoolId; //active orders for a pool
    mapping(PoolId => Queue) private poolDecryptionQueues; // Decryption queue per pool
    mapping(uint256 => OrderDecryptionInfo) private decryptionInfo; // Decryption metadata

    event OrderPlaced(
        uint256 orderId,
        address indexed trader,
        euint32 triggerTick,
        bool zeroForOne,
        ebool orderType,
        uint256 amount,
        PoolId indexed keyId
    );
    event OrderEdited(
        uint256 orderId, address indexed trader, euint32 newTriggerTick, uint256 newAmount, PoolId indexed keyId
    );
    event OrderExecuted(uint256 orderId, address indexed trader, int24 executedTick, PoolId indexed keyId);
    event OrderCancelled(uint256 orderId, address indexed trader, PoolId indexed keyId);
    event DecryptionRequested(uint256 orderId, euint128 conditionHandle);

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: true,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,
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
    function placeOrder(
        PoolKey calldata key,
        bool zeroForOne,
        InEuint32 memory inTriggerTick,
        InEbool memory inOrderType,
        uint256 amount
    ) external nonReentrant returns (uint256) {
        flushOrder(key); //flush Queue to prevent build up
        uint256 orderId = nextOrderId;
        PoolId keyId = key.toId();
        euint32 triggerTick = FHE.asEuint32(inTriggerTick);
        FHE.allowThis(triggerTick);
        FHE.allowSender(triggerTick);
        ebool orderType = FHE.asEbool(inOrderType);
        FHE.allowThis(orderType);
        FHE.allowSender(orderType);
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
        // Transfer tokens from trader to this contract. Find a way to skip tranferFrom. The contract should be able to pull funds from trader directly when needed. Make private?
        address token = zeroForOne ? Currency.unwrap(key.currency0) : Currency.unwrap(key.currency1);
        require(token != address(0), "Only ERC20 tokens are supported");
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        nextOrderId++;
        return orderId;
    }

    //TODO:add slippage, handle ETH transfers too.
    function editOrder(PoolKey calldata key, uint256 orderId, InEuint32 memory inNewTriggerTick, int256 amountDelta)
        external
        nonReentrant
    {
        Order storage order = orders[orderId];
        require(uint256(PoolId.unwrap(order.keyId)) == uint256(PoolId.unwrap(key.toId())), "Invalid PoolKey");
        require(order.trader == msg.sender, "Not your order");
        require(order.status == OrderStatus.Placed, "Order not active");

        uint256 currentAmount = order.amount;
        address token = order.zeroForOne ? Currency.unwrap(key.currency0) : Currency.unwrap(key.currency1);

        //Is there a way to avoid this when trigger tick is not edited?
        order.triggerTick = FHE.asEuint32(inNewTriggerTick);
        FHE.allowThis(order.triggerTick);
        FHE.allowSender(order.triggerTick);

        // emit OrderEdited(orderId, msg.sender, order.triggerTick, order.amount, key.toId());

        //Might not be able to integrate this because of encryption
        if (amountDelta > 0) {
            // Increase amount
            uint256 increaseAmount = uint256(amountDelta);
            uint256 newAmount = currentAmount + increaseAmount;
            order.amount = newAmount;
            IERC20(token).transferFrom(msg.sender, address(this), increaseAmount);
            emit OrderEdited(orderId, msg.sender, order.triggerTick, newAmount, key.toId());
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
                emit OrderEdited(orderId, msg.sender, order.triggerTick, newAmount, key.toId());
            }
        } else {
            // amountDelta == 0, only trigger tick change
            emit OrderEdited(orderId, msg.sender, order.triggerTick, currentAmount, key.toId());
        }
    }

    /**
     * @dev Get queue length for a specific pool (for monitoring)
     */
    function getQueueLength(PoolKey calldata key) external view returns (uint256) {
        Queue queue = poolDecryptionQueues[key.toId()];
        return address(queue) == address(0) ? 0 : queue.length();
    }
    /**
     * @dev Get or create decryption queue for a pool
     */

    function _getOrCreateQueue(PoolKey calldata key) private returns (Queue) {
        PoolId poolId = key.toId();
        Queue queue = poolDecryptionQueues[poolId];

        if (address(queue) == address(0)) {
            queue = new Queue();
            poolDecryptionQueues[poolId] = queue;
        }

        return queue;
    }

    function _afterInitialize(address, PoolKey calldata key, uint160, int24 tick) internal override returns (bytes4) {
        _getOrCreateQueue(key);
        lastTicks[key.toId()] = tick;
        return this.afterInitialize.selector;
    }

    function _beforeSwap(address, PoolKey calldata key, SwapParams calldata params, bytes calldata)
        internal
        override
        returns (bytes4, BeforeSwapDelta, uint24)
    {
        _executeDecryptedOrders(key);
        return (this.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }

    //Might instead use Queue system
    function _afterSwap(address sender, PoolKey calldata key, SwapParams calldata params, BalanceDelta, bytes calldata)
        internal
        override
        returns (bytes4, int128)
    {
        if (msg.sender == address(this)) {
            return (this.afterSwap.selector, 0);
        }

        (, int24 currentTick,,) = poolManager.getSlot0(key.toId());
        int24 lastTick = lastTicks[key.toId()];

        // Phase 1: Request decryption for orders that might trigger
        _requestDecryptionForPotentialTriggers(key, lastTick, currentTick);
        lastTicks[key.toId()] = currentTick;

        return (this.afterSwap.selector, 0);
    }

    /**
     * @dev Phase 1: Evaluate all orders and request decryption for potential triggers
     */
    function _requestDecryptionForPotentialTriggers(PoolKey calldata key, int24 lastTick, int24 currentTick) private {
        bool priceIncreased = currentTick > lastTick;
        EnumerableSet.UintSet storage poolOrderSet = ordersByPoolId[key.toId()];
        Queue queue = _getOrCreateQueue(key);

        for (uint256 i = 0; i < poolOrderSet.length(); i++) {
            uint256 orderId = poolOrderSet.at(i);
            Order storage order = orders[orderId];
            if (order.status != OrderStatus.Placed) {
                continue;
            }

            euint128 shouldExecute = _calculateExecutionCondition(order, currentTick, priceIncreased);
            uint256 handle = euint128.unwrap(shouldExecute);

            decryptionInfo[handle] =
                OrderDecryptionInfo({orderId: orderId, currentTick: currentTick, priceIncreased: priceIncreased});

            //Request FHE decryption
            FHE.decrypt(shouldExecute);
            queue.push(shouldExecute);

            emit DecryptionRequested(orderId, shouldExecute);
        }
    }

    /**
     * @dev Phase 2: Process decrypted conditions and execute valid orders
     */
    function _executeDecryptedOrders(PoolKey memory key) private {
        Queue queue = poolDecryptionQueues[key.toId()];
        if (address(queue) == address(0)) {
            return; //no queue
        }

        while (!queue.isEmpty()) {
            euint128 shouldExecuteEnc = queue.peek();
            uint256 handle = euint128.unwrap(shouldExecuteEnc);
            (uint128 shouldExecute, bool decrypted) = FHE.getDecryptResultSafe(shouldExecuteEnc);
            if (!decrypted) {
                break;
            }
            queue.pop();

            if (shouldExecute == 1) {
                OrderDecryptionInfo memory info = decryptionInfo[handle];
                _executeOrder(key, info.orderId);
            }

            delete decryptionInfo[handle];
        }
    }

    function _calculateExecutionCondition(Order memory order, int24 currentTick, bool priceIncreased)
        private
        returns (euint128)
    {
        // Convert tick to uint32 by adding offset to handle negative values.Note This should also be done offchain when providing encrypted tick when placing order
        // Range: int24 [-8388608, 8388607] -> uint32 [2139095040, 2155872255]
        euint32 currentTickEnc = FHE.asEuint32(uint32(int32(currentTick) + int32(TICK_OFFSET)));
        ebool priceIncreasedEnc = FHE.asEbool(priceIncreased);

        euint32 triggerTick = order.triggerTick;
        ebool zeroForOneEncrypted = FHE.asEbool(order.zeroForOne);
        ebool orderType = order.orderType;

        //Take Profit Conditions
        ebool takeProfitZeroForOne = FHE.and(priceIncreasedEnc, FHE.gte(currentTickEnc, triggerTick)); //sell token0 when price increases
        ebool takeProfitOneForZero = FHE.and(FHE.not(priceIncreasedEnc), FHE.lte(currentTickEnc, triggerTick)); //sell token 1 when price decreases
        ebool takeProfitCondition = FHE.select(zeroForOneEncrypted, takeProfitZeroForOne, takeProfitOneForZero);

        //Stop Loss conditions
        ebool stopLossZeroForOne = FHE.and(FHE.not(priceIncreasedEnc), FHE.lte(currentTickEnc, triggerTick)); //sell token1 when price increases

        ebool stopLossOneForZero = FHE.and(priceIncreasedEnc, FHE.gte(currentTickEnc, triggerTick)); //sell token1 when price increases
        ebool stopLossCondition = FHE.select(zeroForOneEncrypted, stopLossZeroForOne, stopLossOneForZero);

        ebool shouldExecute = FHE.select(orderType, takeProfitCondition, stopLossCondition);
        euint128 result = FHE.asEuint128(shouldExecute); //convert to uint256(Would this work? would the direct ebool be better?)
        FHE.allowThis(result);

        return result;
    }

    function _executeOrder(PoolKey memory key, uint256 orderId) private nonReentrant {
        Order storage order = orders[orderId];
        require(order.status == OrderStatus.Placed, "Order not active");
        require(uint256(PoolId.unwrap(order.keyId)) == uint256(PoolId.unwrap(key.toId())), "Invalid PoolKey");
        (, int24 currentTick,,) = poolManager.getSlot0(key.toId());
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
        emit OrderExecuted(orderId, order.trader, currentTick, key.toId());
    }

    function flushOrder(PoolKey calldata key) public nonReentrant {
        poolManager.unlock(abi.encode(key));
    }

    /**
     * @dev Callback function called when pool manager lock is acquired
     * @param data Encoded PoolKey data
     * @return Empty bytes as no return data needed
     */
    function unlockCallback(bytes calldata data) external override onlyPoolManager returns (bytes memory) {
        PoolKey memory key = abi.decode(data, (PoolKey));
        _executeDecryptedOrders(key); // Process token1 -> token0 orders
        return ZERO_BYTES;
    }

    function _swapAndSettleBalances(PoolKey memory key, SwapParams memory params) internal returns (BalanceDelta) {
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
}
