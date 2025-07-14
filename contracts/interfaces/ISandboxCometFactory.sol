// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

abstract contract ISandboxCometFactory {
    error InvalidAddress();
    error Unauthorized();

    /// @notice Emitted when a new comet is created
    /// @param comet The address of the new comet
    /// @param ext The address of the extension
    /// @param configController The address of the controller responsible for the market
    event CometCreated(address indexed comet, address indexed ext, address indexed configController);

    /// @notice Returns the address of the comet implementation
    function cometImplementation() external view virtual returns (address);

    /// @notice Returns the address of the config controller factory
    function configControllerFactory() external view virtual returns (address);

    /// @notice Returns the address of a comet by its index
    /// @param index The index of the comet
    /// @return The address of the comet
    function comets(uint256 index) external view virtual returns (address);

    /// @notice Returns the number of comets created
    /// @return The number of comets
    function getCometsLength() external view virtual returns (uint256);

    /// @notice Creates a new comet and its extension
    /// @return The address of the newly created comet
    function createComet(string memory _name) external virtual returns (address);
}
