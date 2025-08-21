// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

interface ICometForControllerPause {
    function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external;
}

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerPause is ConfigController {
    function pauseMarket(
        address comet,
        bool supplyPaused,
        bool transferPaused,
        bool withdrawPaused,
        bool absorbPaused,
        bool buyPaused
    ) external onlyOwner {
        ICometForControllerPause(comet).pause(supplyPaused, transferPaused, withdrawPaused, absorbPaused, buyPaused);
    }
}
