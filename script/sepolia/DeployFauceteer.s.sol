// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { Fauceteer } from "contracts/test/Fauceteer.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

contract DeployFauceteer is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        uint256 deployer = uint256(vm.envUint("FAUCETEER_DEPLOYER_PRIVATE_KEY"));

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

        vm.startBroadcast(deployer);

        address fauceteer = address(new Fauceteer(msg.sender, tokens, amounts));

        vm.stopBroadcast();

        console.log("Fauceteer deployed successfully at:", fauceteer);
    }
}
