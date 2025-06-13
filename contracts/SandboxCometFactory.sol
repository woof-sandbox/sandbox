// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/proxy/Clones.sol";

import "./interfaces/ISandboxCometFactory.sol";
import "./interfaces/ISandboxComet.sol";
import "./interfaces/IConfigControllerFactory.sol";
import "./CometExtension.sol";

/**
 * @title SandboxCometFactory
 * @notice Factory contract for creating new comet instances using the clone pattern
 * @dev This contract uses OpenZeppelin's Clones library to create gas-efficient comet instances
 */
contract SandboxCometFactory is ISandboxCometFactory {
    /// @notice The implementation address used for cloning new comets
    address public immutable override cometImplementation;

    /// @notice The address of the config controller factory
    address public immutable override configControllerFactory;

    /// @notice Array of all created comet addresses
    address[] public override comets;

    /**
     * @notice Constructs a new SandboxCometFactory
     * @param _cometImplementation The address of the comet implementation contract to be cloned
     * @param _configControllerFactory The address of the config controller factory
     */
    constructor(
        address _cometImplementation,
        address _configControllerFactory
    ) {
        if (_cometImplementation == address(0) || _configControllerFactory == address(0)) revert InvalidAddress();

        cometImplementation = _cometImplementation;
        configControllerFactory = _configControllerFactory;
    }
    
    /**
     * @notice Creates a new comet with the specified configuration
     * @dev Uses OpenZeppelin's Clones library to create a new comet instance
     * @return The address of the newly created comet
     */
    function createComet(string calldata _name) external override returns (address) {
        if (!IConfigControllerFactory(configControllerFactory).isController(msg.sender)) revert Unauthorized();

        address comet = Clones.clone(cometImplementation);
        comets.push(comet);

        CometExtension ext = new CometExtension(bytes32(bytes(_name)));

        ISandboxComet(comet).factoryInit(msg.sender, address(ext));
                
        emit CometCreated(comet, address(ext), msg.sender);
        return comet;
    }
    
    /**
     * @notice Returns the number of comets created
     * @return The number of comets
     */
    function getCometsLength() external view override returns (uint256) {
        return comets.length;
    }
}
