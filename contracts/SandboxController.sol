// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import { IPriceFeed } from "./interfaces/IPriceFeed.sol";
import { ISandboxController } from "./interfaces/ISandboxController.sol";

/**
 * @title SandboxController
 * @dev Manages base asset configurations and interest rate baseAssetCurves.
 */
contract SandboxController is ISandboxController {
    uint64 public constant PARAMETERS_SCALE = 1e18; //100%
    uint64 public constant MAX_TARGET_PERCENT = 5e17; //50%
    uint64 public constant MAX_COMMISSIONS = 8e17; //80%
    uint64 public constant MIN_FACTOR = 1e17; //10%
    uint40 public constant MIN_LOCK_TIME = 1 weeks; // The minimum lock time for seed reserves
    uint8 public constant MARKET_STATES = 3;

    /// @notice treasury address. This is the address that will receive the fees.
    address public treasury; /// 20 bytes
    /// @notice owner address. This is the address that will be able to call the functions that require the owner role.
    address public override owner; /// 20 bytes
    /// @notice dao address. This is the address that will be able to call the functions that require the dao role.
    address public override dao; /// 20 bytes
    /// @notice feeEnabled flag. This is the flag that will be used to enable/disable the fees for all markets.
    bool public override feeEnabled; /// 1 byte
    /// @notice controller configuration.
    /// Holds:
    /// targetPercent,
    /// storeFrontPriceFactor,
    /// minUpdateTime,
    /// maxUpdateTime,
    /// suggestedAmountOfSeedReserves,
    /// suggestedLockTimeOfSeedReserves.
    SandboxControllerConfiguration public _controllerConfiguration; /// 32 bytes
    /// @notice token to price feed.
    mapping(address => address) public override tokenToPriceFeed;

    /// @notice % of the Comet's profit left in the comet as a reserve
    uint64[MARKET_STATES] public override reserveCommission;
    /// @notice % of the Comet's profit extracted from reserves for the DAO
    uint64[MARKET_STATES] public override protocolCommission;

    /// @notice base asset configurations. This is the mapping of the base asset token to the base asset configuration.
    mapping(address => BaseAssetConfiguration) internal _baseAssets;
    /// @notice collateral asset configurations.
    /// Holds:
    /// priceFeed,
    /// decimals,
    /// maxBorrowCollateralFactor,
    /// minBorrowCollateralFactor,
    /// minLiquidateCollateralFactor,
    /// maxLiquidateCollateralFactor,
    /// minLiquidationFactor, maxLiquidationFactor
    mapping(address => CollateralAssetConfiguration) internal _collateralAssets;

    /// @notice Suggested amount of seed reserves for each base asset - in USD.
    mapping(address => uint256) public suggestedAmountOfSeedReserves;

    /// @notice Suggested lock time of seed reserves for each base asset.
    mapping(address => uint40) public suggestedLockTimeOfSeedReserves;

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
     * @param _treasury The address of the treasury.
     * @param _feeEnabled Global fee flag for the entire protocol.
     * @param _config SanboxController config:
     * _targetPercent, < 0.5 (50%)
     * _storeFrontPriceFactor, < 1e18
     * _minUpdateTime, > 0
     * _maxUpdateTime, reasonable time for the proposal duration
     * @param _reserveCommissions The reserve commission factors for each market state.
     * @param _protocolCommissions The protocol commission factors for each market state.
     * @dev The length of the `_reserveCommissions` and `_protocolCommissions` arrays must be 3.
     */
    constructor(
        address _owner,
        address _dao,
        address _treasury,
        bool _feeEnabled,
        SandboxControllerConfiguration memory _config,
        uint64[MARKET_STATES] memory _reserveCommissions,
        uint64[MARKET_STATES] memory _protocolCommissions
    ) {
        if (_owner == address(0) || _dao == address(0) || _treasury == address(0)) revert ZeroAddress();
        if (_owner == _dao) revert IncorrectSetting();

        /// Function will revert on incorrect setting
        _validateConfig(_config);

        // aderyn-fp-next-line(require-revert-in-loop)
        for (uint8 i; i < MARKET_STATES; ) {
            /// Validate that the reserveCommissions and protocolCommissions are not bigger than 80%. 100% = 1e18.
            /// This needed to leave something for the ConfigController owner and curator.
            if (_reserveCommissions[i] + _protocolCommissions[i] > MAX_COMMISSIONS) revert InvalidCommissions();

            unchecked {
                ++i;
            }
        }
        reserveCommission = _reserveCommissions;
        protocolCommission = _protocolCommissions;

        owner = _owner;
        dao = _dao;
        feeEnabled = _feeEnabled;
        treasury = _treasury;

        _controllerConfiguration = _config;
    }

    ///
    /// COMMISSIONS SEGMENT
    ///

    /**
     * @notice Sets commission factors for the chosen market state.
     * @param _index Market state index
     * @param _reserveCommission The new reserve commission factor, scaled by 1e18 (100%).
     * @param _protocolCommission The new protocol commission factor, scaled by 1e18 (100%).
     */
    function setMarketStateCommissions(uint8 _index, uint64 _reserveCommission, uint64 _protocolCommission) external override onlyOwner {
        if (_index >= MARKET_STATES) revert IncorrectIndex();

        /// Check if the sum of the `reserveCommission` and the `protocolCommission` is less than 80%
        /// This needed to leave something for the ConfigController owner and curator.
        /// Config controller will receive non less than 20% of profit fee (upon reserves and dao fee)
        if (_reserveCommission + _protocolCommission > MAX_COMMISSIONS) {
            revert InvalidCommissions();
        }

        /// Emit event before updating the `reserveCommission` to save gas. Cheaper than creating a memory variable.
        emit CommissionChanged(
            MarketState(_index),
            reserveCommission[_index],
            _reserveCommission,
            protocolCommission[_index],
            _protocolCommission
        );
        reserveCommission[_index] = _reserveCommission;
        protocolCommission[_index] = _protocolCommission;
    }

    /**
     * @notice Sets the treasury address.
     * @param _treasury The address of the treasury.
     * @dev This function is only callable by the owner.
     * @dev The `treasury` address can`t be zero address.
     */
    function setTreasury(address _treasury) external override onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        if (_treasury == treasury) revert IncorrectSetting();

        /// Emit event before updating the `treasury` address to save gas. Cheaper than creating a memory variable.
        emit TreasuryChanged(treasury, _treasury);
        treasury = _treasury;
    }

    /**
     * @notice Sets the global feeEnabled flag for the entire protocol.
     * @param _feeEnabled True to enable fees, false to disable.
     */
    function setFeeEnabled(bool _feeEnabled) external override onlyDao {
        if (feeEnabled == _feeEnabled) revert IncorrectSetting();
        feeEnabled = _feeEnabled;
        emit FeeEnabledSet(_feeEnabled);
    }

    /**
     * @notice Returns profit fee distribution based on the reserves
     * @dev The function expects same denomination units (in USD) for both reserves parameters
     * @param _currentReserves Current Comet reserves
     * @param _targetReserves Expected target for the Comet
     * @param _baseToken The address of the base asset of the Comet
     * @return _reserveCommission Part of profit to be left in reserves
     * @return _protocolCommission Part of profit for the DAO
     */
    function getCommissions(
        uint256 _currentReserves,
        uint256 _targetReserves,
        address _baseToken
    ) external view override returns (uint64 _reserveCommission, uint64 _protocolCommission) {
        MarketState state;
        if (_currentReserves < suggestedAmountOfSeedReserves[_baseToken]) {
            state = MarketState.High;
        } else if (_currentReserves < _targetReserves) {
            state = MarketState.Medium;
        } else {
            state = MarketState.Low;
        }

        _reserveCommission = reserveCommission[uint(state)];
        _protocolCommission = feeEnabled ? protocolCommission[uint(state)] : 0;
    }

    ///
    /// ASSETS LISTING SEGMENT
    ///

    /**
     * @notice Whitelists a new base asset with its price feed and curve configuration.
     * @param token The address of the base asset token.
     * @param priceFeed The associated price feed contract address.
     * @param baseAssetCurve The initial interest rate curve configuration.
     * @param minBorrow The minimal borrow amount for this asset.
     * @param amountOfSeedReserves The suggested amount of seed reserves in $. Decimals are 6.
     * @param lockTimeOfSeedReserves The suggested lock time of seed reserves in seconds.
     * @dev The `amountOfSeedReserves` must be greater than 0.
     * @dev The `lockTimeOfSeedReserves` must be greater than or equal to the minimum lock time.
     */
    function whitelistBaseAsset(
        address token,
        address priceFeed,
        BaseAssetCurve memory baseAssetCurve,
        uint256 minBorrow,
        uint256 amountOfSeedReserves,
        uint40 lockTimeOfSeedReserves
    ) external override onlyAuthorized {
        /// @dev token and priceFeed are not zero address
        if (token == address(0) || priceFeed == address(0)) revert ZeroAddress();

        /// @dev this token is already whitelisted
        if (isBaseTokenWhitelisted(token)) revert BaseTokenAlreadyWhitelisted();

        /// @dev the price feed is not associated with the token
        // aderyn-fp-next-line(reentrancy-state-change)
        if (IPriceFeed(priceFeed).underlyingToken() != token) revert WrongPriceFeedUnderlying();

        /// @dev this price feed is used for a different token. Prevent arbitrage.
        if (tokenToPriceFeed[token] != address(0) && tokenToPriceFeed[token] != priceFeed) revert DifferentPriceFeedAlreadyUsedForToken();

        /// @dev the price feed is dead
        /// TODO: change the verification of live price feed, latestRoundData is not enough
        (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData(); // aderyn-fp(reentrancy-state-change)
        if (answer <= 0) revert InvalidPriceFeed();

        if (!isCurveConfigurationValid(baseAssetCurve)) revert InvalidCurveConfiguration();

        /// Function will revert on incorrect setting
        _validateSeedReserves(amountOfSeedReserves, lockTimeOfSeedReserves);

        tokenToPriceFeed[token] = priceFeed;
        uint8 decimals = IERC20Metadata(token).decimals(); // aderyn-fp(reentrancy-state-change)

        _baseAssets[token].priceFeed = priceFeed;
        _baseAssets[token].decimals = decimals;
        _baseAssets[token].minBorrow = minBorrow;
        _baseAssets[token].baseAssetCurves.push(baseAssetCurve);
        suggestedAmountOfSeedReserves[token] = amountOfSeedReserves;
        suggestedLockTimeOfSeedReserves[token] = lockTimeOfSeedReserves;

        emit BaseAssetWhitelisted(token, priceFeed, decimals);
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
        if (IPriceFeed(priceFeed).underlyingToken() != token) revert WrongPriceFeedUnderlying(); // aderyn-fp(reentrancy-state-change)

        /// @dev this price feed is used for a different token. Prevent arbitrage.
        if (tokenToPriceFeed[token] != address(0) && tokenToPriceFeed[token] != priceFeed) revert DifferentPriceFeedAlreadyUsedForToken();

        /// @dev the price feed is dead
        /// TODO: change the verification of live price feed, latestRoundData is not enough
        (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData(); // aderyn-fp(reentrancy-state-change)
        if (answer <= 0) revert InvalidPriceFeed();

        /// @dev Validates that all collateral factor parameters are within allowed ranges and maintain logical relationships:
        /// - 10% <= minBorrowCollateralFactor <= minLiquidateCollateralFactor <= minLiquidationFactor <= 100%
        /// - maxBorrowCollateralFactor <= maxLiquidateCollateralFactor <= maxLiquidationFactor <= 100%
        /// - min <= max for each factor
        if (
            minBorrowCollateralFactor < MIN_FACTOR ||
            minBorrowCollateralFactor > minLiquidateCollateralFactor ||
            minLiquidateCollateralFactor > minLiquidationFactor ||
            maxBorrowCollateralFactor > maxLiquidateCollateralFactor ||
            maxLiquidateCollateralFactor > maxLiquidationFactor ||
            maxLiquidationFactor > PARAMETERS_SCALE ||
            minBorrowCollateralFactor > maxBorrowCollateralFactor ||
            minLiquidateCollateralFactor > maxLiquidateCollateralFactor ||
            minLiquidationFactor > maxLiquidationFactor
        ) revert InvalidFactors();

        tokenToPriceFeed[token] = priceFeed;

        uint8 decimals = IERC20Metadata(token).decimals(); // aderyn-fp(reentrancy-state-change)

        _collateralAssets[token].collateralToken = token;
        _collateralAssets[token].priceFeed = priceFeed;
        _collateralAssets[token].decimals = decimals;
        _collateralAssets[token].maxBorrowCollateralFactor = maxBorrowCollateralFactor;
        _collateralAssets[token].minBorrowCollateralFactor = minBorrowCollateralFactor;
        _collateralAssets[token].minLiquidateCollateralFactor = minLiquidateCollateralFactor;
        _collateralAssets[token].maxLiquidateCollateralFactor = maxLiquidateCollateralFactor;
        _collateralAssets[token].minLiquidationFactor = minLiquidationFactor;
        _collateralAssets[token].maxLiquidationFactor = maxLiquidationFactor;

        emit CollateralAssetWhitelisted(token, priceFeed, decimals);
    }

    /**
     * @notice Checks if a token is whitelisted as a base asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isBaseTokenWhitelisted(address token) public view override returns (bool) {
        return _baseAssets[token].priceFeed != address(0);
    }

    /**
     * @notice Checks if a token is whitelisted as a collateral asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isCollateralTokenWhitelisted(address token) public view override returns (bool) {
        return _collateralAssets[token].priceFeed != address(0);
    }

    ///
    /// INITEREST CURVES SEGMENT
    ///

    /**
     * @notice Adds a new interest rate curve for an existing base asset.
     * @param token The address of the base asset.
     * @param baseAssetCurve The new interest rate curve configuration.
     */
    function addBaseAssetCurve(address token, BaseAssetCurve memory baseAssetCurve) external override onlyAuthorized {
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
    function changeBaseAssetCurve(address token, uint256 curveIndex, BaseAssetCurve calldata newCurve) external override onlyDao {
        if (token == address(0)) revert ZeroAddress();
        if (!isBaseTokenWhitelisted(token)) revert BaseTokenNotWhitelisted();
        if (curveIndex >= _baseAssets[token].baseAssetCurves.length || !isCurveConfigurationValid(newCurve))
            revert InvalidCurveConfiguration();

        emit BaseAssetCurveChanged(token, _baseAssets[token].baseAssetCurves[curveIndex], newCurve, curveIndex);

        _baseAssets[token].baseAssetCurves[curveIndex] = newCurve;
    }

    /**
     * @notice Validates an interest rate curve configuration.
     * @param curve The interest rate curve configuration to validate. Contains parameters in per year units
     * @return True if valid, false otherwise.
     */
    function isCurveConfigurationValid(BaseAssetCurve memory curve) public pure override returns (bool) {
        /**
         * Note: The protocol can support different sub-types of interest curves:
         * - base rate (for both supply and borrow) can be set to 0 to have curves with no boost for 0 utilization;
         * - both slopes can be set to 0 to discourage any side of the utilization or to have flat rate;
         * - kink can be set to 0 to have one-slope curve, or can be set to 100% to have curve that works in
         *   over-utilization segment;
         * - kinks for supply and borrow curves can be different;
         * - slopes can have different angles to have convex or concave curves
         *
         * For the limitations:
         * - borrow curve should always be higher than supply curve to ensure that supply rate is fully paid by interest
         * - there should be a reasonable limit for the kink to avoid under-incentivised overutilization
         */

        /// kink utilization cannot exceed 100%
        if (curve.supplyKink > PARAMETERS_SCALE || curve.borrowKink > PARAMETERS_SCALE) return false;

        /// Borrow interest curve should be above the supply curve at any point

        /// 1) cannot have supply base rate > borrow base rate, as it will create deficit from the start
        ///    so we validate that borrow curve starting point is higher than supply curve starting point
        if (curve.supplyPerYearInterestRateBase > curve.borrowPerYearInterestRateBase) return false;

        /// calculate break points for both curves. We operate in uint256 to avoid overflow in uint64
        /// and we can safely cast back to uint64, as the result is scaled back to uint64 size

        // y_breakpoint = supplyBase + supplyLowSlope * x
        // where x = supplyKink (rightmost point of the low slope part of the curve)
        uint256 intermediateSupplyPoint = (uint256(curve.supplyPerYearInterestRateSlopeLow) * uint256(curve.supplyKink)) / PARAMETERS_SCALE;
        uint64 supplyBreakPoint = curve.supplyPerYearInterestRateBase + uint64(intermediateSupplyPoint);

        // y_breakpoint = borrowBase + borrowLowSlope * x
        // where x = borrowKink (rightmost point of the low slope part of the curve)
        uint256 intermediateBorrowPoint = (uint256(curve.borrowPerYearInterestRateSlopeLow) * uint256(curve.borrowKink)) / PARAMETERS_SCALE;
        uint64 borrowBreakPoint = curve.borrowPerYearInterestRateBase + uint64(intermediateBorrowPoint);

        /// 2) borrow curve break point must always be higher than supplies one
        if (supplyBreakPoint > borrowBreakPoint) {
            /// 2.1) If supply curve break point has offset to the left and is higher than the borrow's one
            ///      than left segments intersect, and borrow interest does not cover supply interest
            if (curve.supplyKink <= curve.borrowKink) {
                // supply left part intersects borrow left part
                return false;
            } else {
                /// 2.2) There are some edge-cases where supply break point can be higher than borrows:
                ///      - with supply kink offset to the right and larger angle of borrow high slope.
                /// So we walidate, that this break point is not above the right segment of borrow interest curve.

                // y = borrowBase + borrowLowSlope * borrowKink + borrowHighSlope * (x - borrowKink)
                // where x = supplyKink (as we check borrow curve value at supply curve break point)
                intermediateBorrowPoint =
                    (uint256(curve.borrowPerYearInterestRateSlopeHigh) * uint256(curve.supplyKink - curve.borrowKink)) /
                    PARAMETERS_SCALE;
                uint64 borrowHighPoint = borrowBreakPoint + uint64(intermediateBorrowPoint);

                // supply left part intersects borrow right part
                if (supplyBreakPoint > borrowHighPoint) return false;
            }
        } else {
            /// 2.3) At this point we ensured left segment of supply curve does not intersect left segment of borrow curve
            ///      But there can be a situation, when supply kink is tilted to the left, and supply high slope have angle
            ///      high enough, that the right part of supply curve will intersect left part of borrow curve
            if (curve.supplyKink <= curve.borrowKink) {
                // y = supplyBase + supplyLowSlope * supplyKink + supplyHighSlope * (x - supplyKink)
                // where x = borrwKink (as we check supply curve value at borrow curve break point)
                intermediateSupplyPoint =
                    (uint256(curve.supplyPerYearInterestRateSlopeHigh) * uint256(curve.borrowKink - curve.supplyKink)) /
                    PARAMETERS_SCALE;
                uint64 supplyHighPoint = supplyBreakPoint + uint64(intermediateSupplyPoint);

                // supply right part intersects borrow left part
                if (supplyHighPoint > borrowBreakPoint) return false;
            }
            /// else case is checked further as it refers to the intersection of high slopes
        }

        /// 3) The last thing to check - that right segment of supply curve does not intersect right segment
        ///    of borrow curve (borrow in interest covers supply interest in over-utilization area).
        /// We set as a possible limit 200% utilization, and check the rightmost points of curves.

        // y = supplyBase + supplyLowSlope * supplyKink + supplyHighSlope * (x - supplyKink)
        // where x = 200%
        intermediateSupplyPoint =
            (uint256(curve.supplyPerYearInterestRateSlopeHigh) * uint256(2 * PARAMETERS_SCALE - curve.supplyKink)) /
            PARAMETERS_SCALE;
        intermediateBorrowPoint =
            (uint256(curve.borrowPerYearInterestRateSlopeHigh) * uint256(2 * PARAMETERS_SCALE - curve.borrowKink)) /
            PARAMETERS_SCALE;
        uint64 supplyRightPoint = supplyBreakPoint + uint64(intermediateSupplyPoint);
        uint64 borrowRightPoint = borrowBreakPoint + uint64(intermediateBorrowPoint);

        // supply right part intersects borrow right part
        if (supplyRightPoint > borrowRightPoint) return false;

        return true;
    }

    ///
    /// ADMIN SEGMENT
    ///

    /**
     * @dev Configuration setter
     * @param _config Configuration of the sandbox controller.
     */
    function setConfiguration(SandboxControllerConfiguration calldata _config) external onlyOwner {
        _validateConfig(_config);

        emit ConfigurationChanged(_controllerConfiguration, _config);
        _controllerConfiguration = _config;
    }

    /**
     * @dev Validates global config and reverts on incorrect values
     * @param _config Configuration of the sandbox controller.
     */
    function _validateConfig(SandboxControllerConfiguration memory _config) internal pure {
        if (
            _config.targetPercent > MAX_TARGET_PERCENT || /// not bigger than 50%.
            _config.storeFrontPriceFactor > PARAMETERS_SCALE /// not bigger than 100%.
        ) revert InvalidFactors();

        /// TODO: min and max update time will be moved to config controller
        if (_config.minUpdateTime == 0 || _config.maxUpdateTime < _config.minUpdateTime) revert IncorrectSetting();
    }

    /**
     * @dev Seed reserves parameters setter. Dao only.
     * @param _baseToken Base asset changes are applied to
     * @param _amount Seed reserves suggested amount (in USD)
     * @param _lockTime Seed reserves suggested lock time on the Comet
     */
    function setSeedReserves(address _baseToken, uint256 _amount, uint40 _lockTime) external onlyDao {
        if (_baseToken == address(0)) revert ZeroAddress();
        if (!isBaseTokenWhitelisted(_baseToken)) revert BaseTokenNotWhitelisted();

        _validateSeedReserves(_amount, _lockTime);

        if (_amount == suggestedAmountOfSeedReserves[_baseToken] && _lockTime == suggestedLockTimeOfSeedReserves[_baseToken]) {
            revert IncorrectSetting();
        }

        emit SeedReservesSet(_baseToken, _amount, _lockTime);
        suggestedAmountOfSeedReserves[_baseToken] = _amount;
        suggestedLockTimeOfSeedReserves[_baseToken] = _lockTime;
    }

    /**
     * @dev Validates seed reserves parameters and revers on incorrect values
     * @param _amount Suggested seed reserves amount
     * @param _lockTime Suggested seed reserves lock time on the Comet
     */
    function _validateSeedReserves(uint256 _amount, uint40 _lockTime) internal pure {
        if (_amount == 0) revert InvalidAmountOfSeedReserves();

        if (_lockTime < MIN_LOCK_TIME) revert InvalidLockTimeOfSeedReserves();
    }

    /**
     * @notice Transfers the owner privileges to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwner(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        if (newOwner == owner) revert IncorrectSetting();

        emit OwnerTransferred(owner, newOwner);
        owner = newOwner;
    }

    /**
     * @notice Transfers the DAO privileges to a new address.
     * @param newDao The address of the new DAO.
     */
    function transferDao(address newDao) external override onlyDao {
        if (newDao == address(0)) revert ZeroAddress();
        if (newDao == dao) revert IncorrectSetting();

        emit DaoTransferred(dao, newDao);
        dao = newDao;
    }

    ///
    /// GETTERS SEGMENT
    ///

    /**
     * @notice Returns base asset configuration for a given token.
     * @param token The address of the base asset token.
     *  @return The base asset configuration.
     */
    function baseAssets(address token) external view override returns (BaseAssetConfiguration memory) {
        return _baseAssets[token];
    }

    /**
     * @notice Returns collateral asset configuration for a given token.
     * @param token The address of the collateral asset token.
     *  @return The collateral asset configuration.
     */
    function collateralAssets(address token) external view override returns (CollateralAssetConfiguration memory) {
        return _collateralAssets[token];
    }

    /**
     * @notice Returns base asset baseAssetCurves for a given token.
     * @param token The address of the base asset token.
     * @return The base asset baseAssetCurves.
     */
    function curves(address token) external view override returns (BaseAssetCurve[] memory) {
        return _baseAssets[token].baseAssetCurves;
    }

    /**
     * @notice Returns the proposal boundaries of the sandbox controller.
     * @return The proposal boundaries.
     */
    function proposalBoundaries() external view override returns (uint40, uint40) {
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
    function config() external view override returns (SandboxControllerConfiguration memory) {
        return _controllerConfiguration;
    }

    /**
     * @notice Returns the suggested amount of seed reserves and lock time for a base asset.
     * @param token The address of the whitelisted base asset token.
     * @return The suggested amount of seed reserves and lock time for the base asset.
     */
    function baseTokenSuggestedSeedReserves(address token) external view returns (uint256, uint40) {
        return (suggestedAmountOfSeedReserves[token], suggestedLockTimeOfSeedReserves[token]);
    }
}
