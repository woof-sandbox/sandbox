// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { ManagedFaucetToken } from "contracts/test/ManagedFaucetToken.sol";
import { Script } from "forge-std/Script.sol";

contract DistributeTokens is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast();

        address[] memory tokens = new address[](4);
        tokens[0] = config.wbtc;
        tokens[1] = config.usdc;
        tokens[2] = config.link;
        tokens[3] = config.comp;

        address[] memory recipients = new address[](4);
        recipients[0] = 0x1234567890123456789012345678901234567890; // Replace with actual recipient addresses
        recipients[1] = 0x2345678901234567890123456789012345678901; // Replace with actual recipient addresses
        recipients[2] = 0x3456789012345678901234567890123456789012; // Replace with actual recipient addresses
        recipients[3] = 0x4567890123456789012345678901234567890123; // Replace with actual recipient addresses

        uint256[] memory amounts = new uint256[](4);
        amounts[0] = 0.01 ether; // 0.01 WBTC
        amounts[1] = 1000e6; // 1000 USDC
        amounts[2] = 10e18; // 10 LINK
        amounts[3] = 5e18; // 5 COMP

        for (uint256 i = 0; i < tokens.length; i++) {
            ManagedFaucetToken(tokens[i]).allocateTo(recipients[i], amounts[i]);
        }

        vm.stopBroadcast();
    }
}
