// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/ISandboxCometFactory.sol";
import "./CometConfiguration.sol";
import "./CometInterface.sol";
import "./AssetListFactory.sol";

contract SandboxCometFactory is ISandboxCometFactory, CometConfiguration {
    address public configController;
    address public assetListFactory;
    address public cometImplementation;


    function initialize(address _cometImplementation) external {
        require(_cometImplementation != address(0), ZeroAddress());
        cometImplementation = _cometImplementation;
        configController = msg.sender;
        assetListFactory = address(new AssetListFactory());
    }

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory config,
        address governor,
        address dao,
        address pauseGuardian,
        uint256 baseBorrowMin
    ) external returns (address) {
        require(configController != address(0), MarketFactoryNotInitialized());
        require(msg.sender == configController, Unauthorized());
        address market = Clones.clone(cometImplementation);

        CometInterface(market).initialize(
            _marketConfig,
            config,
            assetListFactory,
            governor,
            dao,
            pauseGuardian,
            baseBorrowMin
        );

        CometInterface(market).initializeStorage();

        return market;
    }
}
