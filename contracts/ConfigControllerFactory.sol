// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ConfigController.sol";
import "./interfaces/IConfigController.sol";
import "./interfaces/IConfigControllerFactory.sol";
import "./interfaces/ISandboxCometFactory.sol";

/**
 * @title ConfigControllerFactory
 * @dev Factory contract for creating new ConfigController instances with unique configurations
 */
contract ConfigControllerFactory is IConfigControllerFactory {
    /// @notice The implementation address used for cloning
    address public immutable override configControllerImplementation;
    /// @notice The implementation address used for cloning
    address public immutable override sandboxController;
    /// @notice The array of controller addresses
    mapping(address => uint256) public override controllerIds;
    /// @notice The array of controller addresses
    address[] public override controllerAddresses;

    /// @notice constructor
    /// @param _configControllerImplementation The address of the ConfigController implementation
    constructor(address _sandboxController, address _configControllerImplementation) {
        if (_configControllerImplementation == address(0) || _sandboxController == address(0)) revert ZeroAddress();

        sandboxController = _sandboxController;
        configControllerImplementation = _configControllerImplementation;
    }

    /// @notice Creates a new ConfigController instance with unique configuration
    /// @notice Sets msg.sender as an owner of the newly created Config Controller
    /// @param _curator The address of the protocol curator
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
        uint256 _curatorFee,
        string memory _name,
        uint256 _curatorProposalDuration,
        uint256 _proposalDuration
    ) external override returns (address) {
        if (_marketFactory == address(0) || _curator == address(0)) revert ZeroAddress();
        /// Check that correct factory is used - to avoid foreign factories
        if (ISandboxCometFactory(_marketFactory).configControllerFactory() != address(this)) revert InvalidFactory();
        /// no check for guardian - guardian may be set as address(0) as market can be run without it
        /// curator is checked in proposeCurator()

        /// check that roles are assigned to different actors
        if (_curator == msg.sender || _guardian == msg.sender || _curator == _guardian) revert InvalidAddress();

        address configController = Clones.clone(configControllerImplementation);
        controllerIds[configController] = controllerAddresses.length;
        controllerAddresses.push(configController);

        IConfigController(configController).initialize(
            msg.sender,
            _curator,
            _guardian,
            _marketFactory,
            _curatorFee,
            _name,
            _curatorProposalDuration,
            _proposalDuration
        );

        emit ConfigControllerCreated(
            configController,
            msg.sender,
            _curator,
            _guardian,
            _marketFactory,
            _curatorFee,
            _name,
            _curatorProposalDuration,
            _proposalDuration,
            controllerAddresses.length - 1
        );

        return configController;
    }

    /// @notice Returns the last controller ID
    /// @return The last controller ID
    function getLastControllerLength() external view override returns (uint256) {
        return controllerAddresses.length;
    }

    /// @notice Returns true if the address is a controller
    /// @param _controller The address to check
    /// @return True if the address is a controller, false otherwise
    function isController(address _controller) external view override returns (bool) {
        if (controllerAddresses.length == 0 || _controller == address(0)) return false;
        return controllerAddresses[controllerIds[_controller]] == _controller;
    }
}
