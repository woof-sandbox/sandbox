// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity 0.8.28;

import "./IConfigController.sol";
import { ICometStructures } from "./ICometStructures.sol";

/**
 * @title Compound's Comet Main Interface (without Ext)
 * @notice An efficient monolithic money market protocol
 * @author Compound
 */
interface ICometForController {
    function setRewards(address _rewards) external;

    function extractFees(address) external;

    function factoryInit(address, address) external;

    function initialize(IConfigController.CometConfig memory market, IConfigController.CometGlobalParamsConfig memory config) external;

    function pause(bool supplyPaused, bool transferPaused, bool withdrawPaused, bool absorbPaused, bool buyPaused) external;

    function initiateDeprecation() external;

    function withdrawFreeSeedReserves(uint256 amount) external;

    function getAssetInfoByAddress(address asset) external view returns (ICometStructures.CollateralAsset memory, uint8 index);

    function baseToken() external view returns (address);

    function numAssets() external view returns (uint8);

    function isDeprecated() external view returns (bool);

    function removalInProgress() external view returns (bool);

    function isTransitionActive() external view returns (bool);

    function MAX_ASSETS() external view returns (uint8);
    
    function addCollateralAsset(IConfigController.CollateralTokenConfig memory _assetConfig) external;
}
