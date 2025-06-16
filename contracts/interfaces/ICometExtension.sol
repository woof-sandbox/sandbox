// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../CometCore.sol";

/**
 * @title Compound's Comet Ext Interface
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
abstract contract ICometExtension is CometCore {
    struct Configuration {
        address configController;
        address baseToken;
        address baseTokenPriceFeed;
        address extensionDelegate;
        uint64 supplyKink;
        uint64 supplyPerYearInterestRateSlopeLow;
        uint64 supplyPerYearInterestRateSlopeHigh;
        uint64 supplyPerYearInterestRateBase;
        uint64 borrowKink;
        uint64 borrowPerYearInterestRateSlopeLow;
        uint64 borrowPerYearInterestRateSlopeHigh;
        uint64 borrowPerYearInterestRateBase;
        uint64 storeFrontPriceFactor;
        uint64 trackingIndexScale;
        uint64 baseTrackingSupplySpeed;
        uint64 baseTrackingBorrowSpeed;
        uint104 baseMinForRewards;
        uint104 baseBorrowMin;
        uint104 targetPercent;
        uint104 seedReserves;
        uint104 unlockTimestamp;
        CollateralAsset[] assetConfigs;
    }

    error BadAmount();
    error BadNonce();
    error BadSignatory();
    error InvalidValueS();
    error InvalidValueV();
    error SignatureExpired();
    error WrongToken(address token);
    error InvalidLength();

    function allowBySig(
        address owner,
        address manager,
        address asset,
        uint256 amount,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual;

    function collateralBalanceOf(
        address account,
        address asset
    ) external view virtual returns (uint256);

    function baseTrackingAccrued(
        address account
    ) external view virtual returns (uint64);

    function baseAccrualScale() external view virtual returns (uint64);

    function baseIndexScale() external view virtual returns (uint64);

    function factorScale() external view virtual returns (uint64);

    function maxAssets() external view virtual returns (uint8);

    function totalsBasic() external view virtual returns (TotalsBasic memory);

    function version() external view virtual returns (string memory);

    /**
     * ===== ERC20 interfaces =====
     * Does not include the following functions/events, which are defined in `CometMainInterface` instead:
     * - function decimals() virtual external view returns (uint8)
     * - function totalSupply() virtual external view returns (uint256)
     * - function transfer(address dst, uint amount) virtual external returns (bool)
     * - function transferFrom(address src, address dst, uint amount) virtual external returns (bool)
     * - function balanceOf(address owner) virtual external view returns (uint256)
     * - event Transfer(address indexed from, address indexed to, uint256 amount)
     */
    function name() external view virtual returns (string memory);

    /**
     * @notice Approve `spender` to transfer up to `amount` from `src`
     * @dev This will overwrite the approval amount for `spender`
     *  and is subject to issues noted [here](https://eips.ethereum.org/EIPS/eip-20#approve)
     * @param spender The address of the account which may transfer tokens
     * @param amount The number of tokens that are approved (-1 means infinite)
     * @return Whether or not the approval succeeded
     */
    function approve(
        address spender, address asset, uint256 amount
    ) external virtual returns (bool);

    function approveAll(address spender, uint256[] calldata amounts) external virtual returns (bool);

    /**
     * @notice Get the current allowance from `owner` for `spender`
     * @param owner The address of the account which owns the tokens to be spent
     * @param spender The address of the account which may transfer tokens
     * @return The number of tokens allowed to be spent (-1 means infinite)
     */
    // function allowance(
    //     address owner, address spender, address asset
    // ) external view virtual returns (uint256);

    event Approval(
        address indexed owner,
        address indexed spender,
        address indexed asset,
        uint256 amount
    );
}
