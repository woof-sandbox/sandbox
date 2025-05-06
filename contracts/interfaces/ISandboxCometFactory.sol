// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";
import "./ISandboxErrors.sol";

interface ISandboxCometFactory is ISandboxErrors {
    function initialize(address _cometImplementation, address _sandboxController) external;

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig
    ) external returns (address);
}
