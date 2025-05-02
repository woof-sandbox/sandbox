// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ConfigController.sol";
import "./interfaces/IConfigController.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./interfaces/IConfigControllerFactory.sol";

/**
 * @title ConfigControllerFactory
 * @dev Factory contract for creating new ConfigController instances with unique configurations
 */
contract ConfigControllerFactory is IConfigControllerFactory {
    address public immutable override implementation;
    mapping(address => uint) public override controllerIds;
    address[] public override controllerAddresses;
    uint public override lastController;
    
    constructor(address _configControllerImplementation) {
        implementation = _configControllerImplementation;
        /// @dev This is a dummy controller to make the array indexing work correctly
        controllerAddresses.push(address(0));
    }

    /// @notice Creates a new ConfigController instance with unique configuration
    /// @param owner_ The address of the protocol owner
    /// @param guardian_ The address of the protocol guardian
    /// @param _sandboxController The address of the SandboxController contract
    /// @param _marketFactory The address of the MarketFactory contract
    /// @param _curatorFee Initial curator fee in basis points (1% = 100)
    /// @param _name Name of the controller
    /// @param _curatorProposalDuration Duration of curator proposals in seconds
    /// @param _proposalDuration Duration of market proposals in seconds
    /// @return The address of the newly created ConfigController
    function createConfigController(
        address owner_,
        address _curator,
        address guardian_,
        address _sandboxController,
        address _marketFactory,
        uint _curatorFee,
        string memory _name,
        uint _curatorProposalDuration,
        uint _proposalDuration
    ) external override returns (address) {
        address configController = Clones.clone(implementation);
        lastController++;
        controllerIds[configController] = lastController;
        controllerAddresses.push(configController);

        IConfigController(configController).initialize(
            owner_,
            _curator,
            guardian_,
            _sandboxController,
            _marketFactory,
            _curatorFee,
            _name,
            _curatorProposalDuration,
            _proposalDuration,
            address(this)
        );
        
        emit ConfigControllerCreated(
            configController,
            owner_,
            guardian_,
            _sandboxController,
            _marketFactory,
            _curatorFee,
            _name,
            _curatorProposalDuration,
            _proposalDuration,
            lastController
        );

        return configController;
    }

    /// @notice Gets a ConfigController by its index
    /// @param _controllerId The index of the controller
    /// @return The address of the ConfigController
    function getController(uint _controllerId) external view override returns (address) {
        return controllerAddresses[_controllerId];
    }

    function isController(address _controller) external view override returns (bool) {
        return controllerIds[_controller] != 0;
    }
}
