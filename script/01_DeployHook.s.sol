// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import {Hooks} from "v4-core/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/interfaces/IPoolManager.sol";
import {HookMiner} from "v4-periphery/src/utils/HookMiner.sol";

import {Constants} from "./base/Constants.sol";
import {Susanoo} from "../src/Susanoo.sol";

/// @notice Mines the address and deploys the Susanoo.sol Hook contract
contract DeployHookScript is Script, Constants {
    function setUp() public {}

    function run() public returns (Susanoo susanoo) {
        // Susanoo requires AFTER_INITIALIZE, BEFORE_SWAP, and AFTER_SWAP flags
        uint160 flags = uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.BEFORE_SWAP_FLAG | Hooks.AFTER_SWAP_FLAG);

        console.log("Required hook flags:", flags);
        console.log("Mining hook address...");

        // Mine a salt that will produce a hook address with the correct flags
        console.log("Required Poolmanager :", address(POOLMANAGER));
        bytes memory constructorArgs = abi.encode(POOLMANAGER);
        console.log("Required Poolmanager 2 :", address(POOLMANAGER));
        (address hookAddress, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(Susanoo).creationCode, constructorArgs);

        console.log("Hook address found:", hookAddress);
        console.log("Salt:", vm.toString(salt));

        // Deploy the hook using CREATE2
        vm.broadcast();
        susanoo = new Susanoo{salt: salt}(IPoolManager(POOLMANAGER));
        require(address(susanoo) == hookAddress, "DeployHookScript: hook address mismatch");

        console.log("Susanoo hook deployed successfully at:", address(susanoo));
        console.log("UPDATE Config.sol with this address:");
    }
}
