// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script } from "lib/forge-std/src/Script.sol";
import { stdJson } from "lib/forge-std/src/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { PriceFeedWithFallback } from "contracts/pricefeeds/PriceFeedWithFallback.sol";

contract DeployPriceFeeds is Script {
    using stdJson for string;

    uint256 ownerPrivateKey = uint256(vm.envUint("OWNER_PRIVATE_KEY"));

    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        address sequencer = 0xfFd429Ca49Fe50075ef71079443615EBD933842a;
        address zeroAddress = address(0);
        uint24 week = 1 weeks;

        vm.startBroadcast(ownerPrivateKey);
        address usdc = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.usdc.tokenAddress,
                config.usdc.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "USDC Price Feed"
            )
        );
        address wbtc = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.wbtc.tokenAddress,
                config.wbtc.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "WBTC Price Feed"
            )
        );
        address weth = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.weth.tokenAddress,
                config.weth.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "WETH Price Feed"
            )
        );
        address link = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.link.tokenAddress,
                config.link.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "LINK Price Feed"
            )
        );
        address stETH = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.stETH.tokenAddress,
                config.stETH.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "stETH Price Feed"
            )
        );
        address wstETH = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.wstETH.tokenAddress,
                config.wstETH.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "wstETH Price Feed"
            )
        );
        address susde = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.sUSDe.tokenAddress,
                config.sUSDe.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "sUSDe Price Feed"
            )
        );
        address snx = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.snx.tokenAddress,
                config.snx.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "SNX Price Feed"
            )
        );
        address jpy = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.jpy.tokenAddress,
                config.jpy.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                8,
                "JPY Price Feed"
            )
        );
        address oETH = address(
            new PriceFeedWithFallback(
                config.owner,
                sequencer,
                config.oETH.tokenAddress,
                config.oETH.chainlinkPriceFeed,
                zeroAddress,
                week,
                0,
                18,
                "oETH Price Feed"
            )
        );
        vm.stopBroadcast();

        /*//////////////////////////////////////////////////////////////
                             UPDATE CONFIG
        //////////////////////////////////////////////////////////////*/
        string memory path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");

        vm.writeJson(vm.toString(usdc), path, ".assets.USDC.priceFeed");
        vm.writeJson(vm.toString(wbtc), path, ".assets.WBTC.priceFeed");
        vm.writeJson(vm.toString(weth), path, ".assets.WETH.priceFeed");
        vm.writeJson(vm.toString(link), path, ".assets.LINK.priceFeed");
        vm.writeJson(vm.toString(stETH), path, ".assets.stETH.priceFeed");
        vm.writeJson(vm.toString(wstETH), path, ".assets.wstETH.priceFeed");
        vm.writeJson(vm.toString(susde), path, ".assets.sUSDe.priceFeed");
        vm.writeJson(vm.toString(snx), path, ".assets.SNX.priceFeed");
        vm.writeJson(vm.toString(jpy), path, ".assets.JPY.priceFeed");
        vm.writeJson(vm.toString(oETH), path, ".assets.oETH.priceFeed");
    }
}
