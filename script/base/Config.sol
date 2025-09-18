// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IHooks} from "v4-core/interfaces/IHooks.sol";
import {Currency} from "v4-core/types/Currency.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IERC20} from "forge-std/interfaces/IERC20.sol";

import {Constants} from "./Constants.sol";

abstract contract Config is Constants {
    // =========== ADDRESSES TO CONFIGURE ===========
    // Set these addresses for your specific deployment

    // Hook contract address (will be set after deployment)
    IHooks hookContract = IHooks(address(0x569b28A558D1229E172E77202D580052179d10c0)); // UPDATE THIS AFTER HOOK DEPLOYMENT

    // Token addresses (set after token deployment or use existing tokens)
    Currency currency0 = Currency.wrap(address(0x812650b7B982ca7b7DA11eF2e901502Cf9F0F033)); // TOKEN0 ADDRESS (should be < TOKEN1)
    Currency currency1 = Currency.wrap(address(0xA31b26459050A4832EC58eBAa03147941e612c5a)); // TOKEN1 ADDRESS (should be > TOKEN0)

    // =========== COMPUTED VALUES ===========
    // These are computed from the currencies above
    IERC20 token0 = IERC20(Currency.unwrap(currency0));
    IERC20 token1 = IERC20(Currency.unwrap(currency1));

    // =========== EXAMPLE CONFIGURATION ===========
    // Uncomment and modify these for local testing with mock tokens:

    // Example with local deployed tokens (update these addresses):
    // Currency currency0 = Currency.wrap(address(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0));
    // Currency currency1 = Currency.wrap(address(0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9));

    // Example hook address (update after deployment):
    // IHooks hookContract = IHooks(address(0x1234567890123456789012345678901234567890));

    // Example Position Manager (update after deployment):
    // IPositionManager posm = IPositionManager(address(0x0987654321098765432109876543210987654321));
}
