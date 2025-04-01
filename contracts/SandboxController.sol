// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {IERC20NonStandard} from "./interfaces/IERC20NonStandard.sol";
import {IPriceFeed} from "./interfaces/IPriceFeed.sol";
import {ISandboxController as ISC} from "./interfaces/ISandboxController.sol";

/**
 * @title SandboxController
 * @dev Manages base asset configurations and interest rate curves.
 */
contract SandboxController is ISC {
    address public owner;
    address public dao;

    uint256 public protocolFactorBorrow;
    uint256 public reserveFactorBorrow;
    uint256 public protocolFactorLiquidation;
    uint256 public reserveFactorLiquidation;
    uint256 public maxCollateralAssets;

    uint256 public storeFrontPriceFactor;
    uint256 public minUpdateTime;
    uint256 public suggestedAmountOfSeedReserves;
    uint256 public suggestedLockTimeOfSeedReserves;

    uint256 public targetReserves;

    uint256 public baseAssetCount;
    uint256 public collateralAssetCount;

    address public treasury;

    address[] public baseAssetTokens;
    address[] public collateralAssetTokens;

    bool public feeEnabled;

    mapping(address => bool) public isPriceFeedWhitelisted;
    mapping(MarketState => uint256) public reserveCommission;
    mapping(MarketState => uint256) public protocolCommission;
    mapping(MarketState => uint256) public threshold;

    mapping(address => ISC.BaseAssetConfiguration) private _baseAssets;
    mapping(address => ISC.CollateralAssetConfiguration)
        private _collateralAssets;

    /**
     * @dev Set all global parameters (including owner and DAO) at deployment.
     *
     * @param _owner  The address of the protocol owner.
     * @param _dao    The address of the DAO (governance).
     * @param _feeEnabled Global fee flag for the entire protocol.
     * @param _storeFrontPriceFactor Must be < 1e18.
     * @param _protocolFactorBorrow  Nonzero. Will combine with reserveFactorBorrow.
     * @param _reserveFactorBorrow   Nonzero. Sum with _protocolFactorBorrow <= 1e18.
     * @param _protocolFactorLiquidation Nonzero. Sum with _reserveFactorLiquidation <= 1e18.
     * @param _reserveFactorLiquidation  Nonzero.
     * @param _minUpdateTime             Nonzero.
     * @param _maxCollateralAssets       > 0
     * @param _suggestedAmountOfSeedReserves  > 0
     * @param _suggestedLockTimeOfSeedReserves > 0
     */
    constructor(
        address _owner,
        address _dao,
        bool _feeEnabled,
        uint256 _storeFrontPriceFactor,
        uint256 _protocolFactorBorrow,
        uint256 _reserveFactorBorrow,
        uint256 _protocolFactorLiquidation,
        uint256 _reserveFactorLiquidation,
        uint256 _minUpdateTime,
        uint256 _maxCollateralAssets,
        uint256 _suggestedAmountOfSeedReserves,
        uint256 _suggestedLockTimeOfSeedReserves,
        uint256 _targetReserves
    ) {
        if (_owner == address(0) || _dao == address(0)) {
            revert ZeroAddress();
        }
        if (_owner == _dao) {
            revert InvalidFactors();
        }
        owner = _owner;
        dao = _dao;

        feeEnabled = _feeEnabled;

        if (
            _storeFrontPriceFactor >= 1e18 ||
            _protocolFactorBorrow == 0 ||
            _reserveFactorBorrow == 0 ||
            (_protocolFactorBorrow + _reserveFactorBorrow) > 1e18 ||
            _protocolFactorLiquidation == 0 ||
            _reserveFactorLiquidation == 0 ||
            (_protocolFactorLiquidation + _reserveFactorLiquidation) > 1e18 ||
            _minUpdateTime == 0 ||
            _maxCollateralAssets == 0 ||
            _suggestedAmountOfSeedReserves == 0 ||
            _suggestedLockTimeOfSeedReserves == 0 ||
            _targetReserves > 5e17
        ) {
            revert InvalidFactors();
        }

        storeFrontPriceFactor = _storeFrontPriceFactor;
        protocolFactorBorrow = _protocolFactorBorrow;
        reserveFactorBorrow = _reserveFactorBorrow;
        protocolFactorLiquidation = _protocolFactorLiquidation;
        reserveFactorLiquidation = _reserveFactorLiquidation;
        minUpdateTime = _minUpdateTime;
        maxCollateralAssets = _maxCollateralAssets;
        suggestedAmountOfSeedReserves = _suggestedAmountOfSeedReserves;
        suggestedLockTimeOfSeedReserves = _suggestedLockTimeOfSeedReserves;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    modifier onlyDao() {
        if (msg.sender != dao) revert NotDao(msg.sender);
        _;
    }

    /**
     * @dev Both owner and dao are considered "authorized."
     *      If you want them to have separate powers, use onlyOwner or onlyDao
     *      in the relevant functions. For shared powers, use onlyAuthorized.
     */
    modifier onlyAuthorized() {
        if (msg.sender != owner && msg.sender != dao) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    /**
     * @notice Sets the target reserves factor.
     * @param _targetReserves The target reserves factor, scaled by 1e18.
     * @dev Must be less than 0.5 (50%).
     */
    function setTargetReserves(uint256 _targetReserves) external onlyOwner {
        if (_targetReserves > 5e17) {
            revert InvalidFactors();
        }
        uint256 oldTargetReserves = targetReserves;
        targetReserves = _targetReserves;
        emit TargetReservesChanged(oldTargetReserves, _targetReserves);
    }

    /**
     * @notice Sets the threshold factors for each market state.
     * @param thresholds The new threshold factors, scaled by 1e18.
     */
    function setThresholds(
        uint256[3] calldata thresholds
    ) external onlyOwner {
        for (uint256 i = 0; i < 3; i++) {
            if (thresholds[i] >= 1e18) {
                revert InvalidFactors();
            }
            MarketState state = MarketState(i);
            uint256 oldValue = threshold[state];
            threshold[state] = thresholds[i];
            emit ThresholdChanged(state, oldValue, thresholds[i]);
        }
    }

    /**
     * @notice Sets the reserve commission factors for each market state.
     * @param reserveCommissions The new reserve commission factors, scaled by 1e18.
     */
    function setReserveCommissions(
        uint256[3] calldata reserveCommissions
    ) external onlyOwner {
        for (uint256 i = 0; i < 3; i++) {
            MarketState state = MarketState(i);
            if (reserveCommissions[i] + protocolCommission[state] > 8e17) {
                revert InvalidFactors();
            }
            uint256 oldValue = reserveCommission[state];
            reserveCommission[state] = reserveCommissions[i];
            emit ReserveCommissionChanged(state, oldValue, reserveCommissions[i]);
        }
    }

    /**
     * @notice Sets the protocol commission factors for each market state.
     * @param protocolCommissions The new protocol commission factors, scaled by 1e18.
     */ 
    function setProtocolCommissions(
        uint256[3] calldata protocolCommissions
    ) external onlyOwner {
        for (uint256 i = 0; i < 3; i++) {
            MarketState state = MarketState(i);
            if (protocolCommissions[i] + reserveCommission[state] > 8e17) {
                revert InvalidFactors();
            }
            uint256 oldValue = protocolCommission[state];
            protocolCommission[state] = protocolCommissions[i];
            emit ProtocolCommissionChanged(state, oldValue, protocolCommissions[i]);
        }
    }

    /**
     * @notice Sets the treasury address.
     * @param _treasury The address of the treasury.
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) {
            revert ZeroAddress();
        }
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryChanged(oldTreasury, _treasury);
    }

    /**
     * @notice Whitelists a new base asset with its price feed and curve configuration.
     * @param token The address of the base asset token.
     * @param priceFeed The associated price feed contract address.
     * @param baseAssetCurve The initial interest rate curve configuration.
     * @param minBorrow The minimal borrow amount for this asset.
     */
    function whitelistBaseAsset(
        address token,
        address priceFeed,
        BaseAssetCurve memory baseAssetCurve,
        uint256 minBorrow
    ) external onlyAuthorized {
        if (token == address(0) || priceFeed == address(0)) {
            revert ZeroAddress();
        }
        if (isBaseTokenWhitelisted(token)) {
            revert TokenAlreadyWhitelisted();
        }
        if (isPriceFeedWhitelisted[priceFeed]) {
            revert PriceFeedAlreadyWhitelisted();
        }

        if (!isCurveConfigurationValid(baseAssetCurve)) {
            revert InvalidCurveConfiguration();
        }

        {
            (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData();
            if (answer <= 0) {
                revert InvalidPriceFeed();
            }
        }

        uint8 decimals = IERC20NonStandard(token).decimals();

        _baseAssets[token].priceFeed = priceFeed;
        _baseAssets[token].decimals = decimals;
        _baseAssets[token].minBorrow = minBorrow;
        _baseAssets[token].baseAssetCurves.push(baseAssetCurve);

        baseAssetTokens.push(token);
        baseAssetCount++;

        isPriceFeedWhitelisted[priceFeed] = true;

        emit BaseAssetWhitelisted(
            token,
            priceFeed,
            decimals,
            baseAssetCurve,
            minBorrow
        );
    }

    /**
     * @notice Whitelists a new collateral asset with its full configuration and price feed.
     * @dev Includes additional validation on the factors.
     * @param token The address of the collateral token.
     * @param priceFeed The price feed contract address for the collateral.
     * @param maxBorrowCollateralFactor The maximum borrow collateral factor, scaled by 1e4, e.g., 8000 = 80%.
     * @param minBorrowCollateralFactor The minimum borrow collateral factor, scaled by 1e4.
     * @param minLiquidateCollateralFactor The minimum collateral factor at which liquidation can start.
     * @param maxLiquidateCollateralFactor The maximum collateral factor for liquidation calculations.
     * @param minLiquidationFactor Minimum factor for liquidation penalty.
     * @param maxLiquidationFactor Maximum factor for liquidation penalty.
     */
    function whitelistCollateralAsset(
        address token,
        address priceFeed,
        uint64 maxBorrowCollateralFactor,
        uint64 minBorrowCollateralFactor,
        uint64 minLiquidateCollateralFactor,
        uint64 maxLiquidateCollateralFactor,
        uint64 minLiquidationFactor,
        uint64 maxLiquidationFactor
    ) external onlyAuthorized {
        if (token == address(0) || priceFeed == address(0)) {
            revert ZeroAddress();
        }
        if (isCollateralTokenWhitelisted(token)) {
            revert TokenAlreadyWhitelisted();
        }
        if (isPriceFeedWhitelisted[priceFeed]) {
            revert PriceFeedAlreadyWhitelisted();
        }

        if (
            minBorrowCollateralFactor == 0 ||
            maxBorrowCollateralFactor == 0 ||
            minLiquidateCollateralFactor == 0 ||
            maxLiquidateCollateralFactor == 0 ||
            minLiquidationFactor == 0 ||
            maxLiquidationFactor == 0
        ) {
            revert InvalidFactors(); // All must be nonzero
        }
        if (
            minBorrowCollateralFactor > maxBorrowCollateralFactor ||
            minLiquidateCollateralFactor > maxLiquidateCollateralFactor ||
            minLiquidationFactor > maxLiquidationFactor
        ) {
            revert InvalidFactors();
        }
        {
            (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData();
            if (answer <= 0) {
                revert InvalidPriceFeed();
            }
        }

        uint256 decimals = IERC20NonStandard(token).decimals();

        _collateralAssets[token].collateralToken = token;
        _collateralAssets[token].priceFeed = priceFeed;
        _collateralAssets[token].decimals = IERC20NonStandard(token).decimals();
        _collateralAssets[token]
            .maxBorrowCollateralFactor = maxBorrowCollateralFactor;
        _collateralAssets[token]
            .minBorrowCollateralFactor = minBorrowCollateralFactor;
        _collateralAssets[token]
            .minLiquidateCollateralFactor = minLiquidateCollateralFactor;
        _collateralAssets[token]
            .maxLiquidateCollateralFactor = maxLiquidateCollateralFactor;
        _collateralAssets[token].minLiquidationFactor = minLiquidationFactor;
        _collateralAssets[token].maxLiquidationFactor = maxLiquidationFactor;

        collateralAssetTokens.push(token);
        collateralAssetCount++;

        isPriceFeedWhitelisted[priceFeed] = true;

        emit CollateralAssetWhitelisted(
            token,
            priceFeed,
            decimals,
            maxBorrowCollateralFactor,
            minBorrowCollateralFactor,
            minLiquidateCollateralFactor,
            maxLiquidateCollateralFactor,
            minLiquidationFactor,
            maxLiquidationFactor
        );
    }

    /**
     * @dev Emitted when a base asset is whitelisted.
     * @param _storeFrontPriceFactor  The store front price factor.
     * @param _minUpdateTime  The minimum update time.
     * @param _suggestedAmountOfSeedReserves  The suggested amount of seed reserves.
     * @param _suggestedLockTimeOfSeedReserves  The suggested lock time of seed reserves.
     */
    function setConfiguration(
        uint256 _storeFrontPriceFactor,
        uint256 _minUpdateTime,
        uint256 _suggestedAmountOfSeedReserves,
        uint256 _suggestedLockTimeOfSeedReserves
    ) external onlyOwner {
        if (
            _storeFrontPriceFactor >= 1e18 ||
            _minUpdateTime == 0 ||
            _suggestedAmountOfSeedReserves == 0 ||
            _suggestedLockTimeOfSeedReserves == 0
        ) {
            revert InvalidFactors();
        }

        storeFrontPriceFactor = _storeFrontPriceFactor;
        minUpdateTime = _minUpdateTime;
        suggestedAmountOfSeedReserves = _suggestedAmountOfSeedReserves;
        suggestedLockTimeOfSeedReserves = _suggestedLockTimeOfSeedReserves;

        emit ConfigChanged(
            _storeFrontPriceFactor,
            _minUpdateTime,
            _suggestedAmountOfSeedReserves,
            _suggestedLockTimeOfSeedReserves
        );
    }

    /**
     * @notice Sets the global feeEnabled flag for the entire protocol.
     * @param _feeEnabled True to enable fees, false to disable.
     */
    function setFeeEnabled(bool _feeEnabled) external onlyDao {
        feeEnabled = _feeEnabled;
        emit FeeEnabledSet(_feeEnabled);
    }

    /**
     * @notice Adds a new interest rate curve for an existing base asset.
     * @param token The address of the base asset.
     * @param baseAssetCurve The new interest rate curve configuration.
     */
    function addBaseAssetCurve(
        address token,
        BaseAssetCurve memory baseAssetCurve
    ) external onlyAuthorized {
        if (token == address(0)) revert ZeroAddress();
        if (!isBaseTokenWhitelisted(token)) {
            revert TokenNotWhitelisted();
        }
        if (!isCurveConfigurationValid(baseAssetCurve)) {
            revert InvalidCurveConfiguration();
        }

        _baseAssets[token].baseAssetCurves.push(baseAssetCurve);
        emit BaseAssetCurveAdded(token, baseAssetCurve);
    }

    /**
     * @notice Updates an existing interest rate curve for a base asset.
     * @param token The address of the base asset.
     * @param curveIndex The index of the curve to update.
     * @param newCurve The updated interest rate curve.
     */
    function changeBaseAssetCurve(
        address token,
        uint256 curveIndex,
        BaseAssetCurve memory newCurve
    ) external onlyDao {
        if (token == address(0)) {
            revert ZeroAddress();
        }
        if (!isBaseTokenWhitelisted(token)) {
            revert TokenNotWhitelisted();
        }
        if (
            curveIndex >= _baseAssets[token].baseAssetCurves.length ||
            !isCurveConfigurationValid(newCurve)
        ) {
            revert InvalidCurveConfiguration();
        }

        BaseAssetCurve memory oldCurve = _baseAssets[token].baseAssetCurves[
            curveIndex
        ];

        _baseAssets[token].baseAssetCurves[curveIndex] = newCurve;
        emit BaseAssetCurveChanged(token, oldCurve, newCurve);
    }

    /**
     * @notice Checks if a token is whitelisted as a base asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isBaseTokenWhitelisted(
        address token
    ) public view override returns (bool) {
        return _baseAssets[token].priceFeed != address(0);
    }

    /**
     * @notice Checks if a token is whitelisted as a collateral asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isCollateralTokenWhitelisted(
        address token
    ) public view override returns (bool) {
        return _collateralAssets[token].priceFeed != address(0);
    }

    /**
     * @notice Validates an interest rate curve configuration.
     * @param curve The interest rate curve configuration to validate.
     * @return True if valid, false otherwise.
     */
    function isCurveConfigurationValid(
        BaseAssetCurve memory curve
    ) public pure returns (bool) {
        if (curve.supplyKink >= 1e18 || curve.borrowKink >= 1e18) {
            return false;
        }
        if (curve.borrowPerYearInterestRateSlopeBase == 0) {
            return false;
        }

        return true;
    }

    /**
     * @notice Transfers the owner privileges to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerTransferred(oldOwner, newOwner);
    }

    /**
     * @notice Returns base asset configuration for a given token.
     * @param token The address of the base asset token.
     *  @return The base asset configuration.
     */
    function baseAssets(
        address token
    ) external view returns (ISC.BaseAssetConfiguration memory) {
        return _baseAssets[token];
    }

    /**
     * @notice Returns collateral asset configuration for a given token.
     * @param token The address of the collateral asset token.
     *  @return The collateral asset configuration.
     */
    function collateralAssets(
        address token
    ) external view returns (ISC.CollateralAssetConfiguration memory) {
        return _collateralAssets[token];
    }

    /**
     * @notice Returns base asset curves for a given token.
     * @param token The address of the base asset token.
     * @return The base asset curves.
     */
    function getBaseAssetCurves(
        address token
    ) external view returns (BaseAssetCurve[] memory) {
        return _baseAssets[token].baseAssetCurves;
    }

    /**
     * @notice Transfers the DAO privileges to a new address.
     * @param newDao The address of the new DAO.
     */
    function transferDao(address newDao) external onlyDao {
        if (newDao == address(0)) {
            revert ZeroAddress();
        }
        address oldDao = dao;
        dao = newDao;
        emit DaoTransferred(oldDao, newDao);
    }
}
