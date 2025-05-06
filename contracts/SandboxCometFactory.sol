// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "./interfaces/ISandboxCometFactory.sol";
import "./interfaces/ISandboxComet.sol";
import "./interfaces/IERC20NonStandard.sol";
import "./CometExtension.sol";

contract SandboxCometFactory is ISandboxCometFactory, Initializable {

    address public configController;
    address public sandboxController;
    address public cometImplementation;

    function initialize(address _cometImplementation, address _sanboxController) external initializer {
        require(_cometImplementation != address(0), ZeroAddress());
        cometImplementation = _cometImplementation;
        sandboxController = _sanboxController;
        configController = msg.sender;
    }

    function createMarket(
        IConfigController.MarketConfig memory _marketConfig
    ) external returns (address) {
        require(configController != address(0), MarketFactoryNotInitialized());
        require(msg.sender == configController, Unauthorized());
        address market = Clones.clone(cometImplementation);
        CometExtension ext = new CometExtension(bytes32(0), bytes32(0));

        ISandboxController.SandboxControllerConfiguration memory config = ISandboxController(sandboxController).config();

        IERC20NonStandard(_marketConfig.baseToken).transferFrom(
            msg.sender,
            address(this),
            config.suggestedAmountOfSeedReserves
        );

        IERC20NonStandard(_marketConfig.baseToken).approve(
            market,
            config.suggestedAmountOfSeedReserves
        );

        ISandboxComet(market).supply(_marketConfig.baseToken, config.suggestedAmountOfSeedReserves);

        ISandboxComet(market).initialize(
            _marketConfig,
            config,
            configController,
            sandboxController,
            address(ext),
            ISandboxController(sandboxController).baseAssets(_marketConfig.baseToken).minBorrow
        );

        ISandboxComet(market).initializeStorage();

        return market;
    }
}
