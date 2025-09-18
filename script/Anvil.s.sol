// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {PoolManager} from "v4-core/PoolManager.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolModifyLiquidityTest} from "v4-core/test/PoolModifyLiquidityTest.sol";
import {PoolSwapTest} from "v4-core/test/PoolSwapTest.sol";
import {PoolDonateTest} from "v4-core/test/PoolDonateTest.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/types/Currency.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {PositionManager} from "v4-periphery/src/PositionManager.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {DeployPermit2} from "../test/forks/DeployPermit2.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {IPositionDescriptor} from "v4-periphery/src/interfaces/IPositionDescriptor.sol";
import {IWETH9} from "v4-periphery/src/interfaces/external/IWETH9.sol";
import {SwapParams, ModifyLiquidityParams} from "v4-core/types/PoolOperation.sol";
import {TickMath} from "v4-core/libraries/TickMath.sol";
import {FHE, InEuint32, InEbool} from "cofhe-contracts/FHE.sol";
import {EasyPosm} from "../test/utils/EasyPosm.sol";
import {Susanoo} from "../src/Susanoo.sol";
import {MockToken} from "../src/MockToken.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";

/// @notice Forge script for deploying complete Susanoo ecosystem to **anvil**
contract SusanooAnvilScript is Script, DeployPermit2 {
    using CurrencyLibrary for Currency;
    using EasyPosm for IPositionManager;

    address constant CREATE2_DEPLOYER = address(0x4e59b44847b379578588920cA78FbF26c0B4956C);
    uint32 constant TICK_OFFSET = uint32(887272);

    IPoolManager manager;
    IPositionManager posm;
    PoolModifyLiquidityTest lpRouter;
    PoolSwapTest swapRouter;
    Susanoo susanoo;
    MockERC20 token0;
    MockERC20 token1;
    PoolKey poolKey;

    function setUp() public {}

    function run() public {
        // 1. Deploy Pool Manager
        vm.broadcast();
        manager = deployPoolManager();

        // 2. Deploy Susanoo Hook
        susanoo = deployHook();

        // 3. Deploy additional routers and position manager
        vm.startBroadcast();
        posm = deployPosm(manager);
        (lpRouter, swapRouter,) = deployRouters(manager);
        vm.stopBroadcast();

        // 5. Test the complete lifecycle
        vm.startBroadcast();
        testLifecycle();
        vm.stopBroadcast();

        console.log("");
        console.log(" Susanoo ecosystem deployed successfully!");
        console.log("");
        console.log("Update Config.sol with these addresses:");
        console.log("PoolManager poolManager = IPoolManager(", vm.toString(address(manager)), ");");
        console.log("IHooks hookContract = IHooks(", vm.toString(address(susanoo)), ");");

        console.log("IPositionManager posm = IPositionManager(", vm.toString(address(posm)), ");");
        console.log("");
        console.log("Router addresses for scripts:");
        console.log("PoolSwapTest swapRouter = PoolSwapTest(", vm.toString(address(swapRouter)), ");");
        console.log("LpRouter poolManager = LPRouter(", vm.toString(address(lpRouter)), ");");
    }

    function deployPoolManager() internal returns (IPoolManager) {
        return IPoolManager(address(new PoolManager(address(0))));
    }

    function deployHook() internal returns (Susanoo) {
        // Hook contracts must have specific flags encoded in the address
        uint160 permissions = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);

        // Mine a salt that will produce a hook address with the correct permissions
        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, permissions, type(Susanoo).creationCode, abi.encode(address(manager)));

        // Deploy the hook using CREATE2
        vm.broadcast();
        Susanoo hook = new Susanoo{salt: salt}(manager);
        require(address(hook) == hookAddress, "SusanooAnvilScript: hook address mismatch");

        return hook;
    }

    function deployRouters(IPoolManager _manager)
        internal
        returns (PoolModifyLiquidityTest _lpRouter, PoolSwapTest _swapRouter, PoolDonateTest _donateRouter)
    {
        _lpRouter = new PoolModifyLiquidityTest(_manager);
        _swapRouter = new PoolSwapTest(_manager);
        _donateRouter = new PoolDonateTest(_manager);
    }

    function deployPosm(IPoolManager poolManager) public returns (IPositionManager) {
        anvilPermit2();
        return IPositionManager(
            new PositionManager(
                poolManager,
                IAllowanceTransfer(address(PERMIT2_ADDRESS)),
                300_000,
                IPositionDescriptor(address(0)),
                IWETH9(address(0))
            )
        );
    }

    function deployTokens() internal returns (MockERC20 _token0, MockERC20 _token1) {
        MockERC20 tokenA = new MockERC20("Ethereum", "ETH", 18);
        MockERC20 tokenB = new MockERC20("Meme Token", "MEME", 18);

        // Ensure token0 < token1 (Uniswap requirement)
        if (address(tokenA) < address(tokenB)) {
            _token0 = tokenA;
            _token1 = tokenB;
        } else {
            _token0 = tokenB;
            _token1 = tokenA;
        }

        // Mint tokens to deployer
        _token0.mint(msg.sender, 1_000_000 ether);
        _token1.mint(msg.sender, 1_000_000 ether);
    }

    function approvePosmCurrency(IPositionManager _posm, Currency currency) internal {
        // Because POSM uses permit2, we must execute 2 permits/approvals.
        // 1. First, the caller must approve permit2 on the token.
        IERC20(Currency.unwrap(currency)).approve(address(PERMIT2_ADDRESS), type(uint256).max);
        // 2. Then, the caller must approve POSM as a spender of permit2
        IAllowanceTransfer(address(PERMIT2_ADDRESS)).approve(
            Currency.unwrap(currency), address(_posm), type(uint160).max, type(uint48).max
        );
    }

    function testLifecycle() internal {
        console.log("");
        console.log("Testing complete lifecycle...");

        // 4. Deploy tokens
        (token0, token1) = deployTokens();
        console.log(" Tokens deployed:");
        console.log("Currency currency0 = Currency.wrap(", vm.toString(address(token0)), ");");
        console.log("Currency currency1 = Currency.wrap(", vm.toString(address(token1)), ");");

        // Initialize the pool
        int24 tickSpacing = 60;
        poolKey = PoolKey(
            Currency.wrap(address(token0)), Currency.wrap(address(token1)), 3000, tickSpacing, IHooks(address(susanoo))
        );
        manager.initialize(poolKey, 79228162514264337593543950336); // SQRT_PRICE_1_1
        console.log("Pool initialized");

        // Approve tokens to routers and position manager
        token0.approve(address(lpRouter), type(uint256).max);
        token1.approve(address(lpRouter), type(uint256).max);
        // token0.approve(address(swapRouter), type(uint256).max);
        // token1.approve(address(swapRouter), type(uint256).max);
        // token0.approve(address(susanoo), type(uint256).max);
        // token1.approve(address(susanoo), type(uint256).max);
        // approvePosmCurrency(posm, Currency.wrap(address(token0)));
        // approvePosmCurrency(posm, Currency.wrap(address(token1)));

        // // Add full range liquidity to the pool
        int24 tickLower = TickMath.minUsableTick(tickSpacing);
        int24 tickUpper = TickMath.maxUsableTick(tickSpacing);
        _addLiquidity(tickLower, tickUpper);
        console.log("Liquidity added");

        // // Execute a test swap
        // _executeTestSwap();
        // console.log("Test swap executed");
    }

    function _addLiquidity(int24 tickLower, int24 tickUpper) internal {
        // Add liquidity using both routers for demonstration
        ModifyLiquidityParams memory liqParams = ModifyLiquidityParams(tickLower, tickUpper, 100 ether, 0);
        lpRouter.modifyLiquidity(poolKey, liqParams, "");

        // // Also add via position manager
        // posm.mint(poolKey, tickLower, tickUpper, 100e18, 10_000e18, 10_000e18, msg.sender, block.timestamp + 300, "");
    }

    function _executeTestSwap() internal {
        bool zeroForOne = true;
        int256 amountSpecified = 1 ether;
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
        PoolSwapTest.TestSettings memory testSettings =
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false});
        swapRouter.swap(poolKey, params, testSettings, "");

        // Check queue length after swap
        uint256 queueLength = susanoo.getQueueLength(poolKey);
        console.log("   Queue length after swap:", queueLength);
    }
}
