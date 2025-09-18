// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {MockToken} from "../src/MockToken.sol";

contract DeployTokensScript is Script {
    /////////////////////////////////////
    // --- Parameters to Configure --- //
    /////////////////////////////////////

    // Token configurations - modify as needed
    string constant TOKEN0_NAME = "Ethereum-Jay";
    string constant TOKEN0_SYMBOL = "ETHJ";
    uint8 constant TOKEN0_DECIMALS = 18;

    string constant TOKEN1_NAME = "Meme Token";
    string constant TOKEN1_SYMBOL = "MEME";
    uint8 constant TOKEN1_DECIMALS = 18;

    // Initial mint amounts (in tokens, not wei)
    uint256 constant INITIAL_MINT_AMOUNT = 1_000_000; // 1M tokens each

    /////////////////////////////////////

    function setUp() public {}

    function run() public returns (MockToken token0, MockToken token1) {
        vm.startBroadcast();

        // Deploy tokens
        MockToken tokenA = new MockToken(TOKEN0_NAME, TOKEN0_SYMBOL, TOKEN0_DECIMALS);
        MockToken tokenB = new MockToken(TOKEN1_NAME, TOKEN1_SYMBOL, TOKEN1_DECIMALS);

        // Mint initial supply to deployer
        uint256 amount0 = INITIAL_MINT_AMOUNT * 10 ** token0.decimals();
        uint256 amount1 = INITIAL_MINT_AMOUNT * 10 ** token1.decimals();

        token0.mint(msg.sender, amount0);
        token1.mint(msg.sender, amount1);

        vm.stopBroadcast();
    }
}
