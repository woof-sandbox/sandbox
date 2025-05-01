// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./IConfigController.sol";
import "./ISandboxErrors.sol";

interface ISandboxMarket is ISandboxErrors {
    error Locked(uint256 currrentTimestamp, uint256 unlockTimestamp);

    event MarketCreated(IConfigController.MarketConfig marketConfig);
    event CollateralConfigChanged(
        address indexed collateralToken,
        IConfigController.CollateralTokenConfig config
    );
    event Withdrawn(address indexed owner, uint256 amount);

    function initialize(
        address confiController,
        uint256 requiredAmount,
        uint256 lockDuration,
        IConfigController.MarketConfig memory _marketConfig
    ) external;

    function baseToken() external view returns (address);

    function getCollateralTokens() external view returns (address[] memory);

    function getCollateralTokenConfig(
        address _collateralToken
    ) external view returns (IConfigController.CollateralTokenConfig memory);

    function setBaseTokenConfig(
        IConfigController.BaseTokenConfig memory _config
    ) external;

    function setCollateralTokens(
        IConfigController.CollateralToken[] memory _collateralTokens
    ) external;

}