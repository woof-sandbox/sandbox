// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20NonStandard} from  "./IERC20NonStandard.sol";
import {IPriceFeed} from "./IPriceFeed.sol";

/**
 * @title SandboxController
 * @dev Manages base asset configurations and interest rate curves.
 */
contract SandboxController is AccessControl {

    /// @notice Role identifier for owner.
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    /// @notice Role identifier for DAO governance.
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

    /// @notice Structure to store base asset configuration.
    struct BaseAssetConfiguration {
        address priceFeed;
        uint256 decimals;
        BaseAssetCurve[] baseAssetCurves;
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

    /// @notice Tracks whitelisted price feeds.
    mapping(address => bool) public isPriceFeedWhitelisted;

    /// @notice Array of base asset tokens.
    address[] public baseAssetTokens;

    /// @notice Total count of base assets.
    uint256 public baseAssetCount;

    /// @notice Event emitted when a base asset is whitelisted.
    event BaseAssetWhitelisted(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Event emitted when a base asset curve is added.
    event BaseAssetCurveAdded(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Event emitted when a base asset curve is changed.
    event BaseAssetCurveChanged(
        address indexed token,
        address indexed priceFeed,
        uint8 decimals,
        BaseAssetCurve baseAssetCurveBefore,
        BaseAssetCurve baseAssetCurve
    );

    /// @notice Custom errors for various invalid operations.
    error ZeroAddress();
    error TokenAlreadyWhitelisted();
    error TokenNotWhitelisted();
    error PriceFeedAlreadyWhitelisted();
    error InvalidCurveConfiguration();
    error InvalidPriceFeed();
    error NotAuthorized(address caller);

    /// @dev Modifier to restrict function access to authorized roles.
    modifier onlyAuthorized() {
        if (!(hasRole(OWNER_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender))) {
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
     * @notice Whitelists a new base asset.
     * @param token The address of the token to whitelist.
     * @param priceFeed The associated price feed address.
     * @param baseAssetCurve Interest rate curve configuration.
     */
    function whitelistBaseAsset(
        address token,
        address priceFeed,
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

        uint8 decimals = IERC20NonStandard(token).decimals();

        try IPriceFeed(priceFeed).latestRoundData() returns (uint80, int256, uint256, uint256, uint80) {
            baseAssets[token].priceFeed = priceFeed;
            baseAssets[token].decimals = decimals;
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
        emit BaseAssetCurveAdded(token, baseAssets[token].priceFeed, uint8(baseAssets[token].decimals), baseAssetCurve);
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
        if (!isCurveConfigurationValid(baseAssetCurve) || curveIndex >= baseAssets[token].baseAssetCurves.length) {
            revert InvalidCurveConfiguration();
        }

        BaseAssetCurve memory baseAssetCurveBefore = baseAssets[token].baseAssetCurves[curveIndex];

        if (
            baseAssetCurveBefore.supplyKink == baseAssetCurve.supplyKink &&
            baseAssetCurveBefore.supplyPerYearInterestRateSlopeLow == baseAssetCurve.supplyPerYearInterestRateSlopeLow &&
            baseAssetCurveBefore.supplyPerYearInterestRateSlopeHigh == baseAssetCurve.supplyPerYearInterestRateSlopeHigh &&
            baseAssetCurveBefore.supplyPerYearInterestRateSlopeBase == baseAssetCurve.supplyPerYearInterestRateSlopeBase &&
            baseAssetCurveBefore.borrowKink == baseAssetCurve.borrowKink &&
            baseAssetCurveBefore.borrowPerYearInterestRateSlopeLow == baseAssetCurve.borrowPerYearInterestRateSlopeLow &&
            baseAssetCurveBefore.borrowPerYearInterestRateSlopeHigh == baseAssetCurve.borrowPerYearInterestRateSlopeHigh &&
            baseAssetCurveBefore.borrowPerYearInterestRateSlopeBase == baseAssetCurve.borrowPerYearInterestRateSlopeBase
        ) {
            revert InvalidCurveConfiguration();
        }

        baseAssets[token].baseAssetCurves[curveIndex] = baseAssetCurve;
        emit BaseAssetCurveChanged(token, baseAssets[token].priceFeed, uint8(baseAssets[token].decimals), baseAssetCurveBefore, baseAssetCurve);
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
    function isCurveConfigurationValid(BaseAssetCurve memory baseAssetCurve) public pure returns (bool) {
        return (
            baseAssetCurve.supplyKink != 0 &&
            baseAssetCurve.supplyPerYearInterestRateSlopeLow != 0 &&
            baseAssetCurve.supplyPerYearInterestRateSlopeHigh != 0 &&
            baseAssetCurve.supplyPerYearInterestRateSlopeBase != 0 &&
            baseAssetCurve.borrowKink != 0 &&
            baseAssetCurve.borrowPerYearInterestRateSlopeLow != 0 &&
            baseAssetCurve.borrowPerYearInterestRateSlopeHigh != 0 &&
            baseAssetCurve.borrowPerYearInterestRateSlopeBase != 0
        );
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