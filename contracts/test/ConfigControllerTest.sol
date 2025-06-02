// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerTest is ConfigController {
    function reinitializeComet(address _comet, CometConfig memory _cometConfig) external {

        ISandboxController.SandboxControllerConfiguration memory _sandboxConfig = ISandboxController(sandboxController).config();
        ISandboxComet(_comet).initialize(
            _cometConfig,
            _sandboxConfig,
            ISandboxController(sandboxController).baseAssets(_cometConfig.baseToken).minBorrow
        );
    }
}