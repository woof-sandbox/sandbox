// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ConfigController.sol";
import "./interfaces/IConfigControllerFactory.sol";

contract ConfigControllerFactory is IConfigControllerFactory {

    address public owner;
    address[] public controllers;

    constructor(address _owner) {
        owner = _owner;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /**
     * @dev Creates a new ConfigController contract.
     * @param curator_ - The address of the curator.
     * @param guardian_ - The address of the guardian.
     * @param sandboxController_ - The address of the sandbox controller.
     * @param marketFactory_ - The address of the market factory.
     * @param curatorFee_ - Initial curator fee in basis points (1% = 100)
     * @param name_ - The name of the ConfigController.
     */
    function create(
        address curator_,
        address guardian_,
        address sandboxController_,
        address marketFactory_,
        uint curatorFee_,
        string calldata name_
    ) external onlyOwner returns (address) 
    {
        ConfigController controller = new ConfigController(
            owner,
            curator_,
            guardian_,
            sandboxController_,
            marketFactory_,
            curatorFee_,
            name_
        );


        controllers.push(address(controller));
        emit ConfigControllerCreated(address(controller), name_);
        return address(controller);
    }

    /**
     * @dev Returns the list of all ConfigController addresses.
     * @return An array of ConfigController addresses.
     */
    function getAllControllers() external view returns (address[] memory) {
        return controllers;
    }

    /**
     * @dev Returns the number of ConfigController contracts created.
     * @return The number of ConfigController contracts.
     */
    function controllersCount() external view returns (uint) {
        return controllers.length;
    }
}