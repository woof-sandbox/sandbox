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
        uint64 supplyKink;
        uint64 supplyPerYearInterestRateSlopeLow;
        uint64 supplyPerYearInterestRateSlopeHigh;
        uint64 supplyPerYearInterestRateBase;
        uint64 borrowKink;
        uint64 borrowPerYearInterestRateSlopeLow;
        uint64 borrowPerYearInterestRateSlopeHigh;
        uint64 borrowPerYearInterestRateBase;
    }

    struct BaseAssetConfiguration {
        address priceFeed;
        uint256 decimals;
        uint256 minBorrow;
        BaseAssetCurve[] baseAssetCurves;
    }

    struct CollateralAssetConfiguration {
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

    struct SandboxControllerConfiguration {
        uint256 storeFrontPriceFactor;
        uint256 minUpdateTime;
        uint256 suggestedAmountOfSeedReserves;
        uint256 suggestedLockTimeOfSeedReserves;
    }
    event BaseAssetWhitelisted(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurve,
        uint256 minBorrow
    );

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

    event BaseAssetCurveAdded(
        address indexed token,
        BaseAssetCurve baseAssetCurve
    );

    event BaseAssetCurveChanged(
        address indexed token,
        BaseAssetCurve baseAssetCurveOld,
        BaseAssetCurve baseAssetCurveNew
    );

    event ConfigurationChanged(
        SandboxControllerConfiguration oldConfig,
        SandboxControllerConfiguration newConfig
    );

    event TreasuryChanged(address oldTreasury, address newTreasury);

    event TargetReservesChanged(uint256 oldReserves, uint256 newReserves);

    event ThresholdChanged(
        MarketState indexed state,
        uint256 oldValue,
        uint256 newValue
    );

    event ReserveCommissionChanged(
        MarketState indexed state,
        uint256 oldValue,
        uint256 newValue
    );

    event ProtocolCommissionChanged(
        MarketState indexed state,
        uint256 oldValue,
        uint256 newValue
    );

    event FeeEnabledSet(bool enabled);
    event OwnerTransferred(address oldOwner, address newOwner);
    event DaoTransferred(address oldDao, address newDao);

    // function setTargetReserves(uint256 _targetReserves) external;

    // function setThresholds(uint256[3] calldata thresholds) external;

    // function setReserveCommissions(
    //     uint256[3] calldata reserveCommissions
    // ) external;

    // function setProtocolCommissions(
    //     uint256[3] calldata protocolCommissions
    // ) external;

    function setTreasury(address _treasury) external;

    function whitelistBaseAsset(
        address token,
        address priceFeed,
        BaseAssetCurve memory baseAssetCurve,
        uint256 minBorrow
    ) external;

     error Test();
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

    // function setConfiguration(
    //     SandboxControllerConfiguration memory _config
    // ) external;

    function setFeeEnabled(bool _feeEnabled) external;

    function addBaseAssetCurve(
        address token,
        BaseAssetCurve memory baseAssetCurve
    ) external;

    function changeBaseAssetCurve(
        address token,
        uint256 curveIndex,
        BaseAssetCurve memory newCurve
    ) external;

    function transferOwner(address newOwner) external;

    function transferDao(address newDao) external;

    function isCurveConfigurationValid(
        BaseAssetCurve memory curve
    ) external pure returns (bool);

    function isBaseTokenWhitelisted(address token) external view returns (bool);

    function isCollateralTokenWhitelisted(
        address token
    ) external view returns (bool);

    function isPriceFeedWhitelisted(
        address priceFeed
    ) external view returns (bool);

    function isCurveConfigurationWhitelisted(
        bytes32 curveHash
    ) external view returns (bool);

    function getSuggestedParams()
        external
        view
        returns (uint256, uint256);

    function baseAssets(
        address token
    ) external view returns (BaseAssetConfiguration memory);

    function collateralAssets(
        address token
    ) external view returns (CollateralAssetConfiguration memory);
}
