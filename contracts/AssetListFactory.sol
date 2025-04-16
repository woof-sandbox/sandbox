// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./AssetList.sol";
import "./interfaces/IConfigController.sol";


/**
 * @title Compound's Asset List Factory
 * @author Compound
 */
contract AssetListFactory {
    event AssetListCreated(address indexed assetList, IConfigController.CollateralToken[] assetConfigs);

    /**
     * @notice Create a new asset list
     * @param assetConfigs The asset configurations
     * @return assetList The address of the new asset list
     */
    function createAssetList(IConfigController.CollateralToken[] memory assetConfigs) external returns (address assetList) {
        assetList = address(new AssetList(assetConfigs));
        emit AssetListCreated(assetList, assetConfigs);
    }
}