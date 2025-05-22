// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./IConfigControllerFactory.sol";

abstract contract ISandboxCometFactory {    
    error InvalidAddress();
    error Unauthorized();

    /// @notice Emitted when a new comet is created
    /// @param comet The address of the new comet
    /// @param baseToken The address of the base token
    event CometCreated(address indexed comet, address indexed baseToken);

    /// @notice Returns the address of the comet implementation
    function cometImplementation() external view virtual returns (address);
    /// @notice Returns the address of the config controller factory
    function configControllerFactory() external view virtual returns (address);
    /// @notice Returns the address of the sandbox controller
    function sandboxController() external view virtual returns (address);

    /// @notice Returns the address of a comet by its index
    /// @param index The index of the comet
    /// @return The address of the comet
    function comets(uint256 index) external view virtual returns (address);

    /// @notice Returns the number of comets created
    /// @return The number of comets
    function getCometsLength() external view virtual returns (uint256);

    /// @notice Creates a new comet with the specified configuration
    /// @param _cometConfig The configuration for the new comet
    /// @param _config The configuration for the sandbox controller
    /// @return The address of the newly created comet
    function createComet(
        IConfigController.CometConfig memory _cometConfig,
        ISandboxController.SandboxControllerConfiguration memory _config
    ) external virtual returns (address);
}
