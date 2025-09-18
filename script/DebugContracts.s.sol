// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Constants} from "./base/Constants.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {Config} from "./base/Config.sol";

contract DebugContractsScript is Script, Constants, Config {
    function run() external view {
        console.log("=== CONTRACT DEBUG INFO ===");
        console.log("");

        console.log("Configured Addresses:");
        console.log("  Hook Contract:", address(hookContract));
        console.log("Token0:", Currency.unwrap(currency0));
        console.log("Token1:", Currency.unwrap(currency1));
        console.log("Pool Manager:", address(POOLMANAGER));
        console.log("");

        console.log("Contract Existence Check:");

        // Check if contracts have code
        address token0Addr = Currency.unwrap(currency0);
        address token1Addr = Currency.unwrap(currency1);
        address hookAddr = address(hookContract);

        console.log("  Token0 has code:", token0Addr.code.length > 0);
        console.log("  Token1 has code:", token1Addr.code.length > 0);
        console.log("  Hook has code:", hookAddr.code.length > 0);
        console.log("  Pool Manager has code:", address(POOLMANAGER).code.length > 0);
        console.log("");

        if (token0Addr.code.length == 0) {
            console.log("Token0 contract not found! Need to deploy tokens first.");
        }
        if (token1Addr.code.length == 0) {
            console.log("Token1 contract not found! Need to deploy tokens first.");
        }
        if (hookAddr.code.length == 0) {
            console.log("Hook contract not found! Need to deploy hook first.");
        }

        console.log("Next Steps:");
        if (token0Addr.code.length == 0 || token1Addr.code.length == 0) {
            console.log("  1. Run: forge script script/Anvil.s.sol --rpc-url http://localhost:8545 --broadcast");
            console.log("  2. Update Config.sol with deployed addresses");
        } else {
            console.log("  All contracts exist! Check balances and pool state.");
        }
    }
}
