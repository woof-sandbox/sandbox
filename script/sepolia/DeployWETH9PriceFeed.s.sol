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

        // Data for price feed
        uint80 roundId = 0;
        int256 price = 248628071000;
        uint256 startedAt = block.timestamp;
        uint256 updatedAt = block.timestamp;
        uint80 answeredInRound = 0;

        ManagedSimplePriceFeed wethPriceFeed = new ManagedSimplePriceFeed(0, 18, config.weth.tokenAddress);
        wethPriceFeed.setRoundData(roundId, price, startedAt, updatedAt, answeredInRound);

        console.log("WETH9 Price Feed deployed at:", address(wethPriceFeed));

        vm.stopBroadcast();
    }
}
