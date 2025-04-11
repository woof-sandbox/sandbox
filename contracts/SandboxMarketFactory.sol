// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/ISandboxMarket.sol";
import "./interfaces/ISandboxMarketFactory.sol";

contract SandboxMarketFactory is ISandboxMarketFactory {
    address public configController;
    address public immutable implementation;
    address[] public markets;
    uint public lastMarket;
    

    constructor(address _marketImplementation) {
        implementation = _marketImplementation;
    }

    function initialize(
    ) external {
        configController = msg.sender;
    }

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        uint256 requiredAmount,
        uint256 lockDuration
    ) external override returns (address) {
        require(
            configController != address(0),
            MarketFactoryNotInitialized()
        );

        require(
            msg.sender == configController,
            Unauthorized()
        );
        
        address market = Clones.clone(implementation);
        ISandboxMarket(market).initialize(
            msg.sender,
            requiredAmount,
            lockDuration,
            _marketConfig
        );

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
