// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./IConfigController.sol";
import "./ISandboxErrors.sol";

interface ISandboxMarket is ISandboxErrors {

    event MarketCreated(IConfigController.MarketConfig marketConfig);
    event CollateralConfigChanged(address indexed collateralToken, IConfigController.CollateralTokenConfig config);

    function initialize(IConfigController.MarketConfig memory _marketConfig) external; 

    function baseToken() external view returns (address);

    function priceFeed() external view returns (address); 

    function getCollateralTokens() external view returns (address[] memory);
    
    function getCollateralTokenConfig(address _collateralToken) external view returns (IConfigController.CollateralTokenConfig memory);
}