// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../CometCore.sol";
import "./IConfigController.sol";
import "./ISandboxController.sol";

/**
 * @title Compound's Comet Main Interface (without Ext)
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
abstract contract ISandboxComet is CometCore {
    function supply(address asset, uint256 amount) external virtual;

    function supplyTo(address dst, address asset, uint256 amount) external virtual;

    function supplyFrom(address from, address dst, address asset, uint256 amount) external virtual;

    function transfer(address dst, uint256 amount) external virtual returns (bool);

    function transferFrom(address src, address dst, uint256 amount) external virtual returns (bool);

    function transferAsset(address dst, address asset, uint256 amount) external virtual;

    function transferAssetFrom(address src, address dst, address asset, uint256 amount) external virtual;

    function withdraw(address asset, uint256 amount) external virtual;

    function withdrawTo(address to, address asset, uint256 amount) external virtual;

    function withdrawFrom(address src, address to, address asset, uint256 amount) external virtual;

    function factoryInit(address, address) external virtual;

    function initialize(
        IConfigController.CometConfig memory market,
        IConfigController.CometGlobalParamsConfig memory config
    ) external virtual;

    function absorb(address absorber, address[] calldata accounts) external virtual;

    function buyCollateral(address asset, uint minAmount, uint baseAmount, address recipient) external virtual;

    function quoteCollateral(address asset, uint baseAmount) public view virtual returns (uint, uint, uint, uint);

    function getCollateralReserves(address asset) public view virtual returns (uint);

    function getReserves() public view virtual returns (int);

    function getPrice(address priceFeed) public view virtual returns (uint);

    function isBorrowCollateralized(address account) public view virtual returns (bool);

    function isLiquidatable(address account) public view virtual returns (bool);

    function totalBorrow() external view virtual returns (uint256);

    function balanceOf(address owner) public view virtual returns (uint256);

    function borrowBalanceOf(address account) public view virtual returns (uint256);

    function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external virtual;

    function extractFees(address) external virtual;

    function isSupplyPaused() public view virtual returns (bool);

    function isTransferPaused() public view virtual returns (bool);

    function isWithdrawPaused() public view virtual returns (bool);

    function isAbsorbPaused() public view virtual returns (bool);

    function isBuyPaused() public view virtual returns (bool);

    function accrueAccount(address account) external virtual;

    function getSupplyRate(uint utilization) public view virtual returns (uint64);

    function getBorrowRate(uint utilization) public view virtual returns (uint64);

    function getUtilization() public view virtual returns (uint);

    function targetReserves() external view virtual returns (uint);

    function initiateDeprecation() external virtual;

    function withdrawSurplusSeedReserves() external virtual;

    function withdrawSurplusCollateralReserves(address[] calldata assets) external virtual;

    function withdrawFreeSeedReserves(uint256 amount) external virtual;
}
