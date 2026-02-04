// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { MockPriceFeedAggregator } from "contracts/test/MockPriceFeedAggregator.sol";
import { PriceFeedWithFallback } from "contracts/pricefeeds/PriceFeedWithFallback.sol";

contract ChangePriceFeeds is Script {
    uint256 ownerPrivateKey = uint256(vm.envUint("OWNER_PRIVATE_KEY"));
    uint24 public constant updateTimeLimit = 604800;
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        vm.startBroadcast(ownerPrivateKey);

        // USDC
        HelperConfig.AssetConfig memory usdc = config.usdc;
        PriceFeedWithFallback usdcPriceFeedWithFallback = PriceFeedWithFallback(usdc.priceFeed);
        MockPriceFeedAggregator usdcPriceFeed = new MockPriceFeedAggregator(usdcPriceFeedWithFallback.decimals(), usdc.tokenAddress, usdc.chainlinkPriceFeed);
        usdcPriceFeedWithFallback.setPriceFeeds(address(usdcPriceFeed), address(0), updateTimeLimit, 0);

        // WBTC
        HelperConfig.AssetConfig memory wbtc = config.wbtc;
        PriceFeedWithFallback wbtcPriceFeedWithFallback = PriceFeedWithFallback(wbtc.priceFeed);
        MockPriceFeedAggregator wbtcPriceFeed = new MockPriceFeedAggregator(wbtcPriceFeedWithFallback.decimals(), wbtc.tokenAddress, wbtc.chainlinkPriceFeed);
        wbtcPriceFeedWithFallback.setPriceFeeds(address(wbtcPriceFeed), address(0), updateTimeLimit, 0);

        // WETH
        HelperConfig.AssetConfig memory weth = config.weth;
        PriceFeedWithFallback wethPriceFeedWithFallback = PriceFeedWithFallback(weth.priceFeed);
        MockPriceFeedAggregator wethPriceFeed = new MockPriceFeedAggregator(wethPriceFeedWithFallback.decimals(), weth.tokenAddress, weth.chainlinkPriceFeed);
        wethPriceFeedWithFallback.setPriceFeeds(address(wethPriceFeed), address(0), updateTimeLimit, 0);

        // LINK
        HelperConfig.AssetConfig memory link = config.link;
        PriceFeedWithFallback linkPriceFeedWithFallback = PriceFeedWithFallback(link.priceFeed);
        MockPriceFeedAggregator linkPriceFeed = new MockPriceFeedAggregator(linkPriceFeedWithFallback.decimals(), link.tokenAddress, link.chainlinkPriceFeed);
        linkPriceFeedWithFallback.setPriceFeeds(address(linkPriceFeed), address(0), updateTimeLimit, 0);

        // stETH
        HelperConfig.AssetConfig memory stETH = config.stETH;
        PriceFeedWithFallback stETHPriceFeedWithFallback = PriceFeedWithFallback(stETH.priceFeed);
        MockPriceFeedAggregator stETHPriceFeed = new MockPriceFeedAggregator(stETHPriceFeedWithFallback.decimals(), stETH.tokenAddress, stETH.chainlinkPriceFeed);
        stETHPriceFeedWithFallback.setPriceFeeds(address(stETHPriceFeed), address(0), updateTimeLimit, 0);

        // wstETH
        HelperConfig.AssetConfig memory wstETH = config.wstETH;
        PriceFeedWithFallback wstETHPriceFeedWithFallback = PriceFeedWithFallback(wstETH.priceFeed);
        MockPriceFeedAggregator wstETHPriceFeed = new MockPriceFeedAggregator(wstETHPriceFeedWithFallback.decimals(), wstETH.tokenAddress, wstETH.chainlinkPriceFeed);
        wstETHPriceFeedWithFallback.setPriceFeeds(address(wstETHPriceFeed), address(0), updateTimeLimit, 0);

        // sUSDe
        HelperConfig.AssetConfig memory sUSDe = config.sUSDe;
        PriceFeedWithFallback sUSDePriceFeedWithFallback = PriceFeedWithFallback(sUSDe.priceFeed);
        MockPriceFeedAggregator sUSDePriceFeed = new MockPriceFeedAggregator(sUSDePriceFeedWithFallback.decimals(), sUSDe.tokenAddress, sUSDe.chainlinkPriceFeed);
        sUSDePriceFeedWithFallback.setPriceFeeds(address(sUSDePriceFeed), address(0), updateTimeLimit, 0);

        // SNX
        HelperConfig.AssetConfig memory snx = config.snx;
        PriceFeedWithFallback snxPriceFeedWithFallback = PriceFeedWithFallback(snx.priceFeed);
        MockPriceFeedAggregator snxPriceFeed = new MockPriceFeedAggregator(snxPriceFeedWithFallback.decimals(), snx.tokenAddress, snx.chainlinkPriceFeed);
        snxPriceFeedWithFallback.setPriceFeeds(address(snxPriceFeed), address(0), updateTimeLimit, 0);

        // JPY
        HelperConfig.AssetConfig memory jpy = config.jpy;
        PriceFeedWithFallback jpyPriceFeedWithFallback = PriceFeedWithFallback(jpy.priceFeed);
        MockPriceFeedAggregator jpyPriceFeed = new MockPriceFeedAggregator(jpyPriceFeedWithFallback.decimals(), jpy.tokenAddress, jpy.chainlinkPriceFeed);
        jpyPriceFeedWithFallback.setPriceFeeds(address(jpyPriceFeed), address(0), updateTimeLimit, 0);

        // oETH
        HelperConfig.AssetConfig memory oETH = config.oETH;
        PriceFeedWithFallback oETHPriceFeedWithFallback = PriceFeedWithFallback(oETH.priceFeed);
        MockPriceFeedAggregator oETHPriceFeed = new MockPriceFeedAggregator(oETHPriceFeedWithFallback.decimals(), oETH.tokenAddress, oETH.chainlinkPriceFeed);
        oETHPriceFeedWithFallback.setPriceFeeds(address(oETHPriceFeed), address(0), updateTimeLimit, 0);

        vm.stopBroadcast();
    }
}