// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Script } from "forge-std/Script.sol";
import { WETH9 } from "contracts/test/WETH9.sol";
import { ManagedFaucetToken } from "contracts/test/ManagedFaucetToken.sol";
import { ISandboxComet } from "contracts/interfaces/ISandboxComet.sol";
import { CometExtension } from "contracts/CometExtension.sol";

contract DistributeTokens is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast();

        address[] memory tokens = new address[](5);
        tokens[0] = config.wbtc;
        tokens[1] = config.usdc;
        tokens[2] = config.link;
        tokens[3] = config.comp;
        tokens[4] = config.weth;

        address[] memory recipients = new address[](3);
        recipients[0] = 0x44908EF517c28DE800222A9F2030efbb01eE9aFe; // Replace with actual recipient addresses
        recipients[1] = 0xa7EcbfFdF700383F981f003048FAf598886637d3; // Replace with actual recipient addresses
        recipients[2] = 0xc9DDCAc9D1CAF777d95e59e0d57A20c7A1E1474A; // Replace with actual recipient addresses

        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 0.01 ether; // 0.01 WBTC
        amounts[1] = 1000e6; // 1000 USDC
        amounts[2] = 10e18; // 10 LINK
        amounts[3] = 5e18; // 5 COMP
        amounts[4] = 0.5 ether; // 0.5 WETH

        // for (uint256 k = 0; k < recipients.length; k++) {
        //     for (uint256 i = 0; i < tokens.length; i++) {
        //         if (tokens[i] == config.weth) {
        //             WETH9 weth = WETH9(payable(tokens[i]));
        //             weth.mintTo(recipients[k], amounts[i]);
        //         } else {
        //             ManagedFaucetToken(tokens[i]).transfer(recipients[k], amounts[i]);
        //         }
        //     }
        // }

        WETH9 weth = WETH9(payable(config.weth));
        weth.mintTo(0x95e4aAc15FEE4230F843573a8c964a84D048993C, 10 ether);

        // CometExtension comet = CometExtension(config.comet1);
        // comet.getConfiguration();

        vm.stopBroadcast();
    }
}
