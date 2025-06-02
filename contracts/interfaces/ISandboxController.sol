// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ISandboxErrors.sol";

abstract contract ISandboxController is ISandboxErrors {
    enum MarketState {
        Low,
        Medium,
        High
    }

    struct BaseAssetCurve {
        uint64 supplyKink;
        uint64 supplyPerYearInterestRateBase;
        uint64 supplyPerYearInterestRateSlopeLow;
        uint64 supplyPerYearInterestRateSlopeHigh;
        uint64 borrowKink;
        uint64 borrowPerYearInterestRateBase;
        uint64 borrowPerYearInterestRateSlopeLow;
        uint64 borrowPerYearInterestRateSlopeHigh;
    }

    struct BaseAssetConfiguration {
        address priceFeed;
        uint8 decimals;
        uint256 minBorrow;
        BaseAssetCurve[] baseAssetCurves;
    }

    struct CollateralAssetConfiguration {
        address collateralToken;
        address priceFeed;
        uint8 decimals;
        uint64 maxBorrowCollateralFactor;
        uint64 minBorrowCollateralFactor;
        uint64 minLiquidateCollateralFactor;
        uint64 maxLiquidateCollateralFactor;
        uint64 minLiquidationFactor;
        uint64 maxLiquidationFactor;
    }

    struct SandboxControllerConfiguration {
        uint256 targetPercent;
        uint256 storeFrontPriceFactor;
        uint256 minUpdateTime;
        uint256 maxUpdateTime;
        uint256 suggestedAmountOfSeedReserves;
        uint256 suggestedLockTimeOfSeedReserves;
    }
    
    event BaseAssetWhitelisted(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurve,
        uint256 minBorrow,
        uint256 baseAssetCount,
        uint256 curveIndex
    );
    event BaseAssetCurveAdded(address indexed token, BaseAssetCurve baseAssetCurve, uint256 curveIndex);
    event BaseAssetCurveChanged(address indexed token, BaseAssetCurve oldCurve, BaseAssetCurve newCurve, uint256 curveIndex);
    event CollateralAssetWhitelisted(
        address indexed token,
        address indexed priceFeed,
        uint256 decimals,
        uint64 maxBorrowCollateralFactor,
        uint64 minBorrowCollateralFactor,
        uint64 minLiquidateCollateralFactor,
        uint64 maxLiquidateCollateralFactor,
        uint64 minLiquidationFactor,
        uint64 maxLiquidationFactor
    );

    event ThresholdChanged(MarketState state, uint256 oldValue, uint256 newValue);
    event ReserveCommissionChanged(MarketState state, uint256 oldValue, uint256 newValue);
    event ProtocolCommissionChanged(MarketState state, uint256 oldValue, uint256 newValue);
    event TreasuryChanged(address oldTreasury, address newTreasury);
    event ConfigurationChanged(SandboxControllerConfiguration oldConfig, SandboxControllerConfiguration newConfig);
    event FeeEnabledSet(bool feeEnabled);
    event OwnerTransferred(address oldOwner, address newOwner);
    event DaoTransferred(address oldDao, address newDao);

    function protocolFactorBorrow() external view virtual returns (uint256);
    function reserveFactorBorrow() external view virtual returns (uint256);
    function protocolFactorLiquidation() external view virtual returns (uint256);
    function reserveFactorLiquidation() external view virtual returns (uint256);
    function maxCollateralAssets() external view virtual returns (uint256);
    function getBaseAssetLength() external view virtual returns (uint256);
    function getCollateralAssetLength() external view virtual returns (uint256);
    function treasury() external view virtual returns (address);
    function owner() external view virtual returns (address);
    function dao() external view virtual returns (address);
    function feeEnabled() external view virtual returns (bool);
    function controllerConfiguration() external view virtual returns (SandboxControllerConfiguration memory);
    function proposalBoundaries() external view virtual returns (uint,uint);
    function baseAssetTokens(uint256) external view virtual returns (address);
    function collateralAssetTokens(uint256) external view virtual returns (address);
    function tokenToPriceFeed(address) external view virtual returns (address);
    function reserveCommission(MarketState) external view virtual returns (uint256);
    function protocolCommission(MarketState) external view virtual returns (uint256);

    function whitelistBaseAsset(
        address token,
        address priceFeed,
        BaseAssetCurve memory baseAssetCurve,
        uint256 minBorrow
    ) external virtual;

    function whitelistCollateralAsset(
        address token,
        address priceFeed,
        uint64 minBorrowCollateralFactor,
        uint64 maxBorrowCollateralFactor,
        uint64 minLiquidateCollateralFactor,
        uint64 maxLiquidateCollateralFactor,
        uint64 minLiquidationFactor,
        uint64 maxLiquidationFactor
    ) external virtual;

    function addBaseAssetCurve(address token, BaseAssetCurve memory baseAssetCurve) external virtual;
    function changeBaseAssetCurve(address token, uint256 curveIndex, BaseAssetCurve memory newCurve) external virtual;
    function setReserveCommissions(uint256[3] calldata reserveCommissions) external virtual;
    function setProtocolCommissions(uint256[3] calldata protocolCommissions) external virtual;
    function setTreasury(address _treasury) external virtual;
    function setConfiguration(SandboxControllerConfiguration memory _config) external virtual;
    function setFeeEnabled(bool _feeEnabled) external virtual;
    function transferOwner(address newOwner) external virtual;
    function transferDao(address newDao) external virtual;
    function isBaseTokenWhitelisted(address token) external view virtual returns (bool);
    function isCollateralTokenWhitelisted(address token) external view virtual returns (bool);
    function isCurveConfigurationValid(BaseAssetCurve memory curve) external pure virtual returns (bool);
    function baseAssets(address token) external view virtual returns (BaseAssetConfiguration memory);
    function collateralAssets(address token) external view virtual returns (CollateralAssetConfiguration memory);
    function curves(address token) external view virtual returns (BaseAssetCurve[] memory);

    function config() external view virtual returns (SandboxControllerConfiguration memory);
}
