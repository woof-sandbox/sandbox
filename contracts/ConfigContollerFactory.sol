// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "./ConfigController.sol";
import "./interfaces/IConfigControllerFactory.sol";

contract ConfigControllerFactory is IConfigControllerFactory {

    address public owner;
    address[] public controllers;

    address public cometImplementation;

    constructor(address _owner, address _cometImplementation) {
        owner = _owner;
        cometImplementation = _cometImplementation;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function setImplementation(address cometImplementation_) external onlyOwner {
        cometImplementation = cometImplementation_;
        emit ImplementationSet(cometImplementation_);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address oldOwner = owner;
        owner = newOwner;
        emit OwnerTransferred(oldOwner, newOwner);
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
            cometImplementation,
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