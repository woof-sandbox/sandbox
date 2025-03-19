// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20NonStandard} from "./interfaces/IERC20NonStandard.sol";
import {IPriceFeed} from "./interfaces/IPriceFeed.sol";

/**
 * @title SandboxController
 * @dev Manages base asset configurations and interest rate curves.
 */
contract SandboxController is AccessControl {
    /// @notice Role identifier for owner.
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    /// @notice Role identifier for DAO governance.
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    /// @notice Maximum number of assets for an asset list.
    uint8 internal constant MAX_ASSETS_FOR_ASSET_LIST = 24;

    /// @notice Maximum number of base assets.
    ControllerOptions options;

    /// @notice Structure to store base asset configuration.
    struct BaseAssetConfiguration {
        address priceFeed;
        uint256 decimals;
        bool feeEnabled;
        BaseAssetFactors baseAssetFactors;
        BaseAssetCurve[] baseAssetCurves;
    }

    struct CollateralAsssetConfiguration {
        address priceFeed;
    }

    /// @notice Structure defining base asset options.
    struct ControllerOptions {
        uint256 minUpdateTime;
        uint256 maxCollateralAssets;
        uint256 suggestedAmountOfSeedReserves;
        uint256 suggestedLockTimeOfSeedReserves;
    }

    /// @notice Structure defining base asset factors.
    struct BaseAssetFactors {
        uint64 storeFrontPriceFactor;
        uint64 protocolFactorBorrow;
        uint64 reserveFactorBorrow;
        uint64 protocolFactorLiquidation;
        uint64 reserveFactorLiquidation;
    }

    /// @notice Structure defining interest rate curve parameters.
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

    /// @notice Mapping of base assets to their configurations.
    mapping(address => BaseAssetConfiguration) public baseAssets;

    /// @notice Mapping of collateral assets to their configurations.
    mapping(address => CollateralAsssetConfiguration) public collateralAssets;

    /// @notice Tracks whitelisted price feeds.
    mapping(address => bool) public isPriceFeedWhitelisted;

    /// @notice Array of base asset tokens.
    address[] public baseAssetTokens;

    /// @notice Array of collateral asset tokens.
    address[] public collateralAssetTokens;

    /// @notice Total count of base assets.
    uint256 public baseAssetCount;

    /// @notice Total count of collateral assets.
    uint256 public collateralAssetCount;

    /// @notice Event emitted when a base asset is whitelisted.
    event BaseAssetWhitelisted(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Event emitted when a collateral asset is whitelisted.
    event CollateralAssetWhitelisted(
        address indexed token,
        address indexed priceFeed
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

    /// @notice Set the base asset options.
    event ControllerOptionsSet(ControllerOptions options);

    /// @notice Custom errors for various invalid operations.
    error ZeroAddress();
    error TokenAlreadyWhitelisted();
    error TokenNotWhitelisted();
    error PriceFeedAlreadyWhitelisted();
    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error InvalidBorrowFactor(BaseAssetFactors baseAssetFactors);
    error InvalidOptions(ControllerOptions controller);
    error NotAuthorized(address caller);

    /// @dev Modifier to restrict function access to authorized roles.
    modifier onlyAuthorized() {
        if (
            !(hasRole(OWNER_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender))
        ) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    /// @dev Modifier to restrict function access to DAO role.
    modifier onlyDAO() {
        if (!hasRole(DAO_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    /// @dev Modifier to restrict function access to owner role.
    modifier onlyOwner() {
        if (!hasRole(OWNER_ROLE, msg.sender)) {
            revert NotAuthorized(msg.sender);
        }
        _;
    }

    /**
     * @dev Constructor initializes roles.
     * @param ownerMultisig Address of the owner multisig.
     * @param dao Address of the DAO.
     */
    constructor(address ownerMultisig, address dao) {
        if (ownerMultisig == address(0) || dao == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(OWNER_ROLE, ownerMultisig);
        _grantRole(DAO_ROLE, dao);
        _setRoleAdmin(OWNER_ROLE, 0x0);
        _setRoleAdmin(DAO_ROLE, 0x0);
    }

    /**
     * @notice Sets the base asset options.
     * @param options The base asset options to set.
     * @dev Only callable by the owner.
     */
    function setOptions(
        ControllerOptions memory options
    ) external onlyOwner {
        if (!isOptionsValid(options)) {
            revert InvalidOptions(options);
        }

        emit ControllerOptionsSet(options);
    }

    /**
     * @notice Whitelists a new base asset.
     * @param token The address of the token to whitelist.
     * @param priceFeed The associated price feed address.
     * @param baseAssetCurve Interest rate curve configuration.
     */
    function whitelistBaseAsset(
        address token,
        address priceFeed,
        bool feeEnabled,
        BaseAssetFactors memory baseAssetFactors,
        BaseAssetCurve memory baseAssetCurve
    ) external onlyAuthorized {
        if (token == address(0) || priceFeed == address(0)) {
            revert ZeroAddress();
        }
        if (isTokenWhitelisted(token)) {
            revert TokenAlreadyWhitelisted();
        }
        if (isPriceFeedWhitelisted[priceFeed]) {
            revert PriceFeedAlreadyWhitelisted();
        }
        if (!isCurveConfigurationValid(baseAssetCurve)) {
            revert InvalidCurveConfiguration();
        }

        if (!isFactorsValid(baseAssetFactors)) {
            revert InvalidBorrowFactor(baseAssetFactors);
        }

        uint8 decimals = IERC20NonStandard(token).decimals();

        try IPriceFeed(priceFeed).latestRoundData() returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        ) {
            baseAssets[token].priceFeed = priceFeed;
            baseAssets[token].decimals = decimals;
            baseAssets[token].feeEnabled = feeEnabled;
            baseAssets[token].baseAssetFactors = baseAssetFactors;
            baseAssets[token].baseAssetCurves.push(baseAssetCurve);
        } catch {
            revert InvalidPriceFeed();
        }

        baseAssetTokens.push(token);
        isPriceFeedWhitelisted[priceFeed] = true;
        baseAssetCount++;

        emit BaseAssetWhitelisted(token, priceFeed, decimals, baseAssetCurve);
    }

    /**
     * @notice Whitelists a new collateral asset.
     * @param token The address of the token to whitelist.
     * @param priceFeed The associated price feed address.
     */
    function whitelistCollateralAsset(
        address token,
        address priceFeed
    ) external onlyAuthorized {
        if (token == address(0) || priceFeed == address(0)) {
            revert ZeroAddress();
        }
        if (collateralAssets[token].priceFeed != address(0)) {
            revert TokenAlreadyWhitelisted();
        }
        if (isPriceFeedWhitelisted[priceFeed]) {
            revert PriceFeedAlreadyWhitelisted();
        }

        try IPriceFeed(priceFeed).latestRoundData() returns (
            uint80,
            int256,
            uint256,
            uint256,
            uint80
        ) {
            collateralAssets[token].priceFeed = priceFeed;
        } catch {
            revert InvalidPriceFeed();
        }
        collateralAssetTokens.push(token);

        isPriceFeedWhitelisted[priceFeed] = true;

        collateralAssetCount++;

        emit CollateralAssetWhitelisted(token, priceFeed);
    }

    /**
     * @notice Updates the protocol and reserve factors for a base asset.
     * @param token The address of the base asset.
     * @param baseAssetFactors The new base asset factors.
     */
    function setFactors(
        address token,
        BaseAssetFactors memory baseAssetFactors
    ) external onlyOwner {
        if (token == address(0)) {
            revert ZeroAddress();
        }
        if (!isTokenWhitelisted(token)) {
            revert TokenNotWhitelisted();
        }
        if (!isFactorsValid(baseAssetFactors)) {
            revert InvalidBorrowFactor(baseAssetFactors);
        }

        baseAssets[token].baseAssetFactors = baseAssetFactors;
    }

    /**
     * @notice Updates the protocol and reserve factors for a base asset.
     * @param token The address of the base asset.
     * @param feeEnabled  The new fee enabled status.
     */
    function setFeeEnabled(address token, bool feeEnabled) external onlyDAO {
        if (token == address(0)) {
            revert ZeroAddress();
        }
        if (!isTokenWhitelisted(token)) {
            revert TokenNotWhitelisted();
        }

        baseAssets[token].feeEnabled = feeEnabled;
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
        if (token == address(0)) {
            revert ZeroAddress();
        }
        if (!isTokenWhitelisted(token)) {
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
     * @param curveIndex Index of the curve to update.
     * @param baseAssetCurve The updated interest rate curve.
     */
    function changeBaseAssetCurve(
        address token,
        uint256 curveIndex,
        BaseAssetCurve memory baseAssetCurve
    ) external onlyDAO {
        if (token == address(0)) {
            revert ZeroAddress();
        }
        if (!isTokenWhitelisted(token)) {
            revert TokenNotWhitelisted();
        }
        if (
            !isCurveConfigurationValid(baseAssetCurve) ||
            curveIndex >= baseAssets[token].baseAssetCurves.length
        ) {
            revert InvalidCurveConfiguration();
        }

        BaseAssetCurve memory baseAssetCurveBefore = baseAssets[token]
            .baseAssetCurves[curveIndex];

        if (
            baseAssetCurveBefore.supplyKink == baseAssetCurve.supplyKink &&
            baseAssetCurveBefore.supplyPerYearInterestRateSlopeLow ==
            baseAssetCurve.supplyPerYearInterestRateSlopeLow &&
            baseAssetCurveBefore.supplyPerYearInterestRateSlopeHigh ==
            baseAssetCurve.supplyPerYearInterestRateSlopeHigh &&
            baseAssetCurveBefore.supplyPerYearInterestRateSlopeBase ==
            baseAssetCurve.supplyPerYearInterestRateSlopeBase &&
            baseAssetCurveBefore.borrowKink == baseAssetCurve.borrowKink &&
            baseAssetCurveBefore.borrowPerYearInterestRateSlopeLow ==
            baseAssetCurve.borrowPerYearInterestRateSlopeLow &&
            baseAssetCurveBefore.borrowPerYearInterestRateSlopeHigh ==
            baseAssetCurve.borrowPerYearInterestRateSlopeHigh &&
            baseAssetCurveBefore.borrowPerYearInterestRateSlopeBase ==
            baseAssetCurve.borrowPerYearInterestRateSlopeBase
        ) {
            revert InvalidCurveConfiguration();
        }

        baseAssets[token].baseAssetCurves[curveIndex] = baseAssetCurve;
        emit BaseAssetCurveChanged(token, baseAssetCurveBefore, baseAssetCurve);
    }

    /**
     * @notice Checks if a token is whitelisted as a base asset.
     * @param token The address of the token.
     * @return True if the token is whitelisted, otherwise false.
     */
    function isTokenWhitelisted(address token) public view returns (bool) {
        return baseAssets[token].priceFeed != address(0);
    }

    /**
     * @notice Checks if the curve configuration is valid.
     * @param baseAssetCurve The interest rate curve configuration to validate.
     * @return True if the curve configuration is valid, otherwise false.
     */
    function isCurveConfigurationValid(
        BaseAssetCurve memory baseAssetCurve
    ) public pure returns (bool) {
        return (baseAssetCurve.supplyKink != 0 &&
            baseAssetCurve.supplyPerYearInterestRateSlopeLow != 0 &&
            baseAssetCurve.supplyPerYearInterestRateSlopeHigh != 0 &&
            baseAssetCurve.supplyPerYearInterestRateSlopeBase != 0 &&
            baseAssetCurve.borrowKink != 0 &&
            baseAssetCurve.borrowPerYearInterestRateSlopeLow != 0 &&
            baseAssetCurve.borrowPerYearInterestRateSlopeHigh != 0 &&
            baseAssetCurve.borrowPerYearInterestRateSlopeBase != 0);
    }

    /**
     * @notice Checks if the base asset options are valid.
     * @param options The base asset options to validate.
     * @return True if the options are valid, otherwise false.
     */
    function isOptionsValid(
        ControllerOptions memory options
    ) public pure returns (bool) {
        return (options.maxCollateralAssets != 0 &&
            options.maxCollateralAssets <= MAX_ASSETS_FOR_ASSET_LIST &&
            options.minUpdateTime != 0 &&
            options.suggestedAmountOfSeedReserves != 0 &&
            options.suggestedLockTimeOfSeedReserves != 0);
    }

    /**
     * @notice Checks if the base asset factors are valid.
     * @param baseAssetFactors The base asset factors to validate.
     * @return True if the factors are valid, otherwise false.
     */
    function isFactorsValid(
        BaseAssetFactors memory baseAssetFactors
    ) public pure returns (bool) {
        return
            (baseAssetFactors.protocolFactorBorrow != 0 &&
                baseAssetFactors.reserveFactorBorrow != 0 &&
                baseAssetFactors.protocolFactorBorrow +
                    baseAssetFactors.reserveFactorBorrow <=
                1e18 &&
                baseAssetFactors.protocolFactorLiquidation != 0 &&
                baseAssetFactors.reserveFactorLiquidation != 0 &&
                baseAssetFactors.protocolFactorLiquidation +
                    baseAssetFactors.reserveFactorLiquidation <=
                1e18) &&
            baseAssetFactors.storeFrontPriceFactor != 0 &&
            baseAssetFactors.storeFrontPriceFactor <= 1e18;
    }

    /**
     * @notice Transfers the owner role to a new address.
     * @param newOwner The address of the new owner.
     */
    function transferOwnerRole(address newOwner) external onlyOwner {
        if (newOwner == address(0)) {
            revert ZeroAddress();
        }

        _revokeRole(OWNER_ROLE, msg.sender);
        _grantRole(OWNER_ROLE, newOwner);
    }

    /**
     * @notice Transfers the DAO role to a new address.
     * @param newDAO The address of the new DAO.
     */
    function transferDAORole(address newDAO) external onlyDAO {
        if (newDAO == address(0)) {
            revert ZeroAddress();
        }

        _revokeRole(DAO_ROLE, msg.sender);
        _grantRole(DAO_ROLE, newDAO);
    }
}
