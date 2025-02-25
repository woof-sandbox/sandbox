// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

abstract contract ISandboxController {
    /// @notice Mapping of base assets to their configurations.
    mapping(address => BaseAssetConfiguration) public baseAssets;
    /// @notice Mapping of collateral assets to their configurations.
    mapping(address => CollateralAsset) public collateralAssets;

    /// @notice Tracks whitelisted price feeds.
    mapping(address => bool) public isPriceFeedWhitelisted;

    /// @notice Structure to store base asset configuration.
    struct BaseAssetConfiguration {
        address priceFeed;
        uint256 decimals;
        BaseAssetCurve[] baseAssetCurves;
    }

    /// @notice Structure defining interest rate curve parameters.
    struct BaseAssetCurve {
        uint64 supplyKink;
        uint64 supplyPerYearInterestRateSlopeLow;
        uint64 supplyPerYearInterestRateSlopeHigh;
        uint64 supplyPerYearInterestRateSlopeBase;
        uint64 borrowKink;
        uint64 borrowPerYearInterestRateSlopeLow;
        uint64 borrowPerYearInterestRateSlopeHigh;
        uint64 borrowPerYearInterestRateSlopeBase;
    }

    struct CollateralAsset {
        address collateralToken;
        address priceFeed;
        uint256 decimals;
        uint64 maxBorrowCollateralFactor;
        uint64 minBorrowCollateralFactor;
        uint64 minLiquidateCollateralFactor;
        uint64 maxLiquidateCollateralFactor;
        uint64 minLiquidationFactor;
        uint64 maxLiquidationFactor;
    }


    /// @notice Event emitted when a base asset is whitelisted.
    event BaseAssetWhitelisted(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Event emitted when a base asset curve is added.
    event BaseAssetCurveAdded(
        address indexed token,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Event emitted when a base asset curve is changed.
    event BaseAssetCurveChanged(
        address indexed token,
        BaseAssetCurve baseAssetCurveBefore,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Custom errors for various invalid operations.
    error ZeroAddress();
    error TokenAlreadyWhitelisted();
    error TokenNotWhitelisted();
    error PriceFeedAlreadyWhitelisted();
    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error NotAuthorized(address caller);

    function baseAssetCount() virtual external view returns (uint256);

    function baseAssetTokens(uint256 index) virtual external view returns (address);

}
