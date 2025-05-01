// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/ISandboxCometFactory.sol";
import "./interfaces/ISandboxComet.sol";

contract SandboxCometFactory is ISandboxCometFactory, Initializable {
    address public configController;
    address public cometImplementation;

    function initialize(address _cometImplementation) external initializer {
        require(_cometImplementation != address(0), ZeroAddress());
        cometImplementation = _cometImplementation;
        configController = msg.sender;
    }

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory config,
        address sandboxController,
        uint256 baseBorrowMin
    ) external returns (address) {
        require(configController != address(0), MarketFactoryNotInitialized());
        require(msg.sender == configController, Unauthorized());
        address market = Clones.clone(cometImplementation);

        ISandboxComet(market).initialize(
            _marketConfig,
            config,
            configController,
            sandboxController,
            baseBorrowMin
        );

        ISandboxComet(market).initializeStorage();

        return market;
    }
}
