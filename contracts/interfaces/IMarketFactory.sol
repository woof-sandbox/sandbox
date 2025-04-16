// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigController.sol";

abstract contract IMarketFactory {
    event MarketCreated(address indexed market, address indexed configController);
    
    error Unauthorized();

    /// @notice Returns the implementation address used for cloning
    function implementation() external view virtual returns (address);

    /// @notice Returns the config controller address for a given market
    /// @param market The address of the market
    /// @return The address of the config controller
    function marketToController(address market) external view virtual returns (address);

    /// @notice Returns the config controller factory address
    function configControllerFactory() external view virtual returns (address);

    /// @notice Creates a new market with the specified configuration
    /// @param _marketConfig The configuration parameters for the new market
    /// @return The address of the newly created market
    function createMarket(IConfigController.MarketConfig memory _marketConfig) external virtual returns (address);

    /// @notice Returns the address of a market by its index
    /// @param index The index of the market
    /// @return The address of the market
    function markets(uint256 index) external view virtual returns (address);
}