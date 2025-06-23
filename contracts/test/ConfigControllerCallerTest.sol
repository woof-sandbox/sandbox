// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerCallerTest is ConfigController {
    function reinitializeComet(address _comet, CometConfig memory _cometConfig) external {

        ISandboxController.SandboxControllerConfiguration memory _sandboxConfig = ISandboxController(sandboxController).config();
        CometGlobalParamsConfig memory _globalConfig = CometGlobalParamsConfig(
            _sandboxConfig.targetPercent,
            _sandboxConfig.storeFrontPriceFactor,
            _sandboxConfig.suggestedAmountOfSeedReserves,
            _sandboxConfig.suggestedLockTimeOfSeedReserves
        );
        ISandboxComet(_comet).initialize(_cometConfig, _globalConfig);
    }

    function addCollateralAsset(
        address _comet,
        CollateralTokenConfig memory _assetConfig
    ) external {
        ISandboxComet(_comet).addCollateralAsset( _assetConfig);
    }
}