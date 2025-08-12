// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ICometStructures } from "contracts/interfaces/ICometStructures.sol";

/**
 * @title Compound's Comet Storage Interface
 * @dev Versions can enforce append-only storage slots via inheritance.
 * @author Compound
 */
contract CometStorage is ICometStructures {
    /** Internal constants **/

    /// @dev The max number of assets this contract is hardcoded to support
    ///  Do not change this variable without updating all the fields throughout the contract,
    //    including the size of UserBasic.assetsIn and corresponding integer conversions.
    uint8 public constant MAX_ASSETS = 24;

    /// @dev The max number of decimals base token can have
    ///  Note this cannot just be increased arbitrarily.
    uint8 internal constant MAX_BASE_DECIMALS = 18;

    /// @dev Offsets for specific actions in the pause flag bit array
    uint8 internal constant PAUSE_SUPPLY_OFFSET = 0;
    uint8 internal constant PAUSE_TRANSFER_OFFSET = 1;
    uint8 internal constant PAUSE_WITHDRAW_OFFSET = 2;
    uint8 internal constant PAUSE_ABSORB_OFFSET = 3;
    uint8 internal constant PAUSE_BUY_OFFSET = 4;

    /// @dev The decimals required for a price feed
    uint8 internal constant PRICE_FEED_DECIMALS = 8;

    /// @dev 365 days * 24 hours * 60 minutes * 60 seconds
    uint64 internal constant SECONDS_PER_YEAR = 31_536_000;

    /// @dev The scale for base tracking accrual
    uint64 internal constant BASE_ACCRUAL_SCALE = 1e6;

    /// @dev The scale for base index (depends on time/rate scales, not base token)
    uint64 internal constant BASE_INDEX_SCALE = 1e15;

    /// @dev The scale for factors
    uint64 internal constant FACTOR_SCALE = 1e18;

    /// @dev The storage slot for reentrancy guard flags
    bytes32 internal constant REENTRANCY_GUARD_FLAG_SLOT = bytes32(keccak256("comet.reentrancy.guard"));

    /// @dev The reentrancy guard statuses
    uint256 internal constant REENTRANCY_GUARD_NOT_ENTERED = 0; // aderyn-fp(unused-state-variable)
    uint256 internal constant REENTRANCY_GUARD_ENTERED = 1;

    /** General configuration constants **/
    /// @notice Config Controller address
    address public configController;

    /// @notice Sandbox Controller address
    address public sandboxController;

    /// @notice The address of the extension contract
    address public extension;

    /// @notice The address of the reward contract
    address public rewardAddress;

    /// @notice The address of the base token contract
    address public baseToken;

    /// @notice The address of the comet factory contract
    address public factory;

    /// @notice The address of the price feed for the base token
    address public baseTokenPriceFeed;

    /// @notice The point in the supply rates separating the low interest rate slope and the high interest rate slope (factor)
    /// @dev uint64
    uint64 public supplyKink;

    /// @notice Per second supply interest rate slope applied when utilization is below kink (factor)
    /// @dev uint64
    uint64 public supplyPerSecondInterestRateSlopeLow;

    /// @notice Per secollateralTokenscond supply interest rate slope applied when utilization is above kink (factor)
    /// @dev uint64
    uint64 public supplyPerSecondInterestRateSlopeHigh;

    /// @notice Per second supply base interest rate (factor)
    /// @dev uint64
    uint64 public supplyPerSecondInterestRateBase;

    /// @notice The point in the borrow rate separating the low interest rate slope and the high interest rate slope (factor)
    /// @dev uint64
    uint64 public borrowKink;

    /// @notice Per second borrow interest rate slope applied when utilization is below kink (factor)
    /// @dev uint64
    uint64 public borrowPerSecondInterestRateSlopeLow;

    /// @notice Per second borrow interest rate slope applied when utilization is above kink (factor)
    /// @dev uint64
    uint64 public borrowPerSecondInterestRateSlopeHigh;

    /// @notice Per second borrow base interest rate (factor)
    /// @dev uint64
    uint64 public borrowPerSecondInterestRateBase;

    /// @notice The fraction of the liquidation penalty that goes to buyers of collateral instead of the protocol
    uint64 public storeFrontPriceFactor;

    /// @notice The scale for base token (must be less than 18 decimals)
    uint64 public baseScale;

    /// @notice The minimum base amount required to initiate a borrow
    uint public baseBorrowMin;

    /// @notice The minimum base token reserves which must be held before collateral is hodled
    uint64 public targetPercent;

    /// @notice Seed reserves, initialized during the Comet creation
    uint public seedReserves;

    /// @notice Unlock timestamp
    uint64 public unlockTimestamp;

    /// @dev Aggregate variables tracked for the entire market
    uint64 internal baseSupplyIndex;
    uint64 internal baseBorrowIndex;
    uint104 internal totalSupplyBase;
    uint104 internal totalBorrowBase;
    uint40 internal lastAccrualTime;
    uint8 internal pauseFlags;

    /// @notice The number of assets this contract actually supports
    uint8 public numAssets;

    /// @notice Aggregate variables tracked for each collateral asset
    mapping(address => uint256) public totalsCollateral;

    /// @notice Fees aggregation for the controller
    mapping(address => uint256) public assetFeesController;
    /// @notice Fees aggregation for the DAO
    mapping(address => uint256) public assetFeesDAO;

    /// @notice Mapping of users to accounts which may be permitted to manage the user account
    /// @notice user => spender => asset (base or collateral) => amount
    mapping(address => mapping(address => mapping(address => uint))) public allowance;

    /// @notice user => spender => true or false (for baseAsset only)
    /// @notice allowance for all is expected to be atomic - for ...All() operations only
    mapping(address => mapping(address => bool)) public allowanceAll;

    /// @notice The next expected nonce for an address, for validating authorizations via signature
    mapping(address => uint) public userNonce;

    /// @notice Mapping of users to base principal and other basic data
    mapping(address => UserBasic) public userBasic;

    /// @notice Mapping of users to collateral data per collateral asset
    mapping(address => mapping(address => uint)) public userCollateral;

    mapping(address => uint8) public collateralAssetIndex;
    CollateralAsset[] public collateralAssets;
}
