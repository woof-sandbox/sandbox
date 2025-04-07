// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./IMarket.sol";
import "./IMarketFactory.sol";

contract MarketFactory is IMarketFactory {
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
        markets.push(market);
        IMarket(market).initialize(_marketConfig, msg.sender);
        lastMarket++;
        return market;
    }

    function getMarket(uint _marketId) external view override returns (address) {
        return markets[_marketId];
    }
}