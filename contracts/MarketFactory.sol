// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IMarket.sol";
import "./interfaces/IMarketFactory.sol";
import "./interfaces/IConfigControllerFactory.sol";

/**
 * @title MarketFactory
 * @notice Factory contract for creating new market instances using the clone pattern
 * @dev This contract uses OpenZeppelin's Clones library to create gas-efficient market instances
 */
contract MarketFactory is IMarketFactory {
    /// @notice The implementation address used for cloning new markets
    address public immutable override implementation;

    /// @notice The address of the config controller factory
    address public immutable override configControllerFactory;

    /// @notice The address of the sandbox controller
    address public immutable override sandboxController;

    /// @notice Mapping of market addresses to their respective config controller addresses
    mapping(address => address) public override marketToController;

    /// @notice Array of all created market addresses
    address[] public override markets;

    /// @notice Modifier to restrict access to config controllers only
    modifier onlyConfigController() {
        if (!IConfigControllerFactory(configControllerFactory).isController(msg.sender))
            revert Unauthorized();
        _;
    }

    /**
     * @notice Constructs a new MarketFactory
     * @param _marketImplementation The address of the market implementation contract to be cloned
     */
    constructor(address _marketImplementation, address _configControllerFactory, address _sandboxController) {
        implementation = _marketImplementation;
        configControllerFactory = _configControllerFactory;
        sandboxController = _sandboxController;
    }

    /**
     * @notice Creates a new market with the specified configuration
     * @dev Uses OpenZeppelin's Clones library to create a new market instance
     * @return The address of the newly created market
     */
    function createMarket(
        IConfigController.MarketConfig memory _marketConfig
    ) external override onlyConfigController returns (address) {
        address market = Clones.clone(implementation);
        marketToController[market] = msg.sender; // Store the config controller address
        IMarket(market).initialize(_marketConfig, msg.sender, sandboxController);
        markets.push(market);
        
        emit MarketCreated(market, msg.sender);
        
        return market;
    }

    function changeMarketController(address market) external override onlyConfigController {
        if (marketToController[market] == msg.sender) revert Unauthorized();
        marketToController[market] = msg.sender;
        
        emit MarketControllerChanged(market, msg.sender);
    }
    /**
     * @notice Returns the total number of markets created by this factory
     * @return The number of markets in the markets array
     */
    function getMarketLength() external view returns (uint) {
        return markets.length;
    }
}