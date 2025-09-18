// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {CurrencyLibrary, Currency} from "v4-core/types/Currency.sol";

import {Constants} from "./base/Constants.sol";
import {Config} from "./base/Config.sol";

contract CreatePoolScript is Script, Constants, Config {
    using CurrencyLibrary for Currency;

    /////////////////////////////////////
    // --- Parameters to Configure --- //
    /////////////////////////////////////

    // Pool configuration
    uint24 lpFee = 3000; // 0.30%
    int24 tickSpacing = 60;

    // Starting price of the pool, in sqrtPriceX96
    uint160 startingPrice = SQRT_PRICE_1_1; // 1:1 price ratio

    /////////////////////////////////////

    function run() external {
        require(address(hookContract) != address(0), "Hook contract not set in Config.sol");
        require(!currency0.isAddressZero(), "Currency0 not set in Config.sol");
        require(!currency1.isAddressZero(), "Currency1 not set in Config.sol");

        PoolKey memory pool = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: lpFee,
            tickSpacing: tickSpacing,
            hooks: hookContract
        });
        bytes memory hookData = ZERO_BYTES;

        vm.broadcast();
        IPoolManager(POOLMANAGER).initialize(pool, startingPrice);
    }
}
