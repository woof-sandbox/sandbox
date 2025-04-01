// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

interface ISandboxController {
    enum MarketState {
        Low,
        Medium,
        High
    }

    error ZeroAddress();
    error TokenAlreadyWhitelisted();
    error TokenNotWhitelisted();
    error PriceFeedAlreadyWhitelisted();
    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error InvalidFactors();
    error NotOwner(address caller);
    error NotDao(address caller);
    error NotAuthorized(address caller);

    /**
     * @notice Structure defining interest rate curve parameters for a base asset.
     */
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

    /**
     * @notice Configuration for each base asset.
     */
    struct BaseAssetConfiguration {
        address priceFeed;
        uint256 decimals;
        uint256 minBorrow;
        BaseAssetCurve[] baseAssetCurves;
    }

    /**
     * @notice Configuration for each collateral asset.
     */
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

    event ConfigChanged(
        uint256 _storeFrontPriceFactor,
        uint256 _minUpdateTime,
        uint256 _suggestedAmountOfSeedReserves,
        uint256 _suggestedLockTimeOfSeedReserves
    );

    event TargetReservesChanged(uint256 oldReserves, uint256 newReserves);

    event ThresholdChanged(MarketState indexed state, uint256 oldValue, uint256 newValue);

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

    function baseAssets(
        address _token
    ) external view returns (BaseAssetConfiguration memory);

    function collateralAssets(
        address _token
    ) external view returns (CollateralAssetConfiguration memory);

    function isBaseTokenWhitelisted(address token) external view returns (bool);

    function isCollateralTokenWhitelisted(
        address token
    ) external view returns (bool);

    function isPriceFeedWhitelisted(
        address priceFeed
    ) external view returns (bool);
}
