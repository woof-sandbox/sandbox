// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/ISandboxCometFactory.sol";
import "./CometConfiguration.sol";
import "./AssetListFactory.sol";
import "./SandboxComet.sol";
import "hardhat/console.sol";
contract SandboxCometFactory is ISandboxCometFactory, CometConfiguration {
    address public configController;
    address public assetListFactory;
    address[] public markets;
    uint public lastMarket;

    function initialize() external {
        configController = msg.sender;
        assetListFactory = address(new AssetListFactory());
    }

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory config,
        address governor,
        address pauseGuardian,
        uint256 baseBorrowMin
    ) external returns (address) {
        require(configController != address(0), MarketFactoryNotInitialized());
        require(msg.sender == configController, Unauthorized());
            console.log("Creating market with config: ", _marketConfig.baseToken);
        address market = address(new SandboxComet(
            _marketConfig,
            config,
            assetListFactory,
            governor,
            pauseGuardian,
            baseBorrowMin
        ));

        console.log("Created market at: ", market);

        markets.push(market);

        lastMarket++;
        return market;
    }

    function getMarket(
        uint _marketId
    ) external view override returns (address) {
        return markets[_marketId];
    }
}
