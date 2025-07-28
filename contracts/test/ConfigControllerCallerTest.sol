// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerCallerTest is ConfigController {
    function addCollateralAsset(
        address _comet,
        CollateralTokenConfig memory _assetConfig
    ) external {
        ISandboxCometConfig(_comet).addCollateralAsset( _assetConfig);
    }
}