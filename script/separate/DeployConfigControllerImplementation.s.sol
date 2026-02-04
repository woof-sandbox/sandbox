// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { ConfigController } from "contracts/ConfigController.sol";

contract DeployConfigControllerImplementation is Script {
    using stdJson for string;

    function run() public {
        deployConfigControllerImplementation();
    }

    function deployConfigControllerImplementation() public returns (address configControllerImplementation) {
        uint256 configControllerImplementationDeployerPrivateKey = vm.envUint("CONFIG_CONTROLLER_IMPLEMENTATION_DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(configControllerImplementationDeployerPrivateKey);
        configControllerImplementation = address(new ConfigController());
        vm.stopBroadcast();

        console.log("ConfigControllerImplementation deployed at:", configControllerImplementation);

        string memory path;
        if (11155111 == block.chainid) {
            path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");
        } else {
            revert("Invalid chain ID");
        }

        vm.writeJson(vm.toString(configControllerImplementation), path, ".ConfigControllerImplementation");
    }
}
