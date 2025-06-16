// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {IERC20NonStandard} from "./interfaces/IERC20NonStandard.sol";
import {IPriceFeed} from "./interfaces/IPriceFeed.sol";
import {ISandboxController} from "./interfaces/ISandboxController.sol";

/**
 * @title SandboxController
 * @dev Manages base asset configurations and interest rate baseAssetCurves.
 */
contract SandboxController is ISandboxController {
    uint256 public override protocolFactorBorrow;
    uint256 public override reserveFactorBorrow;
    uint256 public override protocolFactorLiquidation;
    uint256 public override reserveFactorLiquidation;
    address public override treasury;
    address public override owner;
    address public override dao;
    bool public override feeEnabled;
    SandboxControllerConfiguration public _controllerConfiguration;
    address[] public override baseAssetTokens;
    address[] public override collateralAssetTokens;
    mapping(address => address) public override tokenToPriceFeed;
    mapping(MarketState => uint256) public override reserveCommission;
    mapping(MarketState => uint256) public override protocolCommission;
    mapping(address => BaseAssetConfiguration) internal _baseAssets;
    mapping(address => CollateralAssetConfiguration) internal _collateralAssets;

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
            revert Unauthorized();
        }
        _;
    }

    /**
     * @dev Set all global parameters (including owner and DAO) at deployment.
     *
     * @param _owner  The address of the protocol owner.
     * @param _dao    The address of the DAO (governance).
     * @param _feeEnabled Global fee flag for the entire protocol.
     * @param _protocolFactorBorrow  Nonzero. Will combine with reserveFactorBorrow.
     * @param _reserveFactorBorrow   Nonzero. Sum with _protocolFactorBorrow <= 1e18.
     * @param _protocolFactorLiquidation Nonzero. Sum with _reserveFactorLiquidation <= 1e18.
     * @param _reserveFactorLiquidation  Nonzero.
     * @param _targetPercent            < 0.5 (50%)
     * @param _storeFrontPriceFactor     < 1e18
     * @param _minUpdateTime             > 0
     * @param _maxUpdateTime            reasonable time for the proposal duration
     * @param _suggestedAmountOfSeedReserves > 0
     * @param _suggestedLockTimeOfSeedReserves > 0
     */
    constructor(
        address _owner,
        address _dao,
        bool _feeEnabled,
        uint256 _protocolFactorBorrow,
        uint256 _reserveFactorBorrow,
        uint256 _protocolFactorLiquidation,
        uint256 _reserveFactorLiquidation,
        uint256 _targetPercent,
        uint256 _storeFrontPriceFactor,
        uint256 _minUpdateTime,
        uint256 _maxUpdateTime,
        uint256 _suggestedAmountOfSeedReserves,
        uint64 _suggestedLockTimeOfSeedReserves
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
            _protocolFactorBorrow == 0 ||
            _reserveFactorBorrow == 0 ||
            (_protocolFactorBorrow + _reserveFactorBorrow) > 1e18 ||
            _protocolFactorLiquidation == 0 ||
            _reserveFactorLiquidation == 0 ||
            (_protocolFactorLiquidation + _reserveFactorLiquidation) > 1e18 ||
            _targetPercent > 5e17 ||
            _storeFrontPriceFactor >= 1e18 ||
            _minUpdateTime == 0 || _maxUpdateTime < _minUpdateTime ||
            _suggestedAmountOfSeedReserves == 0 ||
            _suggestedLockTimeOfSeedReserves == 0
        ) {
            revert InvalidFactors();
        }

        protocolFactorBorrow = _protocolFactorBorrow;
        reserveFactorBorrow = _reserveFactorBorrow;
        protocolFactorLiquidation = _protocolFactorLiquidation;
        reserveFactorLiquidation = _reserveFactorLiquidation;
        _controllerConfiguration = SandboxControllerConfiguration(
            _targetPercent,
            _storeFrontPriceFactor,
            _minUpdateTime,
            _maxUpdateTime,
            _suggestedAmountOfSeedReserves,
            _suggestedLockTimeOfSeedReserves
        );
    }

    /**
     * @notice Sets the reserve commission factors for each market state.
     * @param reserveCommissions The new reserve commission factors, scaled by 1e18.
     */
    function setReserveCommissions(
        uint256[3] calldata reserveCommissions
    ) external override onlyOwner {
        for (uint256 i = 0; i < 3; i++) {
            MarketState state = MarketState(i);
            if (reserveCommissions[i] + protocolCommission[state] > 8e17) {
                revert InvalidFactors();
            }
            uint256 oldValue = reserveCommission[state];
            reserveCommission[state] = reserveCommissions[i];
            emit ReserveCommissionChanged(
                state,
                oldValue,
                reserveCommissions[i]
            );
        }
    }

    /**
     * @notice Sets the protocol commission factors for each market state.
     * @param protocolCommissions The new protocol commission factors, scaled by 1e18.
     */
    function setProtocolCommissions(
        uint256[3] calldata protocolCommissions
    ) external override onlyOwner {
        for (uint256 i = 0; i < 3; i++) {
            MarketState state = MarketState(i);
            if (protocolCommissions[i] + reserveCommission[state] > 8e17) {
                revert InvalidFactors();
            }
            uint256 oldValue = protocolCommission[state];
            protocolCommission[state] = protocolCommissions[i];
            emit ProtocolCommissionChanged(
                state,
                oldValue,
                protocolCommissions[i]
            );
        }
    }

    /**
     * @notice Sets the treasury address.
     * @param _treasury The address of the treasury.
     */
    function setTreasury(address _treasury) external override onlyOwner {
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
    ) external override onlyAuthorized {
        /// @dev token and priceFeed are not zero address
        if (token == address(0) || priceFeed == address(0)) revert ZeroAddress();
        
        /// @dev this token is already whitelisted
        if (isBaseTokenWhitelisted(token)) revert BaseTokenAlreadyWhitelisted();
        
        /// @dev the price feed is not associated with the token
        if (IPriceFeed(priceFeed).underlyingToken() != token) revert WrongPriceFeedUnderlying();

        /// @dev this price feed is used for a different token. Prevent arbitrage.
        if (tokenToPriceFeed[token] != address(0) && tokenToPriceFeed[token] != priceFeed) revert DifferentPriceFeedAlreadyUsedForToken();
        
        /// @dev the price feed is dead
        (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData();
        if (answer <= 0) revert InvalidPriceFeed();
        
        /// @dev the curve configuration is invalid
        if (!isCurveConfigurationValid(baseAssetCurve)) revert InvalidCurveConfiguration();

        tokenToPriceFeed[token] = priceFeed; 
        uint8 decimals = IERC20NonStandard(token).decimals();

        _baseAssets[token].priceFeed = priceFeed;
        _baseAssets[token].decimals = decimals;
        _baseAssets[token].minBorrow = minBorrow;
        _baseAssets[token].baseAssetCurves.push(baseAssetCurve);

        baseAssetTokens.push(token);

        emit BaseAssetWhitelisted(
            token,
            priceFeed,
            decimals,
            baseAssetCurve,
            minBorrow,
            baseAssetTokens.length - 1,
            _baseAssets[token].baseAssetCurves.length - 1
        );
    }

    /**
     * @notice Returns the length of the baseAssetTokens array.
     * @return The length of the baseAssetTokens array.
     */
    function getBaseAssetLength() external override view returns (uint256) {
        return baseAssetTokens.length;
    }

    /**
     * @notice Whitelists a new collateral asset with specified collateral factor parameters.
     * @dev Validates that all collateral factor parameters are within allowed ranges and maintain logical relationships:
     *      - 10% <= minBorrowCollateralFactor <= minLiquidateCollateralFactor <= minLiquidationFactor <= 100%
     *      - maxBorrowCollateralFactor <= maxLiquidateCollateralFactor <= maxLiquidationFactor <= 100%
     *      - min <= max for each factor
     * @param token The address of the collateral asset to whitelist.
     * @param priceFeed The address of the price feed contract for the collateral asset.
     * @param minBorrowCollateralFactor The minimum borrow collateral factor (scaled by 1e18, e.g., 10% = 1e17).
     * @param maxBorrowCollateralFactor The maximum borrow collateral factor (scaled by 1e18).
     * @param minLiquidateCollateralFactor The minimum liquidate collateral factor (scaled by 1e18).
     * @param maxLiquidateCollateralFactor The maximum liquidate collateral factor (scaled by 1e18).
     * @param minLiquidationFactor The minimum liquidation factor (scaled by 1e18).
     * @param maxLiquidationFactor The maximum liquidation factor (scaled by 1e18).
     */
    function whitelistCollateralAsset(
        address token,
        address priceFeed,
        uint64 minBorrowCollateralFactor,
        uint64 maxBorrowCollateralFactor,
        uint64 minLiquidateCollateralFactor,
        uint64 maxLiquidateCollateralFactor,
        uint64 minLiquidationFactor,
        uint64 maxLiquidationFactor
    ) external override onlyAuthorized {
        /// @dev token and priceFeed are not zero address
        if (token == address(0) || priceFeed == address(0)) revert ZeroAddress();
        
        /// @dev this token is already whitelisted
        if (isCollateralTokenWhitelisted(token)) revert CollateralTokenAlreadyWhitelisted();
        
        /// @dev the price feed is not associated with the token
        if (IPriceFeed(priceFeed).underlyingToken() != token) revert WrongPriceFeedUnderlying();

        /// @dev this price feed is used for a different token. Prevent arbitrage.
        if (tokenToPriceFeed[token] != address(0) && tokenToPriceFeed[token] != priceFeed) revert DifferentPriceFeedAlreadyUsedForToken();
        
        /// @dev the price feed is dead
        (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData();
        if (answer <= 0) revert InvalidPriceFeed();

        /// @dev Validates that all collateral factor parameters are within allowed ranges and maintain logical relationships:
        /// - 10% <= minBorrowCollateralFactor <= minLiquidateCollateralFactor <= minLiquidationFactor <= 100%
        /// - maxBorrowCollateralFactor <= maxLiquidateCollateralFactor <= maxLiquidationFactor <= 100%
        /// - min <= max for each factor
        if (
            minBorrowCollateralFactor < 1e17 || 
            minBorrowCollateralFactor > minLiquidateCollateralFactor || 
            minLiquidateCollateralFactor > minLiquidationFactor ||  
            maxBorrowCollateralFactor > maxLiquidateCollateralFactor || 
            maxLiquidateCollateralFactor > maxLiquidationFactor || 
            maxLiquidationFactor > 1e18 || 
            minBorrowCollateralFactor > maxBorrowCollateralFactor || 
            minLiquidateCollateralFactor > maxLiquidateCollateralFactor || 
            minLiquidationFactor > maxLiquidationFactor
        ) revert InvalidFactors();

        tokenToPriceFeed[token] = priceFeed;   

        uint256 decimals = IERC20NonStandard(token).decimals();

        _collateralAssets[token].collateralToken = token;
        _collateralAssets[token].priceFeed = priceFeed;
        _collateralAssets[token].decimals = IERC20NonStandard(token).decimals();
        _collateralAssets[token].maxBorrowCollateralFactor = maxBorrowCollateralFactor;
        _collateralAssets[token].minBorrowCollateralFactor = minBorrowCollateralFactor;
        _collateralAssets[token].minLiquidateCollateralFactor = minLiquidateCollateralFactor;
        _collateralAssets[token].maxLiquidateCollateralFactor = maxLiquidateCollateralFactor;
        _collateralAssets[token].minLiquidationFactor = minLiquidationFactor;
        _collateralAssets[token].maxLiquidationFactor = maxLiquidationFactor;

        collateralAssetTokens.push(token);

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
     * @notice Returns the length of the collateralAssetTokens array.
     * @return The length of the collateralAssetTokens array.
     */
    function getCollateralAssetLength() external override view returns (uint256) {
        return collateralAssetTokens.length;
    }

    /**
     * @dev Emitted when a base asset is whitelisted.
     * @param _config Configuration of the sandbox controller.
     */
    function setConfiguration(
        SandboxControllerConfiguration memory _config
    ) external override onlyOwner {
        if (
            _config.storeFrontPriceFactor >= 1e18 ||
            _config.minUpdateTime == 0 || _config.maxUpdateTime < _config.minUpdateTime ||
            _config.suggestedAmountOfSeedReserves == 0 ||
            _config.suggestedLockTimeOfSeedReserves == 0 ||
            _config.targetPercent > 5e17
        ) revert InvalidFactors();

        SandboxControllerConfiguration
            memory oldConfig = _controllerConfiguration;
        _controllerConfiguration = _config;

        emit ConfigurationChanged(oldConfig, _config);
    }

    /**
     * @notice Sets the global feeEnabled flag for the entire protocol.
     * @param _feeEnabled True to enable fees, false to disable.
     */
    function setFeeEnabled(bool _feeEnabled) external override onlyDao {
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
    ) external override onlyAuthorized {
        if (token == address(0)) revert ZeroAddress();
        if (!isBaseTokenWhitelisted(token)) revert BaseTokenNotWhitelisted();
        if (!isCurveConfigurationValid(baseAssetCurve)) revert InvalidCurveConfiguration();

        _baseAssets[token].baseAssetCurves.push(baseAssetCurve);
        emit BaseAssetCurveAdded(
            token, 
            baseAssetCurve,
            _baseAssets[token].baseAssetCurves.length - 1
        );
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
    ) external override onlyDao {
        if (token == address(0)) revert ZeroAddress();
        if (!isBaseTokenWhitelisted(token)) revert BaseTokenNotWhitelisted();
        if (curveIndex >= _baseAssets[token].baseAssetCurves.length || !isCurveConfigurationValid(newCurve)) revert InvalidCurveConfiguration();

        BaseAssetCurve memory oldCurve = _baseAssets[token].baseAssetCurves[
            curveIndex
        ];

        _baseAssets[token].baseAssetCurves[curveIndex] = newCurve;
        emit BaseAssetCurveChanged(token, oldCurve, newCurve, curveIndex);
    }

    /**
     * @notice Transfers the owner privileges to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwner(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerTransferred(oldOwner, newOwner);
    }

    /**
     * @notice Transfers the DAO privileges to a new address.
     * @param newDao The address of the new DAO.
     */
    function transferDao(address newDao) external override onlyDao {
        if (newDao == address(0)) revert ZeroAddress();

        address oldDao = dao;
        dao = newDao;
        emit DaoTransferred(oldDao, newDao);
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
    ) public pure override returns (bool) {
        if (curve.supplyKink == 0 || curve.borrowKink == 0 || curve.supplyKink >= 1e18 || curve.borrowKink >= 1e18) return false;

        if (
            curve.supplyPerYearInterestRateSlopeLow == 0 ||
            curve.supplyPerYearInterestRateSlopeHigh == 0 ||
            curve.supplyPerYearInterestRateBase == 0 ||
            curve.borrowPerYearInterestRateSlopeLow == 0 ||
            curve.borrowPerYearInterestRateSlopeHigh == 0 
        ) return false;

        return true;
    }

    /**
     * @notice Returns base asset configuration for a given token.
     * @param token The address of the base asset token.
     *  @return The base asset configuration.
     */
    function baseAssets(
        address token
    ) external view override returns (BaseAssetConfiguration memory) {
        return _baseAssets[token];
    }

    /**
     * @notice Returns collateral asset configuration for a given token.
     * @param token The address of the collateral asset token.
     *  @return The collateral asset configuration.
     */
    function collateralAssets(
        address token
    ) external view override returns (CollateralAssetConfiguration memory) {
        return _collateralAssets[token];
    }

    /**
     * @notice Returns base asset baseAssetCurves for a given token.
     * @param token The address of the base asset token.
     * @return The base asset baseAssetCurves.
     */
    function curves(
        address token
    ) external view override returns (BaseAssetCurve[] memory) {
        return _baseAssets[token].baseAssetCurves;
    }

    function controllerConfiguration() external view override returns (SandboxControllerConfiguration memory) {
        return _controllerConfiguration;
    }

    function proposalBoundaries() external view override returns (uint,uint) {
        SandboxControllerConfiguration memory _c = _controllerConfiguration;
        return (_c.minUpdateTime, _c.maxUpdateTime);
    }


    /**
     * @notice Returns the minimum borrow amount for a given base asset token.
     * @param token The address of the base asset token.
     * @return The minimum borrow amount.
     */
    function borrowMin(address token) external view returns (uint256) {
        return _baseAssets[token].minBorrow;
    }

    /**
     * @notice Returns the configuration of the sandbox controller.
     * @return The sandbox controller configuration.
     */
    function config()
        external
        view
        override
        returns (SandboxControllerConfiguration memory)
    {
        return _controllerConfiguration;
    }
}
