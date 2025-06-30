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
    /// @notice Minimum transition duration for the controller configuration.
    uint32 public constant MIN_TRANSITION_DURATION = 1 weeks; /// 1 week in seconds
    /// @notice treasury address. This is the address that will receive the fees.
    address public treasury; /// 20 bytes
    /// @notice owner address. This is the address that will be able to call the functions that require the owner role.
    address public override owner; /// 20 bytes
    /// @notice dao address. This is the address that will be able to call the functions that require the dao role.
    address public override dao; /// 20 bytes
    /// @notice feeEnabled flag. This is the flag that will be used to enable/disable the fees for all markets.
    bool public override feeEnabled; /// 1 byte
    /// @notice controller configuration. Holds: targetPercent, storeFrontPriceFactor, minUpdateTime, maxUpdateTime, suggestedAmountOfSeedReserves, suggestedLockTimeOfSeedReserves.
    SandboxControllerConfiguration public _controllerConfiguration; /// 32 bytes
    /// @notice base asset tokens. Whitelisted base asset tokens.
    address[] public override baseAssetTokens; 
    /// @notice collateral asset tokens. Whitelisted collateral asset tokens.
    address[] public override collateralAssetTokens;
    /// @notice token to price feed.
    mapping(address => address) public override tokenToPriceFeed; 
    /// @notice reserve commission. This is the mapping of the market state to the percentage of the reserve commission.
    mapping(MarketState => uint64) public override reserveCommission; 
    /// @notice protocol commission. This is the mapping of the market state to the percentage of the protocol commission.
    mapping(MarketState => uint64) public override protocolCommission; 
    /// @notice base asset configurations. This is the mapping of the base asset token to the base asset configuration.
    mapping(address => BaseAssetConfiguration) internal _baseAssets;
    /// @notice collateral asset configurations. Holds: priceFeed, decimals, maxBorrowCollateralFactor, minBorrowCollateralFactor, minLiquidateCollateralFactor, maxLiquidateCollateralFactor, minLiquidationFactor, maxLiquidationFactor
    mapping(address => CollateralAssetConfiguration) internal _collateralAssets; 

    /**
     * @dev Modifier to check if the caller is the owner.
     */
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    /**
     * @dev Modifier to check if the caller is the DAO.
     */
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
        if (msg.sender != owner && msg.sender != dao) revert Unauthorized();
        _;
    }

    /**
     * @dev Set all global parameters (including owner and DAO) at deployment.
     *
     * @param _owner  The address of the protocol owner.
     * @param _dao    The address of the DAO (governance).
     * @param _feeEnabled Global fee flag for the entire protocol.
     * @param _targetPercent            < 0.5 (50%)
     * @param _storeFrontPriceFactor     < 1e18
     * @param _minUpdateTime             > 0
     * @param _maxUpdateTime            reasonable time for the proposal duration
     * @param _suggestedAmountOfSeedReserves The suggested amount of seed reserves in $. Decimals are 6.
     * @param _suggestedLockTimeOfSeedReserves The suggested lock time of seed reserves in seconds.
     * @dev The `_suggestedAmountOfSeedReserves` and `_suggestedLockTimeOfSeedReserves` must be greater than 0.
     * @param _reserveCommissions The reserve commission factors for each market state.
     * @param _protocolCommissions The protocol commission factors for each market state.
     * @dev The length of the `_reserveCommissions` and `_protocolCommissions` arrays must be 3.
     */
    constructor(
        address _owner,
        address _dao,
        address _treasury,
        bool _feeEnabled,
        uint256 _targetPercent,
        uint256 _storeFrontPriceFactor,
        uint256 _minUpdateTime,
        uint256 _maxUpdateTime,
        uint256 _suggestedAmountOfSeedReserves,
        uint256 _suggestedLockTimeOfSeedReserves,
        uint64[3] memory _reserveCommissions,
        uint64[3] memory _protocolCommissions,
        uint40 _transitionDuration
    ) {
        if (_owner == address(0) || _dao == address(0)) revert ZeroAddress();
        if (_owner == _dao) revert InvalidFactors();
        if (_treasury == address(0)) revert ZeroAddress();
        owner = _owner;
        dao = _dao;
        feeEnabled = _feeEnabled;
        treasury = _treasury;

        if (
            _targetPercent > 5e17 || /// Validate that the targetPercent is not bigger than 50%.
            _storeFrontPriceFactor >= 1e18 || /// Validate that the storeFrontPriceFactor is not bigger than 100%.
            _minUpdateTime == 0 || _maxUpdateTime < _minUpdateTime || /// Validate that the minUpdateTime is not 0 and the maxUpdateTime is bigger than the minUpdateTime.
            _suggestedAmountOfSeedReserves == 0 || /// Validate that the suggestedAmountOfSeedReserves is not 0.
            _suggestedLockTimeOfSeedReserves == 0 || /// Validate that the suggestedLockTimeOfSeedReserves is not 0.
            _transitionDuration < MIN_TRANSITION_DURATION /// Validate that the transitionDuration is not less than 1 week.
        ) revert InvalidFactors();
        
        for (uint256 i; i < 3;) {
            MarketState state = MarketState(i);
            /// Validate that the reserveCommissions and protocolCommissions are not bigger than 80%. 100% = 1e18.
            /// This needed to leave something for the ConfigController owner and curator.
            if (reserveCommission[state] + protocolCommission[state] > 8e17) revert InvalidFactors();
            
            reserveCommission[state] = _reserveCommissions[i];
            protocolCommission[state] = _protocolCommissions[i];
            
            unchecked {
                ++i;
            }
        }
        
        _controllerConfiguration = SandboxControllerConfiguration(
            _targetPercent,
            _storeFrontPriceFactor,
            _minUpdateTime,
            _maxUpdateTime,
            _suggestedAmountOfSeedReserves,
            _suggestedLockTimeOfSeedReserves,
            _transitionDuration
        );

    }

    /**
     * @notice Sets the reserve commission factors for each market state.
     * @param _reserveCommissions The new reserve commission factors, scaled by 1e18. 100% = 1e18.
     */
    function setReserveCommissions(
        uint64[3] calldata _reserveCommissions
    ) external override onlyOwner {
        
        for (uint256 i; i < 3;) {
            MarketState state = MarketState(i);
            /// Check if the sum of the `reserveCommission` and the `protocolCommission` is less than 80%
            /// This needed to leave something for the ConfigController owner and curator.
            if (_reserveCommissions[i] + protocolCommission[state] > 8e17) revert InvalidFactors();
            /// Emit event before updating the `reserveCommission` to save gas. Cheaper than creating a memory variable.
            emit ReserveCommissionChanged(
                state,
                reserveCommission[state],
                _reserveCommissions[i]
            );
            reserveCommission[state] = _reserveCommissions[i];

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Sets the protocol commission factors for each market state.
     * @param _protocolCommissions The new protocol commission factors, scaled by 1e18. 100% = 1e18.
     */
    function setProtocolCommissions(
        uint64[3] calldata _protocolCommissions
    ) external override onlyOwner {

        for (uint256 i; i < 3;) {
            MarketState state = MarketState(i);
            /// Check if the sum of the `protocolCommission` and the `reserveCommission` is less than 80%
            /// This needed to leave something for the ConfigController owner and curator.
            if (_protocolCommissions[i] + reserveCommission[state] > 8e17) revert InvalidFactors();
            /// Emit event before updating the `protocolCommission` to save gas. Cheaper than creating a memory variable.
            emit ProtocolCommissionChanged(
                state,
                protocolCommission[state],
                _protocolCommissions[i]
            );
            protocolCommission[state] = _protocolCommissions[i];

            unchecked {
                ++i;
            }
        }
    }

    /**
     * @notice Sets the treasury address.
     * @param _treasury The address of the treasury.
     * @dev This function is only callable by the owner.
     * @dev The `treasury` address can`t be zero address.
     */
    function setTreasury(address _treasury) external override onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        /// Emit event before updating the `treasury` address to save gas. Cheaper than creating a memory variable.
        emit TreasuryChanged(treasury, _treasury);
        treasury = _treasury;
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
        _collateralAssets[token].decimals = uint8(decimals);
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
            _config.targetPercent > 5e17 ||
            _config.transitionDuration < MIN_TRANSITION_DURATION
        ) revert InvalidFactors();
        
        emit ConfigurationChanged(_controllerConfiguration, _config);

        _controllerConfiguration = _config;
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
        emit BaseAssetCurveAdded(token, baseAssetCurve, _baseAssets[token].baseAssetCurves.length - 1);
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
        BaseAssetCurve calldata newCurve
    ) external override onlyDao {
        if (token == address(0)) revert ZeroAddress();
        if (!isBaseTokenWhitelisted(token)) revert BaseTokenNotWhitelisted();
        if (curveIndex >= _baseAssets[token].baseAssetCurves.length || !isCurveConfigurationValid(newCurve)) revert InvalidCurveConfiguration();
        
        emit BaseAssetCurveChanged(token, _baseAssets[token].baseAssetCurves[curveIndex], newCurve, curveIndex);

        _baseAssets[token].baseAssetCurves[curveIndex] = newCurve;
    }

    /**
     * @notice Transfers the owner privileges to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwner(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Transfers the DAO privileges to a new address.
     * @param newDao The address of the new DAO.
     */
    function transferDao(address newDao) external override onlyDao {
        if (newDao == address(0)) revert ZeroAddress();
        emit DaoTransferred(dao, newDao);
        dao = newDao;
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

    /**
     * @notice Returns the proposal boundaries of the sandbox controller.
     * @return The proposal boundaries.
     */
    function proposalBoundaries() external view override returns (uint256, uint256) {
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
