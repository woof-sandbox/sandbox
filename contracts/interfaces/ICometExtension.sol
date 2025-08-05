// SPDX-License-Identifier: GPL-2.0-or-later
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
        uint104 baseBorrowMin;
        uint64 targetPercent;
        uint104 seedReserves;
        uint64 unlockTimestamp;
        CollateralAsset[] assetConfigs;
    }

    // 512 bits total = 2 slots
    struct TotalsBasic {
        // Slot 1
        uint104 totalSupplyBase; // aderyn-fp(local-variable-shadowing)
        uint104 totalBorrowBase; // aderyn-fp(local-variable-shadowing)
        uint40 lastAccrualTime; // aderyn-fp(local-variable-shadowing)
        uint8 pauseFlags; // aderyn-fp(local-variable-shadowing)
        // Slot 2
        uint64 baseSupplyIndex; // aderyn-fp(local-variable-shadowing)
        uint64 baseBorrowIndex; // aderyn-fp(local-variable-shadowing)
    }

    error BadAmount();
    error BadNonce();
    error BadSignatory();
    error InvalidValueS();
    error InvalidValueV();
    error SignatureExpired();
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

    function allowAllBySig(
        address owner,
        address manager,
        bool approved,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external virtual;

    function collateralBalanceOf(address account, address asset) external view virtual returns (uint256);

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
     * @param amount The number of tokens that are approved
     */
    function approve(address spender, address asset, uint256 amount) external virtual;

    /**
     * @notice Approve `spender` to transfer up to `baseTokenAmount` from `src`
     *  and `amounts` from each collateral asset
     * @dev This will overwrite the approval amount for `spender`
     * @param spender The address of the account which may operate the tokens
     * @param baseTokenAmount The number of base tokens that are approved
     * @param amounts The number of collateral tokens that are approved
     * @notice The order list of collateral assets must match the order of `collateralAssets`
     */
    function approveAllTokens(address spender, uint256 baseTokenAmount, uint256[] calldata amounts) external virtual;

    /**
     * @notice Single time approve for the whole balance of the base asset
     * @param spender The spender of the baseToken balance
     * @param approved Flag to set
     */
    function approveAll(address spender, bool approved) external virtual;
}
