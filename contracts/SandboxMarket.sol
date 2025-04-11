// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./interfaces/ISandboxMarket.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/IERC20NonStandard.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract SandboxMarket is ISandboxMarket, Initializable {
    address public owner;
    uint256 public seedReserves;
    uint256 public unlockTimestamp;

    address public baseToken;
    IConfigController.BaseTokenConfig public baseTokenConfig;
    address[] public collateralTokens;
    mapping(address => IConfigController.CollateralTokenConfig)
        public collateralConfigs;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner(msg.sender);
        _;
    }

    function initialize(
        address configController,
        uint256 requiredAmount,
        uint256 lockDuration,
        IConfigController.MarketConfig memory _marketConfig
    ) external initializer {
        owner = configController;
        baseToken = _marketConfig.baseToken;
        baseTokenConfig = _marketConfig.config;

        for (uint i = 0; i < _marketConfig.collateralTokens.length; i++) {
            address token = _marketConfig.collateralTokens[i].collateralToken;
            collateralTokens.push(token);
            collateralConfigs[token] = _marketConfig.collateralTokens[i].config;
        }

        seedReserves = requiredAmount;
        unlockTimestamp = block.timestamp + lockDuration;

        emit MarketCreated(_marketConfig);
    }

    function setBaseTokenConfig(
        IConfigController.BaseTokenConfig memory _config
    ) external onlyOwner {
        baseTokenConfig = _config;
    }

    function setCollateralTokens(
        IConfigController.CollateralToken[] memory _collateralTokens
    ) external onlyOwner {
        for (uint i = 0; i < _collateralTokens.length; i++) {
            address token = _collateralTokens[i].collateralToken;
            collateralTokens.push(token);
            collateralConfigs[token] = _collateralTokens[i].config;
        }
    }

    function withdraw() external onlyOwner {
        require(
            block.timestamp >= unlockTimestamp,
            Locked(block.timestamp, unlockTimestamp)
        );
        uint256 amount = seedReserves;
        seedReserves = 0;
        IERC20NonStandard(baseToken).transfer(owner, amount);
        emit Withdrawn(owner, amount);
    }

    function getCollateralTokens()
        external
        view
        override
        returns (address[] memory)
    {
        return collateralTokens;
    }

    function getCollateralTokenConfig(
        address token
    )
        external
        view
        override
        returns (IConfigController.CollateralTokenConfig memory)
    {
        return collateralConfigs[token];
    }
}
