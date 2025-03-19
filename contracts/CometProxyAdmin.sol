// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ProxyAdminSandbox.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

interface Deployable {
  function deploy(address cometProxy) external returns (address);
}

contract CometProxyAdmin is ProxyAdminSandbox {

    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy
     *  Requirements:
     *   - This contract must be the admin of `CometProxy`
     */
    function deployAndUpgradeTo(Deployable configuratorProxy, ITransparentUpgradeableProxy cometProxy) public virtual onlyOwner {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        upgradeAndCall(cometProxy, newCometImpl, "");
    }

    /**
     * @dev Deploy a new Comet and upgrade the implementation of the Comet proxy, then call the function
     *  Requirements:
     *   - This contract must be the admin of `CometProxy`
     */
    function deployUpgradeToAndCall(Deployable configuratorProxy, ITransparentUpgradeableProxy cometProxy, bytes memory data) public virtual onlyOwner {
        address newCometImpl = configuratorProxy.deploy(address(cometProxy));
        upgradeAndCall(cometProxy, newCometImpl, data);
    }
}