//SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @title PositionManagerAddresses
/// @notice Library containing Position Manager addresses for different chains
library PoolModifyLiquidityAddresses {
    function getPoolModifyLiquidityByChainId(uint256 chainId) internal pure returns (address) {
        //Ethereum
        if (chainId == 1) {
            return address(0);
        }
        //Unichain
        else if (chainId == 130) {
            return address(0);
        }
        //Optimism
        else if (chainId == 10) {
            return address(0);
        }
        //Base
        else if (chainId == 8453) {
            return address(0);
        }
        //Arbitrum One
        else if (chainId == 42161) {
            return address(0);
        }
        //Polygon
        else if (chainId == 137) {
            return address(0);
        }
        //Blast
        else if (chainId == 81457) {
            return address(0);
        }
        //Zora
        else if (chainId == 7777777) {
            return address(0);
        }
        //Worldchain
        else if (chainId == 480) {
            return address(0);
        }
        //Ink
        else if (chainId == 57073) {
            return address(0);
        }
        //Soneium
        else if (chainId == 1868) {
            return address(0);
        }
        //Avalanche
        else if (chainId == 43114) {
            return address(0);
        }
        //BNB Smart Chain
        else if (chainId == 56) {
            return address(0);
        }
        //Unichain Sepolia
        else if (chainId == 1301) {
            return address(0x5fa728C0A5cfd51BEe4B060773f50554c0C8A7AB);
        }
        //Sepolia
        else if (chainId == 11155111) {
            return address(0x0C478023803a644c94c4CE1C1e7b9A087e411B0A);
        }
        //Base Sepolia
        else if (chainId == 84532) {
            return address(0x37429cD17Cb1454C34E7F50b09725202Fd533039);
        }
        //Arbitrum Sepolia
        else if (chainId == 421614) {
            return address(0x9A8ca723F5dcCb7926D00B71deC55c2fEa1F50f7);
        } else if (chainId == 31337) {
            return address(0xa82fF9aFd8f496c3d6ac40E2a0F282E47488CFc9); //always update whenever deployed locally
        } else {
            revert("Unsupported chainId");
        }
    }
}
