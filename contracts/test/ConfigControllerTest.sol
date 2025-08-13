// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { ConfigController } from "contracts/ConfigController.sol";
import { ISandboxComet } from "contracts/interfaces/ISandboxComet.sol";

contract ConfigControllerTest is ConfigController {
    function initiateCurveTransitionOnComet(address comet, uint8 curveId) external {
        ISandboxComet(comet).initiateCurveTransition(curveId);
    }

    function initiateCollateralRemovalOnComet(address comet, address collateralAsset) external {
        ISandboxComet(comet).initiateCollateralRemoval(collateralAsset);
    }

    function initiateDeprecationMarket(address comet) external {
        ISandboxComet(comet).initiateDeprecation();
    }
}
