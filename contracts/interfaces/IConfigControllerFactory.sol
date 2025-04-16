// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "./IConfigController.sol";

/**
 * @title IConfigControllerFactory
 * @notice Interface for the ConfigControllerFactory contract
 * @dev This interface defines the functions and events for creating and managing ConfigController instances
 */
abstract contract IConfigControllerFactory {
    /// @notice Event emitted when a new ConfigController is created
    /// @param controller The address of the newly created controller
    /// @param owner The address of the controller owner
    /// @param guardian The address of the controller guardian
    /// @param sandboxController The address of the sandbox controller
    /// @param marketFactory The address of the market factory
    /// @param curatorFee The curator fee in basis points
    /// @param name The name of the controller
    /// @param curatorProposalDuration The duration of curator proposals in seconds
    /// @param proposalDuration The duration of market proposals in seconds
    event ConfigControllerCreated(
        address indexed controller,
        address indexed owner,
        address indexed guardian,
        address sandboxController,
        address marketFactory,
        uint curatorFee,
        string name,
        uint curatorProposalDuration,
        uint proposalDuration
    );

    /// @notice Returns the implementation address used for cloning
    /// @return The address of the implementation contract
    function implementation() external view virtual returns (address);

    /// @notice Returns the controller ID for a given config controller address
    /// @param configController The address of the config controller
    /// @return The ID of the controller
    function controllerIds(address configController) external view virtual returns (uint);

    /// @notice Returns the controller address at a given index
    /// @param index The index of the controller
    /// @return The address of the controller
    function controllerAddresses(uint index) external view virtual returns (address);

    /// @notice Returns the last controller ID
    /// @return The ID of the last controller
    function lastController() external view virtual returns (uint);

    /// @notice Creates a new ConfigController with the specified parameters
    /// @param owner_ The address of the controller owner
    /// @param guardian_ The address of the controller guardian
    /// @param _sandboxController The address of the sandbox controller
    /// @param _marketFactory The address of the market factory
    /// @param _curatorFee The curator fee in basis points
    /// @param _name The name of the controller
    /// @param _curatorProposalDuration The duration of curator proposals in seconds
    /// @param _proposalDuration The duration of market proposals in seconds
    /// @return The address of the newly created controller
    function createConfigController(
        address owner_,
        address guardian_,
        address _sandboxController,
        address _marketFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) external virtual returns (address);

    /// @notice Gets a ConfigController by its index
    /// @param _controllerId The index of the controller
    /// @return The address of the ConfigController
    function getController(uint _controllerId) external view virtual returns (address);

    /// @notice Checks if an address is a valid controller
    /// @param _controller The address to check
    /// @return True if the address is a valid controller
    function isController(address _controller) external view virtual returns (bool);
} 