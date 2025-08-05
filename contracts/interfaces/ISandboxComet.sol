// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

import "./IConfigController.sol";
import { ICometStructures } from "./ICometStructures.sol";

/**
 * @title Compound's Comet Main Interface (without Ext)
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
interface ISandboxComet {
    function supply(address asset, uint256 amount) external;

    function supplyTo(address dst, address asset, uint256 amount) external;

    function supplyFrom(address from, address dst, address asset, uint256 amount) external;

    function repayAllFrom(address from, address dst) external;

    function transfer(address dst, uint256 amount) external returns (bool);

    function transferFrom(address src, address dst, uint256 amount) external returns (bool);

    function transferAllFrom(address src, address dst) external;

    function transferAssetFrom(address src, address dst, address asset, uint256 amount) external;

    function withdraw(address asset, uint256 amount) external;

    function withdrawTo(address to, address asset, uint256 amount) external;

    function withdrawFrom(address src, address to, address asset, uint256 amount) external;

    function withdrawAllFrom(address src, address to) external;

    function factoryInit(address, address) external;

    function initialize(IConfigController.CometConfig memory market, IConfigController.CometGlobalParamsConfig memory config) external;

    function absorb(address absorber, address[] calldata accounts) external;

    function quoteCollateral(address asset, uint baseAmount) external view returns (uint, uint, uint, uint);

    function getCollateralReserves(address asset) external view returns (uint);

    function getReserves() external view returns (int);

    function getPrice(address priceFeed) external view returns (uint);

    function isBorrowCollateralized(address account) external view returns (bool);

    function isLiquidatable(address account) external view returns (bool);

    function totalBorrow() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);

    function borrowBalanceOf(address account) external view returns (uint256);

    function setRewards(address _rewards) external;

    function buyCollateral(address asset, uint minAmount, uint baseAmount, address recipient) external;

    function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external;

    function extractFees(address) external;

    function isSupplyPaused() external view returns (bool);

    function isTransferPaused() external view returns (bool);

    function isWithdrawPaused() external view returns (bool);

    function isAbsorbPaused() external view returns (bool);

    function isBuyPaused() external view returns (bool);

    function accrueAccount(address account) external;

    function getSupplyRate(uint utilization) external view returns (uint64);

    function getBorrowRate(uint utilization) external view returns (uint64);

    function getUtilization() external view returns (uint);

    function targetReserves() external view returns (uint);

    function getAssetInfo(uint8 i) external view returns (ICometStructures.CollateralAsset memory);

    function getAssetInfoByAddress(address asset) external view returns (ICometStructures.CollateralAsset memory, uint8 index);
}
