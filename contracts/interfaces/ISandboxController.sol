// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ISandboxErrors.sol";

interface ISandboxController is ISandboxErrors {
    enum MarketState {
        Low,
        Medium,
        High
    }

    struct BaseAssetCurve {
        /// First 256 bits (32 bytes)
        uint64 supplyKink; // 8 bytes
        uint64 supplyPerYearInterestRateBase; // 8 bytes
        uint64 supplyPerYearInterestRateSlopeLow; // 8 bytes
        uint64 supplyPerYearInterestRateSlopeHigh; // 8 bytes
        /// Last 256 bits (32 bytes)
        uint64 borrowKink; // 8 bytes
        uint64 borrowPerYearInterestRateBase; // 8 bytes
        uint64 borrowPerYearInterestRateSlopeLow; // 8 bytes
        uint64 borrowPerYearInterestRateSlopeHigh; // 8 bytes
    }

    struct BaseAssetConfiguration {
        /// First 256 bits (32 bytes)
        address priceFeed; // 20 bytes
        uint8 decimals; // 1 byte
        /// Wasted space 11 bytes
        /// Second 256 bits (32 bytes)
        /// TODO: Probarly wasted space.
        uint256 minBorrow; // 32 bytes
        /// Third 256 bits (32 bytes)...
        BaseAssetCurve[] baseAssetCurves; // probarly infinity
    }

    struct CollateralAssetConfiguration {
        /// First 256 bits (32 bytes)
        address collateralToken; // 20 bytes
        /// Wasted space 12 bytes
        /// Second 256 bits (32 bytes)
        address priceFeed; // 20 bytes
        uint8 decimals; // 1 byte
        /// Wasted space 11 bytes
        /// Third 256 bits (32 bytes)
        uint64 maxBorrowCollateralFactor; // 8 bytes
        uint64 minBorrowCollateralFactor; // 8 bytes
        uint64 minLiquidateCollateralFactor; // 8 bytes
        uint64 maxLiquidateCollateralFactor; // 8 bytes
        /// Fourth 256 bits (32 bytes)
        uint64 minLiquidationFactor; // 8 bytes
        uint64 maxLiquidationFactor; // 8 bytes
        /// "Free" space 16 bytes
    }

    struct SandboxControllerConfiguration {
        /// First 256 bits (32 bytes) (8+8+5+5+5 = 31 bytes)
        uint64 targetPercent; // 8 bytes
        uint64 storeFrontPriceFactor; // 8 bytes
        uint40 minUpdateTime; // 5 bytes
        uint40 maxUpdateTime; // 5 bytes
    }

    event BaseAssetWhitelisted(address indexed token, address indexed priceFeed, uint8 decimals);

    event BaseAssetCurveAdded(address indexed token, BaseAssetCurve baseAssetCurve, uint256 curveIndex);
    event BaseAssetCurveChanged(address indexed token, BaseAssetCurve oldCurve, BaseAssetCurve newCurve, uint256 curveIndex);
    event CollateralAssetWhitelisted(address indexed token, address indexed priceFeed, uint256 decimals);

    event CommissionChanged(MarketState state, uint64 oldReserve, uint64 newReserve, uint64 oldProtocol, uint64 newProtocol);
    event TreasuryChanged(address oldTreasury, address newTreasury);
    event ConfigurationChanged(SandboxControllerConfiguration oldConfig, SandboxControllerConfiguration newConfig);
    event FeeEnabledSet(bool feeEnabled);
    event OwnerTransferred(address oldOwner, address newOwner);
    event DaoTransferred(address oldDao, address newDao);

    function treasury() external view returns (address);

    function owner() external view returns (address);

    function dao() external view returns (address);

    function feeEnabled() external view returns (bool);

    function proposalBoundaries() external view returns (uint40, uint40);

    function tokenToPriceFeed(address) external view returns (address);

    function reserveCommission(uint256) external view returns (uint64);

    function protocolCommission(uint256) external view returns (uint64);

    function getCommissions(uint256, uint256, address) external view returns (uint64, uint64);

    function whitelistBaseAsset(
        address token,
        address priceFeed,
        BaseAssetCurve memory baseAssetCurve,
        uint256 minBorrow,
        uint256 amountOfSeedReserves,
        uint40 lockTimeOfSeedReserves
    ) external;

    function whitelistCollateralAsset(
        address token,
        address priceFeed,
        uint64 minBorrowCollateralFactor,
        uint64 maxBorrowCollateralFactor,
        uint64 minLiquidateCollateralFactor,
        uint64 maxLiquidateCollateralFactor,
        uint64 minLiquidationFactor,
        uint64 maxLiquidationFactor
    ) external;

    function addBaseAssetCurve(address token, BaseAssetCurve memory baseAssetCurve) external;

    function changeBaseAssetCurve(address token, uint256 curveIndex, BaseAssetCurve memory newCurve) external;

    function setMarketStateCommissions(uint8 _index, uint64 _reserveCommission, uint64 _protocolCommission) external;

    function setTreasury(address _treasury) external;

    function setConfiguration(SandboxControllerConfiguration memory _config) external;

    function setFeeEnabled(bool _feeEnabled) external;

    function transferOwner(address newOwner) external;

    function transferDao(address newDao) external;

    function isBaseTokenWhitelisted(address token) external view returns (bool);

    function isCollateralTokenWhitelisted(address token) external view returns (bool);

    function isCurveConfigurationValid(BaseAssetCurve memory curve) external pure returns (bool);

    function baseAssets(address token) external view returns (BaseAssetConfiguration memory);

    function collateralAssets(address token) external view returns (CollateralAssetConfiguration memory);

    function curves(address token) external view returns (BaseAssetCurve[] memory);

    function config() external view returns (SandboxControllerConfiguration memory);

    function suggestedAmountOfSeedReserves(address token) external view returns (uint256);

    function suggestedLockTimeOfSeedReserves(address token) external view returns (uint40);

    function baseTokenSuggestedSeedReserves(address token) external view returns (uint256, uint40);
}
