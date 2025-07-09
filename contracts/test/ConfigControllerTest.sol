// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "../ConfigController.sol";

/**
 * @title ConfigController for testing purposes
 */
contract ConfigControllerTest is ConfigController {
    function initiateCollateralRemovalOnComet(address _comet, address _collateralAsset) external {
        ISandboxComet(_comet).initiateCollateralRemoval(_collateralAsset);
    }
}
