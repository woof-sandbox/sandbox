// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { SandboxController } from "contracts/SandboxController.sol";

contract WhitelistCollateralAssets is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        whitelistCollateralAssets(config);
    }

    function whitelistCollateralAssets(HelperConfig.NetworkConfig memory config) public {
        uint256 sandboxControllerDeployerPrivateKey = vm.envUint("SANDBOX_CONTROLLER_DEPLOYER_PRIVATE_KEY");

        SandboxController sandboxController = SandboxController(config.sandboxController);

        /*//////////////////////////////////////////////////////////////
                            WHITELIST ASSETS
        //////////////////////////////////////////////////////////////*/
        vm.startBroadcast(sandboxControllerDeployerPrivateKey);

        // USDC
        sandboxController.whitelistCollateralAsset(
            config.usdc.tokenAddress,
            config.usdc.priceFeed,
            config.usdc.minBorrowCF,
            config.usdc.maxBorrowCF,
            config.usdc.minLiquidateCF,
            config.usdc.maxLiquidateCF,
            config.usdc.minLiquidationF,
            config.usdc.maxLiquidationF,
            config.usdc.supplyCap
        );
        console.log("Collateral USDC is whitelisted");

        // WBTC
        sandboxController.whitelistCollateralAsset(
            config.wbtc.tokenAddress,
            config.wbtc.priceFeed,
            config.wbtc.minBorrowCF,
            config.wbtc.maxBorrowCF,
            config.wbtc.minLiquidateCF,
            config.wbtc.maxLiquidateCF,
            config.wbtc.minLiquidationF,
            config.wbtc.maxLiquidationF,
            config.wbtc.supplyCap
        );
        console.log("Collateral WBTC is whitelisted");

        // WETH
        sandboxController.whitelistCollateralAsset(
            config.weth.tokenAddress,
            config.weth.priceFeed,
            config.weth.minBorrowCF,
            config.weth.maxBorrowCF,
            config.weth.minLiquidateCF,
            config.weth.maxLiquidateCF,
            config.weth.minLiquidationF,
            config.weth.maxLiquidationF,
            config.weth.supplyCap
        );
        console.log("Collateral WETH is whitelisted");

        // LINK
        sandboxController.whitelistCollateralAsset(
            config.link.tokenAddress,
            config.link.priceFeed,
            config.link.minBorrowCF,
            config.link.maxBorrowCF,
            config.link.minLiquidateCF,
            config.link.maxLiquidateCF,
            config.link.minLiquidationF,
            config.link.maxLiquidationF,
            config.link.supplyCap
        );
        console.log("Collateral LINK is whitelisted");

        // stETH
        sandboxController.whitelistCollateralAsset(
            config.stETH.tokenAddress,
            config.stETH.priceFeed,
            config.stETH.minBorrowCF,
            config.stETH.maxBorrowCF,
            config.stETH.minLiquidateCF,
            config.stETH.maxLiquidateCF,
            config.stETH.minLiquidationF,
            config.stETH.maxLiquidationF,
            config.stETH.supplyCap
        );
        console.log("Collateral stETH is whitelisted");

        // wstETH
        sandboxController.whitelistCollateralAsset(
            config.wstETH.tokenAddress,
            config.wstETH.priceFeed,
            config.wstETH.minBorrowCF,
            config.wstETH.maxBorrowCF,
            config.wstETH.minLiquidateCF,
            config.wstETH.maxLiquidateCF,
            config.wstETH.minLiquidationF,
            config.wstETH.maxLiquidationF,
            config.wstETH.supplyCap
        );
        console.log("Collateral wstETH is whitelisted");

        // sUSDe
        sandboxController.whitelistCollateralAsset(
            config.sUSDe.tokenAddress,
            config.sUSDe.priceFeed,
            config.sUSDe.minBorrowCF,
            config.sUSDe.maxBorrowCF,
            config.sUSDe.minLiquidateCF,
            config.sUSDe.maxLiquidateCF,
            config.sUSDe.minLiquidationF,
            config.sUSDe.maxLiquidationF,
            config.sUSDe.supplyCap
        );
        console.log("Collateral sUSDe is whitelisted");

        // SNX
        sandboxController.whitelistCollateralAsset(
            config.snx.tokenAddress,
            config.snx.priceFeed,
            config.snx.minBorrowCF,
            config.snx.maxBorrowCF,
            config.snx.minLiquidateCF,
            config.snx.maxLiquidateCF,
            config.snx.minLiquidationF,
            config.snx.maxLiquidationF,
            config.snx.supplyCap
        );
        console.log("Collateral SNX is whitelisted");

        // JPY
        sandboxController.whitelistCollateralAsset(
            config.jpy.tokenAddress,
            config.jpy.priceFeed,
            config.jpy.minBorrowCF,
            config.jpy.maxBorrowCF,
            config.jpy.minLiquidateCF,
            config.jpy.maxLiquidateCF,
            config.jpy.minLiquidationF,
            config.jpy.maxLiquidationF,
            config.jpy.supplyCap
        );
        console.log("Collateral JPY is whitelisted");

        // oETH
        sandboxController.whitelistCollateralAsset(
            config.oETH.tokenAddress,
            config.oETH.priceFeed,
            config.oETH.minBorrowCF,
            config.oETH.maxBorrowCF,
            config.oETH.minLiquidateCF,
            config.oETH.maxLiquidateCF,
            config.oETH.minLiquidationF,
            config.oETH.maxLiquidationF,
            config.oETH.supplyCap
        );
        console.log("Collateral oETH is whitelisted");

        vm.stopBroadcast();
    }
}
