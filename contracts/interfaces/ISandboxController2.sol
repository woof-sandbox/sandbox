// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

interface ISandboxController2 {
    
    /// @notice Structure to store base asset configuration.
    struct BaseAssetConfiguration {
        address priceFeed;
        uint256 decimals;
        uint256 minBorrow;
        BaseAssetCurve[] baseAssetCurves;
    }

    /// @notice Structure defining interest rate curve parameters.
    struct BaseAssetCurve {
        uint64 supplyKink;
        uint64 supplyPerYearInterestRateSlopeLow;
        uint64 supplyPerYearInterestRateSlopeHigh;
        uint64 supplyPerYearInterestRateBase;
        uint64 borrowKink;
        uint64 borrowPerYearInterestRateSlopeLow;
        uint64 borrowPerYearInterestRateSlopeHigh;
        uint64 borrowPerYearInterestRateBase;
    }

    struct CollateralTokenConfig {
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
        uint256 minBorrow,
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

    function baseAssetCount() external view returns (uint256);

    function baseAssetTokens(uint256 index) external view returns (address);

    function isPriceFeedWhitelisted(address priceFeed) external view returns (bool);

    function getBaseAssetByAddress(address _baseToken) external view returns (BaseAssetConfiguration memory);
    
    function getCollateralAssetByAddress(address _collateralToken) external view returns (CollateralTokenConfig memory);
}
