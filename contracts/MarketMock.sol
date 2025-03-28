// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./interfaces/IMarket.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract MarketMock is IMarket, Initializable {
    IConfigController.MarketConfig public marketConfig; 
    
    constructor() {}

    function initialize(IConfigController.MarketConfig memory _marketConfig) initializer external override {
        marketConfig = _marketConfig;
    }

    function getMarketConfig() external view returns (IConfigController.MarketConfig memory) {
        return marketConfig;
    }
    
    function getCollateralTokenConfig(uint _collateralTokenId) external view override returns (IConfigController.CollateralTokenConfig memory) {
        return marketConfig.collateraTokens[_collateralTokenId];
    }
} 