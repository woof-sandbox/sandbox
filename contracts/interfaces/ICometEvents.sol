// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ICometStructures.sol";

interface ICometEvents is ICometStructures {
    event Supply(address indexed from, address indexed dst, uint256 amount);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Withdraw(address indexed src, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, address indexed asset, uint256 amount);
    event ApprovalAll(address indexed owner, address indexed spender, address indexed baseAsset, bool approval);

    event SupplyCollateral(address indexed from, address indexed dst, address indexed asset, uint256 amount);
    event TransferCollateral(address indexed from, address indexed to, address indexed asset, uint256 amount);
    event WithdrawCollateral(address indexed src, address indexed to, address indexed asset, uint256 amount);

    /// @notice Event emitted when a borrow position is absorbed by the protocol
    event AbsorbDebt(address indexed absorber, address indexed borrower, uint256 basePaidOut, uint256 usdValue);

    /// @notice Event emitted when a user's collateral is absorbed by the protocol
    event AbsorbCollateral(
        address indexed absorber,
        address indexed borrower,
        address indexed asset,
        uint256 collateralAbsorbed,
        uint256 usdValue
    );

    /// @notice Event emitted when a new collateral asset is added to the protocol
    event CollateralAssetAdded(
        address indexed collateralToken,
        uint64 scale,
        address priceFeed,
        uint64 borrowCollateralFactor,
        uint128 supplyCap,
        uint64 liquidateCollateralFactor,
        uint64 liquidationFactor
    );

    /// @notice Event emitted when a curve transition is started
    event CurveTransitionStarted(
        uint40 startTime,
        uint40 endTime,
        Curve startCurveParams,
        Curve targetCurveParams
    );

    /// @notice Event emitted when a collateral asset is purchased from the protocol
    event BuyCollateral(address indexed buyer, address indexed asset, uint256 baseAmount, uint256 collateralAmount);

    /// @notice Event emitted when fees are extracted either to DAO or to protocol
    event FeesExtracted(address indexed comet, address indexed asset, uint256 amoint, address to);

    /// @notice Event emitted when an action is paused/unpaused
    event PauseAction(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused);

    event ControllerFeeDisabled(bool disabled);

    /// @notice Event emitted when collateral removal is initiated
    event CollateralRemovalInitiated(uint8 indexed collateralAssetIndex, address indexed collateralToken, uint40 startTime, uint40 endTime);

    /// @notice Event emitted when collateral removal is finalized
    event CollateralRemovalFinalized(uint8 removedAssetIndex, address indexed removedAsset);
}
