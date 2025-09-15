// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Script } from "forge-std/Script.sol";
import { WETH9 } from "contracts/tests/WETH9.sol";
import { ManagedFaucetToken } from "contracts/tests/ManagedFaucetToken.sol";
import { ISandboxComet } from "contracts/interfaces/internal/sandbox/ISandboxComet.sol";
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

        address[] memory recipients = new address[](5);
        recipients[0] = 0x44908EF517c28DE800222A9F2030efbb01eE9aFe; // Replace with actual recipient addresses
        recipients[1] = 0xa7EcbfFdF700383F981f003048FAf598886637d3; // Replace with actual recipient addresses
        recipients[2] = 0xc9DDCAc9D1CAF777d95e59e0d57A20c7A1E1474A; // Replace with actual recipient addresses
        recipients[3] = 0x14Bc5e66FF4e49D18bFf96C11d72A894DF285e5f; // Replace with actual recipient addresses
        recipients[4] = 0xCE56294c40E8f479F709F207870c41450070C611; // Replace with actual recipient addresses

        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 0.01e8; // 0.01 WBTC
        amounts[1] = 1000e6; // 1000 USDC
        amounts[2] = 10e18; // 10 LINK
        amounts[3] = 5e18; // 5 COMP
        amounts[4] = 0.5 ether; // 0.5 WETH

        for (uint256 k = 0; k < recipients.length; k++) {
            for (uint256 i = 0; i < tokens.length; i++) {
                if (tokens[i] == config.weth) {
                    WETH9 weth = WETH9(payable(tokens[i]));
                    weth.mintTo(recipients[k], amounts[i]);
                } else {
                    ManagedFaucetToken(tokens[i]).transfer(recipients[k], amounts[i]);
                }
            }
        }

        vm.stopBroadcast();
    }
}
