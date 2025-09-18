// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {PoolKey} from "v4-core/types/PoolKey.sol";
import {CurrencyLibrary, Currency} from "v4-core/types/Currency.sol";

import {Constants} from "./base/Constants.sol";
import {Config} from "./base/Config.sol";
import {Susanoo} from "../src/Susanoo.sol";

contract FlushOrdersScript is Script, Constants, Config {
    using CurrencyLibrary for Currency;

    /////////////////////////////////////
    // --- Parameters to Configure --- //
    /////////////////////////////////////

    // Pool configuration (must match the existing pool)
    uint24 lpFee = 3000; // 0.30%
    int24 tickSpacing = 60;

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

        Susanoo susanoo = Susanoo(address(hookContract));

        // Check queue length before flushing
        uint256 queueLengthBefore = susanoo.getQueueLength(pool);

        console.log("Flushing order queue...");
        console.log("Queue length before flush:", queueLengthBefore);

        if (queueLengthBefore == 0) {
            console.log(" Queue is already empty, nothing to flush");
            return;
        }

        vm.broadcast();
        susanoo.flushOrder(pool);

        // Check queue length after flushing
        uint256 queueLengthAfter = susanoo.getQueueLength(pool);

        console.log("Order queue flushed!");
        console.log("Queue length after flush:", queueLengthAfter);
        console.log("Orders processed:", queueLengthBefore - queueLengthAfter);

        if (queueLengthAfter > 0) {
            console.log(" Some orders still in queue (may need more time for decryption)");
        }
    }
}
