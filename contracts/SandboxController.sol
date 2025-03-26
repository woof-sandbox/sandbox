// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20NonStandard} from "./interfaces/IERC20NonStandard.sol";
import {IPriceFeed} from "./interfaces/IPriceFeed.sol";
import {ISandboxController} from "./interfaces/ISandboxController.sol";

/**
 * @title SandboxController
 * @dev Manages base asset configurations and interest rate curves.
 */
contract SandboxController is ISandboxController {
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

    uint256 public baseAssetCount;
    uint256 public collateralAssetCount;

    bool public feeEnabled;

    address[] public baseAssetTokens;
    address[] public collateralAssetTokens;

    mapping(address => BaseAssetConfiguration) public baseAssets;
    mapping(address => CollateralAssetConfiguration) public collateralAssets;
    mapping(address => bool) public isPriceFeedWhitelisted;

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
        uint256 _suggestedLockTimeOfSeedReserves
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
        if (_storeFrontPriceFactor >= 1e18) {
            revert InvalidFactors();
        }
        storeFrontPriceFactor = _storeFrontPriceFactor;

        if (
            _protocolFactorBorrow == 0 ||
            _reserveFactorBorrow == 0 ||
            (_protocolFactorBorrow + _reserveFactorBorrow) > 1e18
        ) {
            revert InvalidFactors();
        }
        protocolFactorBorrow = _protocolFactorBorrow;
        reserveFactorBorrow = _reserveFactorBorrow;

        if (
            _protocolFactorLiquidation == 0 ||
            _reserveFactorLiquidation == 0 ||
            (_protocolFactorLiquidation + _reserveFactorLiquidation) > 1e18
        ) {
            revert InvalidFactors();
        }
        protocolFactorLiquidation = _protocolFactorLiquidation;
        reserveFactorLiquidation = _reserveFactorLiquidation;

        if (
            _minUpdateTime == 0 ||
            _maxCollateralAssets == 0 ||
            _suggestedAmountOfSeedReserves == 0 ||
            _suggestedLockTimeOfSeedReserves == 0
        ) {
            revert InvalidFactors();
        }
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

        baseAssets[token].priceFeed = priceFeed;
        baseAssets[token].decimals = decimals;
        baseAssets[token].minBorrow = minBorrow;
        baseAssets[token].baseAssetCurves.push(baseAssetCurve);

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
     * @notice Whitelists a new collateral asset with its price feed.
     * @param token The address of the collateral token.
     * @param priceFeed The price feed contract address for the collateral.
     */
    function whitelistCollateralAsset(
        address token,
        address priceFeed
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

        {
            (, int256 answer, , , ) = IPriceFeed(priceFeed).latestRoundData();
            if (answer <= 0) {
                revert InvalidPriceFeed();
            }
        }

        collateralAssets[token].priceFeed = priceFeed;
        collateralAssetTokens.push(token);
        collateralAssetCount++;

        isPriceFeedWhitelisted[priceFeed] = true;

        emit CollateralAssetWhitelisted(token, priceFeed);
    }

          /**
     * @dev Emitted when a base asset is whitelisted.
     * 
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
         if (_storeFrontPriceFactor >= 1e18 ||
            _minUpdateTime == 0 ||
            _suggestedAmountOfSeedReserves == 0 ||
            _suggestedLockTimeOfSeedReserves == 0) {
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

        baseAssets[token].baseAssetCurves.push(baseAssetCurve);
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
            curveIndex >= baseAssets[token].baseAssetCurves.length ||
            !isCurveConfigurationValid(newCurve)
        ) {
            revert InvalidCurveConfiguration();
        }

        BaseAssetCurve memory oldCurve = baseAssets[token].baseAssetCurves[
            curveIndex
        ];

        baseAssets[token].baseAssetCurves[curveIndex] = newCurve;
        emit BaseAssetCurveChanged(token, oldCurve, newCurve);
    }

    /**
     * @notice Checks if a token is whitelisted as a base asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isBaseTokenWhitelisted(address token) public view returns (bool) {
        return baseAssets[token].priceFeed != address(0);
    }

    /**
     * @notice Checks if a token is whitelisted as a collateral asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isCollateralTokenWhitelisted(
        address token
    ) public view returns (bool) {
        return collateralAssets[token].priceFeed != address(0);
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
