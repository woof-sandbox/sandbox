// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

interface ICometEvents {
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

    /// @notice Event emitted when a collateral asset is purchased from the protocol
    event BuyCollateral(address indexed buyer, address indexed asset, uint256 baseAmount, uint256 collateralAmount);

    /// @notice Event emitted when fees are extracted either to DAO or to protocol
    event FeesExtracted(address indexed comet, address indexed asset, uint256 amount, address to);

    /// @notice Event emitted when fees are collected from a transaction
    event FeesCollected(address baseToken, uint256 reserveFee, uint256 protocolFee, uint256 controllerFee);

    /// @notice Event emitted when an action is paused/unpaused
    event PauseAction(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused);

    event ControllerFeeDisabled(bool disabled);
}
