// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./IConfigController.sol";

interface IMarket {
    function initialize(IConfigController.MarketConfig memory _marketConfig) external;  

    function getCollateralTokenConfig(uint _collateralTokenId) external view returns (IConfigController.CollateralTokenConfig memory);

    function getMarketConfig() external view returns (IConfigController.MarketConfig memory);
}