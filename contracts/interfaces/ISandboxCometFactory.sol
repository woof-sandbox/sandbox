// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigControllerFactory.sol";

abstract contract ISandboxCometFactory {    
    error InvalidAddress();
    error Unauthorized();

    /// @notice Emitted when a new market is created
    /// @param market The address of the new market
    /// @param baseToken The address of the base token
    event MarketCreated(address indexed market, address indexed baseToken);

    /// @notice Returns the address of the comet implementation
    function cometImplementation() external view virtual returns (address);
    /// @notice Returns the address of the config controller factory
    function configControllerFactory() external view virtual returns (address);
    /// @notice Returns the address of the sandbox controller
    function sandboxController() external view virtual returns (address);

    /// @notice Returns the address of a market by its index
    /// @param index The index of the market
    /// @return The address of the market
    function markets(uint256 index) external view virtual returns (address);

    /// @notice Returns the number of markets created
    /// @return The number of markets
    function getMarketsLength() external view virtual returns (uint256);

    /// @notice Creates a new market with the specified configuration
    /// @param _marketConfig The configuration for the new market
    /// @param _config The configuration for the sandbox controller
    /// @return The address of the newly created market
    function createMarket(
        IConfigController.MarketConfig memory _marketConfig,
        ISandboxController.SandboxControllerConfiguration memory _config
    ) external virtual returns (address);
}
