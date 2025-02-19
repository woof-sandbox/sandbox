// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./CometWithExtendedAssetList.sol";
import "./CometConfiguration.sol";

contract CometFactoryWithExtendedAssetList is CometConfiguration {
    function clone(Configuration calldata config) external returns (address) {
        return address(new CometWithExtendedAssetList(config));
    }
}