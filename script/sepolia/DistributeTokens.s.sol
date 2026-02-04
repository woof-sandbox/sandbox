// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { Script } from "forge-std/Script.sol";
import { WETH9 } from "contracts/test/WETH9.sol";
import { MockERC20 } from "contracts/test/MockERC20.sol";

contract DistributeTokens is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        uint256 ownerPrivateKey = uint256(vm.envUint("OWNER_PRIVATE_KEY"));

        address[] memory tokens = new address[](10);
        tokens[0] = config.usdc.tokenAddress;
        tokens[1] = config.wbtc.tokenAddress;
        tokens[2] = config.weth.tokenAddress;
        tokens[3] = config.link.tokenAddress;
        tokens[4] = config.stETH.tokenAddress;
        tokens[5] = config.wstETH.tokenAddress;
        tokens[6] = config.sUSDe.tokenAddress;
        tokens[7] = config.snx.tokenAddress;
        tokens[8] = config.jpy.tokenAddress;
        tokens[9] = config.oETH.tokenAddress;

        address[] memory recipients = new address[](1);
        recipients[0] = 0x800cE94b7cA3aeb5F5BAf1179A7d25B84EFE3e68;

        uint256[] memory amounts = new uint256[](10);
        amounts[0] = 500e6;
        amounts[1] = 0.01e8;
        amounts[2] = 0.05e18;
        amounts[3] = 5e18;
        amounts[4] = 0.05e18;
        amounts[5] = 0.05e18;
        amounts[6] = 500e6;
        amounts[7] = 100e18;
        amounts[8] = 1000e18;
        amounts[9] = 0.05e18;

        vm.startBroadcast(ownerPrivateKey);

        for (uint256 i = 0; i < tokens.length; i++) {
            if (tokens[i] == config.weth.tokenAddress) {
                WETH9 weth = WETH9(payable(tokens[i]));
                weth.mintTo(recipients[0], amounts[i] * 1000);
            } else {
                MockERC20(tokens[i]).mintTo(recipients[0], amounts[i] * 1000);
            }
        }

        vm.stopBroadcast();
    }
}
