// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";

interface IMarketFactory {
    function createMarket(
        IConfigController.MarketConfig memory _marketConfig
    ) external returns (address);

    function getMarket(uint _mareketId) external view returns (address);
}