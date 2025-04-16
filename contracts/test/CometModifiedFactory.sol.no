// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./CometModified.sol";
import "../CometConfiguration.sol";

contract CometModifiedFactory is CometConfiguration {
    function clone(Configuration calldata config) external returns (address) {
        return address(new CometModified(config));
    }
}