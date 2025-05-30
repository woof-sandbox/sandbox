// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "./ConfigController.sol";
import "./interfaces/IConfigController.sol";
import "./interfaces/IConfigControllerFactory.sol";

/**
 * @title ConfigControllerFactory
 * @dev Factory contract for creating new ConfigController instances with unique configurations
 */
contract ConfigControllerFactory is IConfigControllerFactory {
    /// @notice The implementation address used for cloning
    address public immutable override configControllerImplementation;
    /// @notice The array of controller addresses
    mapping(address => uint) public override controllerIds;
    /// @notice The array of controller addresses
    address[] public override controllerAddresses;
    
    /// @notice constructor
    /// @param _configControllerImplementation The address of the ConfigController implementation
    constructor(address _configControllerImplementation) {
        if (_configControllerImplementation == address(0)) revert InvalidAddress();
        configControllerImplementation = _configControllerImplementation;
    }

    /// @notice Creates a new ConfigController instance with unique configuration
    /// @param _owner The address of the protocol owner
    /// @param _guardian The address of the protocol guardian
    /// @param _sandboxController The address of the SandboxController contract
    /// @param _marketFactory The address of the MarketFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    /// @param _name Name of the controller
    /// @param _curatorProposalDuration Duration of curator proposals in seconds
    /// @param _proposalDuration Duration of market proposals in seconds
    /// @return The address of the newly created ConfigController
    function createConfigController(
        address _owner,
        address _curator,
        address _guardian,
        address _sandboxController,
        address _marketFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) external override returns (address) {
        address configController = Clones.clone(configControllerImplementation);
        controllerIds[configController] = controllerAddresses.length;
        controllerAddresses.push(configController);

        IConfigController(configController).initialize(
            _owner,
            _curator,
            _guardian,
            _sandboxController,
            _marketFactory,
            _curatorFee,
            _name,
            _curatorProposalDuration,
            _proposalDuration
        );
        
        emit ConfigControllerCreated(
            configController,
            _owner,
            _curator,
            _sandboxController,
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
    function getLastControllerLength() external view override returns (uint) {
        return controllerAddresses.length;
    }

    /// @notice Returns true if the address is a controller
    /// @param _controller The address to check
    /// @return True if the address is a controller, false otherwise
    function isController(address _controller) external view override returns (bool) {
        if (controllerAddresses.length == 0) return false;
        return controllerAddresses[controllerIds[_controller]] != address(0);
    }
}
