// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./CometSandbox.sol";
import "./CometConfiguration.sol";

contract CometSandboxFactory is CometConfiguration {
    function clone(Configuration calldata config) external returns (address) {
        return address(new CometSandbox(config));
    }
}