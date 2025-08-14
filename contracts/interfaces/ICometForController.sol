// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

import "./IConfigController.sol";

/**
 * @title Compound's Comet Main Interface (without Ext)
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
interface ICometForController {
    function setRewards(address _rewards) external;

    function extractFees(address) external;

    function factoryInit(address, address) external;

    function initialize(IConfigController.CometConfig memory market, IConfigController.CometGlobalParamsConfig memory config) external;

    function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external;

    function initiateDeprecation() external;

    function withdrawFreeSeedReserves(uint256 amount) external;
}
