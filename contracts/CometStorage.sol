// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./interfaces/IConfigController.sol";

/**
 * @title Compound's Comet Storage Interface
 * @dev Versions can enforce append-only storage slots via inheritance.
 * @author Compound
 */
contract CometStorage {
    // 512 bits total = 2 slots

    struct TotalsBasic {
        // 1st slot
        uint64 baseSupplyIndex;
        uint64 baseBorrowIndex;
        uint64 trackingSupplyIndex;
        uint64 trackingBorrowIndex;
        // 2nd slot
        uint104 totalSupplyBase;
        uint104 totalBorrowBase;
        uint40 lastAccrualTime;
        uint8 pauseFlags;
    }

    struct TotalsCollateral {
        uint128 totalSupplyAsset;
        uint128 _reserved;
    }

    struct UserBasic {
        int104 principal;
        uint64 baseTrackingIndex;
        uint64 baseTrackingAccrued;
        uint24 assetsIn;
    }

    struct UserCollateral {
        uint128 balance;
        uint128 _reserved;
    }

    /** Internal constants **/

    /// @dev The max number of assets this contract is hardcoded to support
    ///  Do not change this variable without updating all the fields throughout the contract,
    //    including the size of UserBasic.assetsIn and corresponding integer conversions.
    uint8 internal constant MAX_ASSETS = 24;

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
    bytes32 internal constant REENTRANCY_GUARD_FLAG_SLOT =
        bytes32(keccak256("comet.reentrancy.guard"));

    /// @dev The reentrancy guard statuses
    uint256 internal constant REENTRANCY_GUARD_NOT_ENTERED = 0;
    uint256 internal constant REENTRANCY_GUARD_ENTERED = 1;

    /** General configuration constants **/
    /// @notice Config Controller address
    address public configController;

    /// @notice Sandbox Controller address
    address public sandboxController;

    /// @notice The address of the extension contract
    address public extension;

    /// @notice The address of the base token contract
    address public baseToken;

    /// @notice The address of the comet factory contract
    address public factory;

    /// @notice The address of the price feed for the base token
    address public baseTokenPriceFeed;

    /// @notice The point in the supply rates separating the low interest rate slope and the high interest rate slope (factor)
    /// @dev uint64
    uint public supplyKink;

    /// @notice Per second supply interest rate slope applied when utilization is below kink (factor)
    /// @dev uint64
    uint public supplyPerSecondInterestRateSlopeLow;

    /// @notice Per secollateralTokenscond supply interest rate slope applied when utilization is above kink (factor)
    /// @dev uint64
    uint public supplyPerSecondInterestRateSlopeHigh;

    /// @notice Per second supply base interest rate (factor)
    /// @dev uint64
    uint public supplyPerSecondInterestRateBase;

    /// @notice The point in the borrow rate separating the low interest rate slope and the high interest rate slope (factor)
    /// @dev uint64
    uint public borrowKink;

    /// @notice Per second borrow interest rate slope applied when utilization is below kink (factor)
    /// @dev uint64
    uint public borrowPerSecondInterestRateSlopeLow;

    /// @notice Per second borrow interest rate slope applied when utilization is above kink (factor)
    /// @dev uint64
    uint public borrowPerSecondInterestRateSlopeHigh;

    /// @notice Per second borrow base interest rate (factor)
    /// @dev uint64
    uint public borrowPerSecondInterestRateBase;

    /// @notice The fraction of the liquidation penalty that goes to buyers of collateral instead of the protocol
    /// @dev uint64
    uint public storeFrontPriceFactor;

    /// @notice The scale for base token (must be less than 18 decimals)
    /// @dev uint64
    uint public baseScale;

    /// @notice The scale for reward tracking
    /// @dev uint64
    uint public trackingIndexScale;

    /// @notice The speed at which supply rewards are tracked (in trackingIndexScale)
    /// @dev uint64
    uint public baseTrackingSupplySpeed;

    /// @notice The speed at which borrow rewards are tracked (in trackingIndexScale)
    /// @dev uint64
    uint public baseTrackingBorrowSpeed;

    /// @notice The minimum amount of base principal wei for rewards to accrue
    /// @dev This must be large enough so as to prevent division by base wei from overflowing the 64 bit indices
    /// @dev uint104
    uint public baseMinForRewards;

    /// @notice The minimum base amount required to initiate a borrow
    uint public baseBorrowMin;

    /// @notice The minimum base token reserves which must be held before collateral is hodled
    uint public targetPercent;

    /// @notice Seed reserves
    uint public seedReserves;

    /// @notice Suggested reserves
    uint public suggestedReserves;

    /// @notice Unlock timestamp
    uint public unlockTimestamp;

    /// @notice Last reserve balance
    uint public lastReserveBalance;

    /// @notice Factor to divide by when accruing rewards in order to preserve 6 decimals (i.e. baseScale / 1e6)
    uint internal accrualDescaleFactor;

    /// @dev Aggregate variables tracked for the entire market
    uint64 internal baseSupplyIndex;
    uint64 internal baseBorrowIndex;
    uint64 internal trackingSupplyIndex;
    uint64 internal trackingBorrowIndex;
    uint104 internal totalSupplyBase;
    uint104 internal totalBorrowBase;
    uint40 internal lastAccrualTime;
    uint8 internal pauseFlags;

    /// @notice The number of assets this contract actually supports
    uint8 public numAssets;

    bool internal _closed;

    /// @notice Aggregate variables tracked for each collateral asset
    mapping(address => TotalsCollateral) public totalsCollateral;

    /// @notice Mapping of users to accounts which may be permitted to manage the user account
    mapping(address => mapping(address => bool)) public isAllowed;

    /// @notice The next expected nonce for an address, for validating authorizations via signature
    mapping(address => uint) public userNonce;

    /// @notice Mapping of users to base principal and other basic data
    mapping(address => UserBasic) public userBasic;

    /// @notice Mapping of users to collateral data per collateral asset
    mapping(address => mapping(address => UserCollateral)) public userCollateral;

    mapping(address => uint8) public collateralAssetIndex;
    mapping(uint8 => address) public collateralAssetAddress;
    IConfigController.CollateralTokenConfig[] public collateralAssets;
}
