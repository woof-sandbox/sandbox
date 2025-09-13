// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ICometExtension } from "contracts/interfaces/internal/ICometExtension.sol";

contract CometExtension is ICometExtension {
    /** Public constants **/
    /// @notice The major version of this contract
    string public constant override version = "0";

    /** Internal constants **/
    /// @dev The EIP-712 typehash for the contract's domain
    bytes32 internal constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    /// @dev The EIP-712 typehash for allowBySig Authorization
    bytes32 internal constant AUTHORIZATION_TYPEHASH =
        keccak256("Authorization(address owner,address manager,address asset,uint256 amount,uint256 nonce,uint256 expiry)");

    /// @dev The EIP-712 typehash for allowAllBySig Authorization
    bytes32 internal constant AUTHORIZATION_ALL_TYPEHASH =
        keccak256("AuthorizationAll(address owner,address manager,bool approved,uint256 nonce,uint256 expiry)");

    /// @dev The highest valid value for s in an ECDSA signature pair (0 < s < secp256k1n ÷ 2 + 1)
    ///  See https://ethereum.github.io/yellowpaper/paper.pdf #307)
    uint256 internal constant MAX_VALID_ECDSA_S = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    uint8 internal constant NAME_LENGTH = 32;

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
    function baseAccrualScale() external pure override returns (uint64) {
        return BASE_ACCRUAL_SCALE;
    }

    function baseIndexScale() external pure override returns (uint64) {
        return BASE_INDEX_SCALE;
    }

    function factorScale() external pure override returns (uint64) {
        return FACTOR_SCALE;
    }

    function maxAssets() external pure override returns (uint8) {
        return MAX_ASSETS;
    }

    /**
     * @notice Aggregate variables tracked for the entire market
     **/
    function totalsBasic() public view override returns (TotalsBasic memory) {
        return
            TotalsBasic({
                totalSupplyBase: totalSupplyBase,
                totalBorrowBase: totalBorrowBase,
                lastAccrualTime: lastAccrualTime,
                pauseFlags: pauseFlags,
                baseSupplyIndex: baseSupplyIndex,
                baseBorrowIndex: baseBorrowIndex
            });
    }

    /**
     * @notice Get the name of the SandboxComet
     * @return The name as a string
     */
    function name() public view override returns (string memory) {
        uint8 i;
        for (i = 0; i < NAME_LENGTH; ) {
            if (name32[i] == 0) break;
            unchecked {
                i++;
            }
        }
        bytes memory name_ = new bytes(i);
        for (uint8 j = 0; j < i; ) {
            name_[j] = name32[j];
            unchecked {
                j++;
            }
        }
        return string(name_);
    }

    /**
     * @notice Approve or disallow `spender` to transfer on sender's behalf
     * @dev Note: this binary approval is unlike most other ERC20 tokens
     * @dev Note: this grants full approval for spender to manage *all* the owner's assets
     * @param spender The address of the account which may transfer tokens
     * @param asset The address of the asset being approved
     * @param amount The amount of the asset that the spender is allowed to manage
     */
    function approve(address spender, address asset, uint256 amount) external override {
        allowInternal(msg.sender, spender, asset, amount);
    }

    /**
     * @notice Approve a spender to transfer multiple amounts of assets on behalf of the sender
     * @param spender The address of the account which may transfer tokens
     * @param baseTokenAmount The amount of the base token that the spender is allowed to manage
     * @param amounts The amounts of each collateral asset that the spender is allowed to manage
     * @dev The length of `amounts` must match the number of collateral assets
     * @dev Collateral assets are ordered by their index in the `collateralAssets` array
     */
    function approveAllTokens(address spender, uint256 baseTokenAmount, uint256[] calldata amounts) external override {
        uint256 len = collateralAssets.length;
        if (len != amounts.length) revert InvalidLength();

        allowInternal(msg.sender, spender, baseToken, baseTokenAmount);

        for (uint256 i = 0; i < len; i++) {
            address asset = collateralAssets[i].collateralToken;
            allowInternal(msg.sender, spender, asset, amounts[i]);
        }
    }

    /**
     * @notice Approve or revoke the ability for a spender to transfer all base tokens
     * @param spender The address of the account which may transfer all base tokens
     * @param approved Whether the spender is approved or revoked
     */
    function approveAll(address spender, bool approved) external override {
        allowAllInternal(msg.sender, spender, approved);
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
    ) external override {
        if (uint256(s) > MAX_VALID_ECDSA_S) revert InvalidValueS();
        // v ∈ {27, 28} (source: https://ethereum.github.io/yellowpaper/paper.pdf #308)
        if (v != 27 && v != 28) revert InvalidValueV();
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name())), keccak256(bytes(version)), block.chainid, address(this))
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

    /**
     * @notice Sets authorization status for a manager via signature from signatory
     * @param owner The address that signed the signature
     * @param manager The address to authorize (or rescind authorization from)
     * @param approved Whether the manager is approved or revoked
     * @param nonce The next expected nonce value for the signatory
     * @param expiry Expiration time for the signature
     * @param v The recovery byte of the signature
     * @param r Half of the ECDSA signature pair
     * @param s Half of the ECDSA signature pair
     */
    function allowAllBySig(
        address owner,
        address manager,
        bool approved,
        uint256 nonce,
        uint256 expiry,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        if (uint256(s) > MAX_VALID_ECDSA_S) revert InvalidValueS();
        // v ∈ {27, 28} (source: https://ethereum.github.io/yellowpaper/paper.pdf #308)
        if (v != 27 && v != 28) revert InvalidValueV();
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name())), keccak256(bytes(version)), block.chainid, address(this))
        );
        bytes32 structHash = keccak256(abi.encode(AUTHORIZATION_ALL_TYPEHASH, owner, manager, approved, nonce, expiry));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        if (signatory == address(0)) revert BadSignatory();
        if (owner != signatory) revert BadSignatory();
        if (nonce != userNonce[signatory]++) revert BadNonce();
        if (block.timestamp >= expiry) revert SignatureExpired();
        allowAllInternal(signatory, manager, approved);
    }

    /**
     * @notice Sets the rewards contract for a comet
     * @param _rewards The address of the rewards contract to set
     */
    // aderyn-fp-next-line(state-change-without-event)
    function setRewards(address _rewards) external {
        if (msg.sender != configController) revert Unauthorized();

        /// @dev: Can be set as zero address to disable rewards
        rewardAddress = _rewards; // aderyn-fp(state-no-address-check)

        /// @dev: event is emitted in config controller
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
                supplyKink: supplyKink,
                supplyPerYearInterestRateSlopeLow: supplyPerSecondInterestRateSlopeLow * SECONDS_PER_YEAR,
                supplyPerYearInterestRateSlopeHigh: supplyPerSecondInterestRateSlopeHigh * SECONDS_PER_YEAR,
                supplyPerYearInterestRateBase: supplyPerSecondInterestRateBase * SECONDS_PER_YEAR,
                borrowKink: borrowKink,
                borrowPerYearInterestRateSlopeLow: borrowPerSecondInterestRateSlopeLow * SECONDS_PER_YEAR,
                borrowPerYearInterestRateSlopeHigh: borrowPerSecondInterestRateSlopeHigh * SECONDS_PER_YEAR,
                borrowPerYearInterestRateBase: borrowPerSecondInterestRateBase * SECONDS_PER_YEAR,
                storeFrontPriceFactor: storeFrontPriceFactor,
                baseBorrowMin: uint104(baseBorrowMin),
                targetPercent: targetPercent,
                seedReserves: safe104(seedReserves),
                unlockTimestamp: unlockTimestamp,
                assetConfigs: collateralAssets
            });
    }
}
