pragma solidity 0.8.28;

import "./ISandboxErrors.sol";

interface IConfigControllerFactory is ISandboxErrors {
    event ConfigControllerCreated(
        address indexed controller,
        string name
    );

    function create(
        address curator_,
        address guardian_,
        address sandboxController_,
        address marketFactory_,
        uint curatorFee_,
        string calldata name_
    ) external returns (address);
}
