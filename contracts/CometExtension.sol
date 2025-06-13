// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./interfaces/ICometExtension.sol";

contract CometExtension is ICometExtension {
    /** Public constants **/
    /// @notice The major version of this contract
    string public override constant version = "0";

    /** Internal constants **/
    /// @dev The EIP-712 typehash for the contract's domain
    bytes32 internal constant DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    /// @dev The EIP-712 typehash for allowBySig Authorization
    bytes32 internal constant AUTHORIZATION_TYPEHASH = keccak256(
        "Authorization(address owner,address manager,address asset,uint256 amount,uint256 nonce,uint256 expiry)"
    );

    /// @dev The highest valid value for s in an ECDSA signature pair (0 < s < secp256k1n ÷ 2 + 1)
    ///  See https://ethereum.github.io/yellowpaper/paper.pdf #307)
    uint internal constant MAX_VALID_ECDSA_S = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;
    
    /// @dev The name of the SandboxComet
    bytes32 internal immutable name32;
    
    /**
     * @notice Construct a new protocol instance
     * @param _name32 The name of the SandboxComet
     **/
    constructor(bytes32 _name32) {
        name32 = _name32;
    }

    /** External getters for internal constants **/
    function baseAccrualScale() override external pure returns (uint64) { return BASE_ACCRUAL_SCALE; }
    function baseIndexScale() override external pure returns (uint64) { return BASE_INDEX_SCALE; }
    function factorScale() override external pure returns (uint64) { return FACTOR_SCALE; }
    function maxAssets() override external pure returns (uint8) { return MAX_ASSETS; }

    /**
     * @notice Aggregate variables tracked for the entire market
     **/
    function totalsBasic() public override view returns (TotalsBasic memory) {
        return TotalsBasic({
            baseSupplyIndex: baseSupplyIndex,
            baseBorrowIndex: baseBorrowIndex,
            trackingSupplyIndex: trackingSupplyIndex,
            trackingBorrowIndex: trackingBorrowIndex,
            totalSupplyBase: totalSupplyBase,
            totalBorrowBase: totalBorrowBase,
            lastAccrualTime: lastAccrualTime,
            pauseFlags: pauseFlags
        });
    }

    /**
     * @notice Get the name of the SandboxComet
     * @return The name as a string
     */
    function name() override public view returns (string memory) {
        uint8 i;
        for (i = 0; i < 32; ) {
            if (name32[i] == 0) break;
            unchecked { i++; }
        }
        bytes memory name_ = new bytes(i);
        for (uint8 j = 0; j < i; ) {
            name_[j] = name32[j];
            unchecked { j++; }
        }
        return string(name_);
    }

    /**
     * @notice Query the current collateral balance of an account
     * @param account The account whose balance to query
     * @param asset The collateral asset to check the balance for
     * @return The collateral balance of the account
     */
    function collateralBalanceOf(address account, address asset) override external view returns (uint256) {
        return userCollateral[account][asset];
    }

    /**
     * @notice Query the total accrued base rewards for an account
     * @param account The account to query
     * @return The accrued rewards, scaled by `BASE_ACCRUAL_SCALE`
     */
    function baseTrackingAccrued(address account) override external view returns (uint64) {
        return userBasic[account].baseTrackingAccrued;
    }

    /**
     * @notice Approve a spender to transfer a specific amount of an asset on behalf of the sender
     * @param spender The address of the account which may transfer tokens
     * @param asset The address of the asset being approved
     * @param amount The amount of the asset that the spender is allowed to manage
     * @return Whether or not the approval change succeeded
     */
    function approve(address spender, address asset, uint256 amount) override external returns (bool) {
        allowInternal(msg.sender, spender, asset, amount);
        return true;
    }

    /**
     * @notice Approve a spender to transfer multiple amounts of assets on behalf of the sender
     * @note This function assumes that the first asset is the baseToken and the rest are collateral assets
     * @param spender The address of the account which may transfer tokens
     * @param amounts The amounts of each asset that the spender is allowed to manage
     * @dev Note: The first amount corresponds to the baseToken, followed by each collateral asset in order
     * @dev The length of the amounts array must match the number of assets (baseToken + collateralAssets)
     * @return Whether or not the approval change succeeded
     */
    function approveAll(address spender, uint256[] calldata amounts) override external returns (bool) {
        uint256 len = collateralAssets.length + 1; // +1 for baseToken
        if (len != amounts.length) revert InvalidLength();
        for (uint256 i = 0; i < len; i++) {
            address asset = i == 0 ? baseToken : collateralAssets[i - 1].collateralToken;
            allowInternal(msg.sender, spender, asset, amounts[i]);
        }
        return true;
    }

    /**
     * @notice Sets authorization status for a manager via signature from signatory
     * @param owner The address that signed the signature
     * @param manager The address to authorize (or rescind authorization from)
     * @param asset The asset for which the authorization applies (must be baseToken or a collateral asset)
     * @param amount The amount of the asset that the manager is allowed to manage
     * @param nonce The next expected nonce value for the signatory
     * @param expiry Expiration time for the signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
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
    ) override external {
        if (uint256(s) > MAX_VALID_ECDSA_S) revert InvalidValueS();
        // v ∈ {27, 28} (source: https://ethereum.github.io/yellowpaper/paper.pdf #308)
        if (v != 27 && v != 28) revert InvalidValueV();
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes(name())),
                keccak256(bytes(version)),
                block.chainid,
                address(this)
            )
        );
        bytes32 structHash = keccak256(abi.encode(AUTHORIZATION_TYPEHASH, owner, manager, asset, amount, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        if (signatory == address(0)) revert BadSignatory();
        if (owner != signatory) revert BadSignatory();
        if (nonce != userNonce[signatory]++) revert BadNonce();
        if (block.timestamp >= expiry) revert SignatureExpired();
        allowInternal(signatory, manager, asset, amount);
    }


    /// @notice Returns the current configuration of the market
    /// @return Configuration struct containing all market parameters
    function getConfiguration() external view returns (Configuration memory) {
        return
            Configuration({
                configController: configController,
                baseToken: baseToken,
                baseTokenPriceFeed: baseTokenPriceFeed,
                extensionDelegate: address(0), // Not implemented in this version
                supplyKink: uint64(supplyKink),
                supplyPerYearInterestRateSlopeLow: uint64(
                    supplyPerSecondInterestRateSlopeLow * SECONDS_PER_YEAR
                ),
                supplyPerYearInterestRateSlopeHigh: uint64(
                    supplyPerSecondInterestRateSlopeHigh * SECONDS_PER_YEAR
                ),
                supplyPerYearInterestRateBase: uint64(
                    supplyPerSecondInterestRateBase * SECONDS_PER_YEAR
                ),
                borrowKink: uint64(borrowKink),
                borrowPerYearInterestRateSlopeLow: uint64(
                    borrowPerSecondInterestRateSlopeLow * SECONDS_PER_YEAR
                ),
                borrowPerYearInterestRateSlopeHigh: uint64(
                    borrowPerSecondInterestRateSlopeHigh * SECONDS_PER_YEAR
                ),
                borrowPerYearInterestRateBase: uint64(
                    borrowPerSecondInterestRateBase * SECONDS_PER_YEAR
                ),
                storeFrontPriceFactor: uint64(storeFrontPriceFactor),
                trackingIndexScale: uint64(trackingIndexScale),
                baseTrackingSupplySpeed: uint64(baseTrackingSupplySpeed),
                baseTrackingBorrowSpeed: uint64(baseTrackingBorrowSpeed),
                baseMinForRewards: uint104(baseMinForRewards),
                baseBorrowMin: uint104(baseBorrowMin),
                targetPercent: uint104(targetPercent),
                seedReserves: uint104(seedReserves),
                unlockTimestamp: uint104(unlockTimestamp),
                assetConfigs: collateralAssets
            });
    }

    /**
     * @dev Allows a manager to spend an owner's allowance on a specific asset
     * @param owner The owner of the assets
     * @param manager The manager account
     * @param asset The asset being spent
     * @param amount The amount to spend
     */
    function allowInternal(address owner, address manager, address asset, uint256 amount) internal {
        uint8 index = collateralAssetIndex[asset];
        if (asset != baseToken && (collateralAssets[index].collateralToken != asset)) revert WrongToken(asset);
        unchecked {   
            allowance[owner][manager][asset] = amount;
        }
        emit Approval(owner, manager, asset, amount);
    }
}