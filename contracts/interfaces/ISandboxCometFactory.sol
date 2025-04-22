// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";
import "./ISandboxErrors.sol";

interface ISandboxCometFactory is ISandboxErrors {
    function initialize(address _cometImplementation) external;

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory config,
        address governor_,
        address dao_,
        address pauseGuardian_,
        uint256 baseBorrowMin
    ) external returns (address);
}
