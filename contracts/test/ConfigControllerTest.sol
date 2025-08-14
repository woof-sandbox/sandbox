// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerTest is ConfigController {
    function initiateDeprecationMarket(address comet) external {
        ICometForController(comet).initiateDeprecation();
    }
}
