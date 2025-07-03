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
    /// @param curator The address of the controller curator
    /// @param guardian The address of the controller guardian
    /// @param marketFactory The address of the market factory
    /// @param curatorFee The curator fee in basis points
    /// @param name The name of the controller
    /// @param curatorProposalDuration The duration of curator proposals in seconds
    /// @param proposalDuration The duration of market proposals in seconds
    event ConfigControllerCreated(
        address indexed controller,
        address indexed owner,
        address indexed curator,
        address guardian,
        address marketFactory,
        uint curatorFee,
        string name,
        uint curatorProposalDuration,
        uint proposalDuration,
        uint controllerId
    );
    error InvalidAddress();
    error ZeroAddress();
    error InvalidFactory();

    /// @notice Returns the implementation address used for cloning
    /// @return The address of the implementation contract
    function configControllerImplementation() external view virtual returns (address);

    /// @return The address of the Sandbox Controller - to verify the factory
    function sandboxController() external view virtual returns (address);

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
    function getLastControllerLength() external view virtual returns (uint);

    /// @notice Creates a new ConfigController instance with unique configuration
    /// @param _guardian The address of the protocol guardian
    /// @param _marketFactory The address of the MarketFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    /// @param _name Name of the controller
    /// @param _curatorProposalDuration Duration of curator proposals in seconds
    /// @param _proposalDuration Duration of market proposals in seconds
    /// @return The address of the newly created ConfigController
    function createConfigController(
        address _curator,
        address _guardian,
        address _marketFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) external virtual returns (address);

    /// @notice Checks if an address is a valid controller
    /// @param _controller The address to check
    /// @return True if the address is a valid controller
    function isController(address _controller) external view virtual returns (bool);
}
