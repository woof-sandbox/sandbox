// // SPDX-License-Identifier: BUSL-1.1
// pragma solidity 0.8.28;

// import "./ISandboxController.sol";
// import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
// import {IERC20NonStandard} from  ".interfaces/IERC20NonStandard.sol";
// import {IPriceFeed} from  "./interfaces/IPriceFeed.sol";

// /**
//  * @title SandboxController
//  * @dev Manages base asset configurations and interest rate curves.
//  */
// contract MockSandboxController is AccessControl, ISandboxController {
//     /// @notice Mapping of base assets to their configurations.
//     mapping(address => BaseAssetConfiguration) public baseAssets;
//     /// @notice Mapping of collateral assets to their configurations.
//     mapping(address => CollateralTokenConfig) public collateralAssets;

//     /// @notice Tracks whitelisted price feeds.
//     mapping(address => bool) public isPriceFeedWhitelisted;
//     /// @notice Role identifier for owner.
//     bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

//     /// @notice Role identifier for DAO governance.
//     bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");

//     /// @notice Array of base asset tokens.
//     address[] override public baseAssetTokens;

//     /// @notice Total count of base assets.
//     uint256 override public baseAssetCount;

//     address[] public collateralAssetTokens;
//     uint256 public collateralAssetCount;
    
//     /// @dev Modifier to restrict function access to authorized roles.
//     modifier onlyAuthorized() {
//         if (!(hasRole(OWNER_ROLE, msg.sender) || hasRole(DAO_ROLE, msg.sender))) {
//             revert NotAuthorized(msg.sender);
//         }
//         _;
//     }

//     /// @dev Modifier to restrict function access to DAO role.
//     modifier onlyDAO() {
//         if (!hasRole(DAO_ROLE, msg.sender)) {
//             revert NotAuthorized(msg.sender);
//         }
//         _;
//     }

//     /// @dev Modifier to restrict function access to owner role.
//     modifier onlyOwner() {
//         if (!hasRole(OWNER_ROLE, msg.sender)) {
//             revert NotAuthorized(msg.sender);
//         }
//         _;
//     }

//     /**
//      * @dev Constructor initializes roles.
//      * @param ownerMultisig Address of the owner multisig.
//      * @param dao Address of the DAO.
//      */
//     constructor(address ownerMultisig, address dao) {
//         if (ownerMultisig == address(0) || dao == address(0)) {
//             revert ZeroAddress();
//         }

//         _grantRole(OWNER_ROLE, ownerMultisig);
//         _grantRole(DAO_ROLE, dao);
//         _setRoleAdmin(OWNER_ROLE, 0x0);
//         _setRoleAdmin(DAO_ROLE, 0x0);
//     }

//     function whitelistCollateralAsset(
//         address token,
//         address priceFeed,
//         uint64 minBorrowCollateralFactor,
//         uint64 maxBorrowCollateralFactor,
//         uint64 minLiquidateCollateralFactor,
//         uint64 maxLiquidateCollateralFactor,
//         uint64 minLiquidationFactor,
//         uint64 maxLiquidationFactor
//     ) external onlyAuthorized {
//         if (token == address(0) || priceFeed == address(0)) revert ZeroAddress();
//         uint8 decimals = IERC20NonStandard(token).decimals();

//         collateralAssets[token] = CollateralTokenConfig({
//             collateralToken: token,
//             priceFeed: priceFeed,
//             decimals: decimals,
//             maxBorrowCollateralFactor: maxBorrowCollateralFactor,
//             minBorrowCollateralFactor: minBorrowCollateralFactor,
//             minLiquidateCollateralFactor: minLiquidateCollateralFactor,
//             maxLiquidateCollateralFactor: maxLiquidateCollateralFactor,
//             minLiquidationFactor: minLiquidationFactor,
//             maxLiquidationFactor: maxLiquidationFactor
//         });      

//         collateralAssetTokens.push(token);
//         isPriceFeedWhitelisted[priceFeed] = true;
//         collateralAssetCount++;
//     }

//     function getCollateralAssetByAddress(address _collateralToken) external view returns (CollateralTokenConfig memory) {
//         return collateralAssets[_collateralToken];
//     }

//     function baseAssets(address _baseToken) external view returns (BaseAssetConfiguration memory) {
//         return baseAssets[_baseToken];
//     }

//     /**
//      * @notice Whitelists a new base asset.
//      * @param token The address of the token to whitelist.
//      * @param priceFeed The associated price feed address.
//      * @param baseAssetCurve Interest rate curve configuration.
//      */
//     function whitelistBaseAsset(
//         address token,
//         address priceFeed,
//         uint minBorrow,
//         BaseAssetCurve memory baseAssetCurve
//     ) external onlyAuthorized {
//         if (token == address(0) || priceFeed == address(0)) {
//             revert ZeroAddress();
//         }
//         if (isTokenWhitelisted(token)) {
//             revert TokenAlreadyWhitelisted();
//         }
//         if (isPriceFeedWhitelisted[priceFeed]) {
//             revert PriceFeedAlreadyWhitelisted();
//         }
//         if (!isCurveConfigurationValid(baseAssetCurve)) {
//             revert InvalidCurveConfiguration();
//         }

//         uint8 decimals = IERC20NonStandard(token).decimals();

//         try IPriceFeed(priceFeed).latestRoundData() returns (uint80, int256, uint256, uint256, uint80) {
//             baseAssets[token].priceFeed = priceFeed;
//             baseAssets[token].decimals = decimals;
//             baseAssets[token].minBorrow = minBorrow;
//             baseAssets[token].baseAssetCurves.push(baseAssetCurve);
//         } catch {
//             revert InvalidPriceFeed();
//         }

//         baseAssetTokens.push(token);
//         isPriceFeedWhitelisted[priceFeed] = true;
//         baseAssetCount++;

//         emit BaseAssetWhitelisted(token, priceFeed, minBorrow, decimals, baseAssetCurve);
//     }

//     /**
//      * @notice Adds a new interest rate curve for an existing base asset.
//      * @param token The address of the base asset.
//      * @param baseAssetCurve The new interest rate curve configuration.
//      */
//     function addBaseAssetCurve(
//         address token,
//         BaseAssetCurve memory baseAssetCurve
//     ) external onlyAuthorized {
//         if (token == address(0)) {
//             revert ZeroAddress();
//         }
//         if (!isTokenWhitelisted(token)) {
//             revert TokenNotWhitelisted();
//         }
//         if (!isCurveConfigurationValid(baseAssetCurve)) {
//             revert InvalidCurveConfiguration();
//         }

//         baseAssets[token].baseAssetCurves.push(baseAssetCurve);
//         emit BaseAssetCurveAdded(token, baseAssetCurve);
//     }

//     /**
//      * @notice Updates an existing interest rate curve for a base asset.
//      * @param token The address of the base asset.
//      * @param curveIndex Index of the curve to update.
//      * @param baseAssetCurve The updated interest rate curve.
//      */
//     function changeBaseAssetCurve(
//         address token,
//         uint256 curveIndex,
//         BaseAssetCurve memory baseAssetCurve
//     ) external onlyDAO {
//         if (token == address(0)) {
//             revert ZeroAddress();
//         }
//         if (!isTokenWhitelisted(token)) {
//             revert TokenNotWhitelisted();
//         }
//         if (!isCurveConfigurationValid(baseAssetCurve)) {
//             revert InvalidCurveConfiguration();
//         }

//         BaseAssetCurve memory baseAssetCurveBefore = baseAssets[token].baseAssetCurves[curveIndex];

//         if (
//             baseAssetCurveBefore.supplyKink == baseAssetCurve.supplyKink &&
//             baseAssetCurveBefore.supplyPerYearInterestRateSlopeLow == baseAssetCurve.supplyPerYearInterestRateSlopeLow &&
//             baseAssetCurveBefore.supplyPerYearInterestRateSlopeHigh == baseAssetCurve.supplyPerYearInterestRateSlopeHigh &&
//             baseAssetCurveBefore.supplyPerYearInterestRateBase == baseAssetCurve.supplyPerYearInterestRateBase &&
//             baseAssetCurveBefore.borrowKink == baseAssetCurve.borrowKink &&
//             baseAssetCurveBefore.borrowPerYearInterestRateSlopeLow == baseAssetCurve.borrowPerYearInterestRateSlopeLow &&
//             baseAssetCurveBefore.borrowPerYearInterestRateSlopeHigh == baseAssetCurve.borrowPerYearInterestRateSlopeHigh &&
//             baseAssetCurveBefore.borrowPerYearInterestRateBase == baseAssetCurve.borrowPerYearInterestRateBase
//         ) {
//             revert InvalidCurveConfiguration();
//         }

//         baseAssets[token].baseAssetCurves[curveIndex] = baseAssetCurve;
//         emit BaseAssetCurveChanged(token, baseAssetCurveBefore, baseAssetCurve);
//     }

//     /**
//      * @notice Checks if a token is whitelisted as a base asset.
//      * @param token The address of the token.
//      * @return True if the token is whitelisted, otherwise false.
//      */
//     function isTokenWhitelisted(address token) public view returns (bool) {
//         return baseAssets[token].priceFeed != address(0);
//     }

//     /**
//      * @notice Checks if the curve configuration is valid.
//      * @param baseAssetCurve The interest rate curve configuration to validate.
//      * @return True if the curve configuration is valid, otherwise false.
//      */
//     function isCurveConfigurationValid(BaseAssetCurve memory baseAssetCurve) public pure returns (bool) {
//         return (
//             baseAssetCurve.supplyKink != 0 &&
//             baseAssetCurve.supplyPerYearInterestRateSlopeLow != 0 &&
//             baseAssetCurve.supplyPerYearInterestRateSlopeHigh != 0 &&
//             baseAssetCurve.supplyPerYearInterestRateBase != 0 &&
//             baseAssetCurve.borrowKink != 0 &&
//             baseAssetCurve.borrowPerYearInterestRateSlopeLow != 0 &&
//             baseAssetCurve.borrowPerYearInterestRateSlopeHigh != 0 &&
//             baseAssetCurve.borrowPerYearInterestRateBase != 0
//         );
//     }

//     /**
//      * @notice Transfers the owner role to a new address.
//      * @param newOwner The address of the new owner.
//      */
//     function transferOwnerRole(address newOwner) external onlyOwner {
//         if (newOwner == address(0)) {
//             revert ZeroAddress();
//         }

//         _revokeRole(OWNER_ROLE, msg.sender);
//         _grantRole(OWNER_ROLE, newOwner);
//     }

//     /**
//      * @notice Transfers the DAO role to a new address.
//      * @param newDAO The address of the new DAO.
//      */
//     function transferDAORole(address newDAO) external onlyDAO {
//         if (newDAO == address(0)) {
//             revert ZeroAddress();
//         }

//         _revokeRole(DAO_ROLE, msg.sender);
//         _grantRole(DAO_ROLE, newDAO);
//     }
// }