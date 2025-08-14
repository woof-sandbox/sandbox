// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

import { DeploySandboxController } from "script/separate/DeploySandboxController.s.sol";
import { DeployConfigControllerImplementation } from "script/separate/DeployConfigControllerImplementation.s.sol";
import { DeployConfigControllerFactory } from "script/separate/DeployConfigControllerFactory.s.sol";
import { DeployCometImplementation } from "script/separate/DeployCometImplementation.s.sol";
import { DeploySandboxCometFactory } from "script/separate/DeploySandboxCometFactory.s.sol";

contract DeployProtocol is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        // Deploy SandboxController
        DeploySandboxController deploySandboxController = new DeploySandboxController();
        deploySandboxController.deploySandboxController(config);

        // Deploy Config Controller Implementation
        DeployConfigControllerImplementation deployConfigControllerImplementation = new DeployConfigControllerImplementation();
        deployConfigControllerImplementation.deployConfigControllerImplementation();

        // Deploy Config Controller Factory
        DeployConfigControllerFactory deployConfigControllerFactory = new DeployConfigControllerFactory();
        deployConfigControllerFactory.deployConfigControllerFactory(config);

        // Deploy Comet Implementation
        DeployCometImplementation deployCometImplementation = new DeployCometImplementation();
        deployCometImplementation.deployCometImplementation();

        // Deploy Sandbox Comet Factory
        DeploySandboxCometFactory deploySandboxCometFactory = new DeploySandboxCometFactory();
        deploySandboxCometFactory.deploySandboxCometFactory(config);
    }
}
