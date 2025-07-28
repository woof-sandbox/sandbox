// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";
import { ICometStructures } from "./ICometStructures.sol";

/**
 * @title SandboxComet Interface For ConfigController
 * @notice Interface for the functions used by ConfigController to interact with SandboxComet
 * @author WOOF Software
 */
interface ISandboxCometConfig {
    /**
     * @notice Get the base token address of the comet
     * @return The address of the base token
     */
    function baseToken() external view returns (address);

    /**
     * @notice Get the current number of collateral assets in the comet
     * @return The number of collateral assets
     */
    function numAssets() external view returns (uint8);

    /**
     * @notice Get the maximum number of assets the comet can support
     * @return The maximum number of assets (24)
     */
    function MAX_ASSETS() external view returns (uint8);

    /**
     * @notice Get asset information by address
     * @param asset The address of the collateral asset
     * @return The collateral asset info and its index
     */
    function getAssetInfoByAddress(address asset) external view returns (ICometStructures.CollateralAsset memory, uint8 index);

    /**
     * @notice Initialize a newly created comet with configuration
     * @param market The comet configuration including base token and collateral tokens
     * @param config The global parameters configuration
     */
    function initialize(IConfigController.CometConfig memory market, IConfigController.CometGlobalParamsConfig memory config) external;

    /**
     * @notice Extract fees from the comet for a specific asset
     * @param asset The asset to extract fees from
     */
    function extractFees(address asset) external;

    /**
     * @notice Add a new collateral asset to the comet
     * @param collateralTokenConfig The configuration for the new collateral asset
     */
    function addCollateralAsset(IConfigController.CollateralTokenConfig calldata collateralTokenConfig) external;

    /**
     * @notice Initiate a collateral removal process
     * @param collateralAsset The address of the collateral asset to remove
     */
    function initiateCollateralRemoval(address collateralAsset) external;
}
