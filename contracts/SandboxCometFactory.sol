// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/ISandboxCometFactory.sol";
import "./interfaces/ISandboxComet.sol";
import "./interfaces/ISandboxController.sol";
import "./interfaces/IConfigController.sol";
import "./CometExtension.sol";


/**
 * @title SandboxCometFactory
 * @notice Factory contract for creating new market instances using the clone pattern
 * @dev This contract uses OpenZeppelin's Clones library to create gas-efficient market instances
 */
contract SandboxCometFactory is ISandboxCometFactory {
    /// @notice The implementation address used for cloning new markets
    address public immutable override cometImplementation;

    /// @notice The address of the config controller factory
    address public immutable override configControllerFactory;

    /// @notice The address of the sandbox controller
    address public immutable override sandboxController;

    /// @notice Array of all created market addresses
    address[] public override markets;

    /**
     * @notice Constructs a new SandboxCometFactory
     * @param _cometImplementation The address of the comet implementation contract to be cloned
     * @param _configControllerFactory The address of the config controller factory
     * @param _sandboxController The address of the sandbox controller
     */
    constructor(
        address _cometImplementation, 
        address _configControllerFactory, 
        address _sandboxController
    ) {
        if (_cometImplementation == address(0) || _configControllerFactory == address(0) || _sandboxController == address(0)) {
            revert InvalidAddress();
        }
        cometImplementation = _cometImplementation;
        configControllerFactory = _configControllerFactory;
        sandboxController = _sandboxController;
    }
    
    /**
     * @notice Creates a new market with the specified configuration
     * @dev Uses OpenZeppelin's Clones library to create a new market instance
     * @return The address of the newly created market
     * @param _marketConfig The configuration for the new market
     * @param _config The configuration for the sandbox controller
     */
    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory _config
    ) external override returns (address) {
        if (!IConfigControllerFactory(configControllerFactory).isController(msg.sender))
            revert Unauthorized();

        address market = Clones.clone(cometImplementation);
        markets.push(market);
        
        CometExtension ext = new CometExtension(bytes32(0), bytes32(0));
        
        ISandboxComet(market).initialize(
            _marketConfig,
            _config,
            msg.sender,
            sandboxController,
            address(ext),
            ISandboxController(sandboxController).baseAssets(_marketConfig.baseToken).minBorrow
        );
        
        emit MarketCreated(market, _marketConfig.baseToken);
        return market;
    }
    
    /**
     * @notice Returns the number of markets created
     * @return The number of markets
     */
    function getMarketsLength() external view override returns (uint256) {
        return markets.length;
    }
}
