// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { FaucetToken } from "./FaucetToken.sol";
import { SimplePriceFeed } from "./SimplePriceFeed.sol";
import { ISandboxController } from "../interfaces/ISandboxController.sol";

contract OverflowSetup {
    struct AssetLimits {
        uint64 minBorrowCF;
        uint64 maxBorrowCF;
        uint64 minLiquidateCF;
        uint64 maxLiquidateCF;
        uint64 minLiquidationFactor;
        uint64 maxLiquidationFactor;
    }

    address[] public collateralTokens;
    address public baseToken;

    function deployTokensAndFeeds(uint256 numCollateralTokens, address sandboxController, AssetLimits memory defaultAssetLimits) external {
        // ----- Deploy Base Token and Price Feed
        // ----- Whitelist the Base Token
        address _baseToken = address(new FaucetToken(1e24, "Base Token", 18, "BT"));
        baseToken = _baseToken;
        address basePriceFeed = address(new SimplePriceFeed(1e8, 8, _baseToken));
        ISandboxController.BaseAssetCurve memory baseAssetCurve = ISandboxController.BaseAssetCurve({
            supplyKink: 8 * 1e17,
            supplyPerYearInterestRateBase: 5 * 1e16,
            supplyPerYearInterestRateSlopeLow: 2 * 1e18,
            supplyPerYearInterestRateSlopeHigh: 1e15,
            borrowKink: 8 * 1e17,
            borrowPerYearInterestRateBase: 1e17,
            borrowPerYearInterestRateSlopeLow: 3 * 1e18,
            borrowPerYearInterestRateSlopeHigh: 5 * 1e15
        });
        ISandboxController(sandboxController).whitelistBaseAsset(_baseToken, basePriceFeed, baseAssetCurve, 1e18, 1e11, 7 days);
        // ----- Deploy Collateral Tokens and Price Feeds
        // ----- Whitelist the Collateral Tokens
        for (uint256 i = 0; i < numCollateralTokens; i++) {
            address collateralToken = address(new FaucetToken(1e24, "Collateral Token", 18, "CT"));
            address priceFeed = address(new SimplePriceFeed(1e8, 8, collateralToken));
            collateralTokens.push(collateralToken);

            ISandboxController(sandboxController).whitelistCollateralAsset(
                collateralToken,
                priceFeed,
                defaultAssetLimits.minBorrowCF,
                defaultAssetLimits.maxBorrowCF,
                defaultAssetLimits.minLiquidateCF,
                defaultAssetLimits.maxLiquidateCF,
                defaultAssetLimits.minLiquidationFactor,
                defaultAssetLimits.maxLiquidationFactor
            );
        }
    }

    function collateralsAllocateToComet(address comet, uint256 amount) external {
        for (uint256 j = 0; j < collateralTokens.length; j++) {
            FaucetToken(collateralTokens[j]).allocateTo(comet, amount);
        }
    }

    function getCollateralTokens() external view returns (address[] memory) {
        return collateralTokens;
    }
}
