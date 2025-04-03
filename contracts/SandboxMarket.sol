// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./interfaces/ISandboxMarket.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";


contract SandboxMarket is ISandboxMarket, Initializable {

    address public owner;
    address public baseToken;
    address public priceFeed;

    address[] public collateralTokens;

    mapping(address => IConfigController.CollateralTokenConfig) public collateralConfigs;

    constructor() {}

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    function initialize(IConfigController.MarketConfig memory _marketConfig) initializer external override {
        owner = msg.sender;
        baseToken = _marketConfig.baseToken;
        priceFeed = _marketConfig.priceFeed;
        for (uint i = 0; i < _marketConfig.collateralTokens.length; i++) {
            address collateralToken = _marketConfig.collateralTokens[i].collateralToken;
            collateralTokens.push(collateralToken);
            collateralConfigs[collateralToken] = _marketConfig.collateralTokens[i].config;
        }
        emit MarketCreated(_marketConfig);
    }

    function setCollateralConfig(address _collateralToken, IConfigController.CollateralTokenConfig memory _collateralTokenConfig) external onlyOwner {
        collateralConfigs[_collateralToken] = _collateralTokenConfig;
        emit CollateralConfigChanged(_collateralToken, _collateralTokenConfig);
    }

    function getCollateralTokens() external view override returns (address[] memory) {
        return collateralTokens;
    }

    function getCollateralTokenConfig(address _collateralToken) external view override returns (IConfigController.CollateralTokenConfig memory) {
        return collateralConfigs[_collateralToken];
    }
} 