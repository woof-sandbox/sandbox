// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { SandboxCometFactory } from "contracts/SandboxCometFactory.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

contract DeploySandboxCometFactory is Script {
    using stdJson for string;

    function deploySandboxCometFactory(HelperConfig.NetworkConfig memory config) public returns (address sandboxCometFactory) {
        uint256 configControllerFactoryDeployerPrivateKey = vm.envUint("CONFIG_CONTROLLER_FACTORY_DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(configControllerFactoryDeployerPrivateKey);
        sandboxCometFactory = address(new SandboxCometFactory(config.cometImplementation, config.configControllerFactory));
        vm.stopBroadcast();

        console.log("SandboxCometFactory deployed at:", sandboxCometFactory);

        string memory path;
        if (11155111 == block.chainid) {
            path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");
        } else {
            revert("Invalid chain ID");
        }

        vm.writeJson(vm.toString(sandboxCometFactory), path, ".SandboxCometFactory");
        console.log("SandboxCometFactory address written to:", path);
    }
}
