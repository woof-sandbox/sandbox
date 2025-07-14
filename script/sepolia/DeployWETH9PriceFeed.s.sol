// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { WETH9 } from "contracts/test/WETH9.sol";
import { Script, console } from "forge-std/Script.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { ManagedSimplePriceFeed } from "contracts/test/ManagedSimplePriceFeed.sol";

contract DeployWETH9PriceFeed is Script {
    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();
        vm.startBroadcast();

        ManagedSimplePriceFeed wethPriceFeed = new ManagedSimplePriceFeed(0, 18, config.weth);
        wethPriceFeed.setRoundData(0, 248628071000, block.timestamp, block.timestamp, 0);

        console.log("WETH9 Price Feed deployed at:", address(wethPriceFeed));

        vm.stopBroadcast();
    }
}
