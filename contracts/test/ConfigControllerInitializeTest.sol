// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerInitializeTest is ConfigController {
    function reinitializeComet(address _comet, CometConfig memory _cometConfig) external {
        ISandboxController.SandboxControllerConfiguration memory _sandboxConfig = ISandboxController(sandboxController).config();
        CometGlobalParamsConfig memory _globalConfig = CometGlobalParamsConfig(
            _sandboxConfig.targetPercent,
            _sandboxConfig.storeFrontPriceFactor,
            _sandboxConfig.suggestedAmountOfSeedReserves,
            _sandboxConfig.suggestedLockTimeOfSeedReserves,
            _sandboxConfig.transitionDuration
        );
        ISandboxCometConfig(_comet).initialize(_cometConfig, _globalConfig);
    }
}
