// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/ISandboxMarket.sol";
import "./interfaces/ISandboxMarketFactory.sol";


contract SandboxMarketFactory is ISandboxMarketFactory {
    address public immutable implementation;
    address[] public markets;
    uint public lastMarket;

    constructor(address _marketImplementation) {
        implementation = _marketImplementation;
    }

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig
    ) external override returns (address) {
        address market = Clones.clone(implementation);
        ISandboxMarket(market).initialize(_marketConfig);
        
        markets.push(market);
        lastMarket++;

        return market;
    }

    function getMarket(uint _marketId) external view override returns (address) {
        return markets[_marketId];
    }
}