// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../CometSandbox.sol";

/**
 * @title A modified version of Compound Comet
 * @notice This is solely used for testing upgrades
 * @author Compound
 */
contract CometModified is CometSandbox {

    constructor(Configuration memory config) CometSandbox(config) {}

    /**
     * @notice Initialize storage for a liquidator
     * @dev Solely used for testing upgrades
     */
    function initialize(address liquidator) external {
        liquidatorPoints[liquidator].numAbsorbs = type(uint32).max;
    }

    function newFunction() external pure returns (int) {
        return 101;
    }
}
