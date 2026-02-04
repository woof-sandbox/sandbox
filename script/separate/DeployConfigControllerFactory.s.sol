// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { ConfigControllerFactory } from "contracts/ConfigControllerFactory.sol";

contract DeployConfigControllerFactory is Script {
    using stdJson for string;

    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();
        deployConfigControllerFactory(config);
    }

    function deployConfigControllerFactory(HelperConfig.NetworkConfig memory config) public returns (address configControllerFactory) {
        uint256 configControllerFactoryDeployerPrivateKey = vm.envUint("CONFIG_CONTROLLER_FACTORY_DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(configControllerFactoryDeployerPrivateKey);
        configControllerFactory = address(new ConfigControllerFactory(config.sandboxController, config.configControllerImplementation));
        vm.stopBroadcast();

        console.log("ConfigControllerFactory deployed at:", configControllerFactory);

        string memory path;
        if (11155111 == block.chainid) {
            path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");
        } else if (111555111 == block.chainid) {
            path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");
        } else {
            revert("Invalid chain ID");
        }

        vm.writeJson(vm.toString(configControllerFactory), path, ".ConfigControllerFactory");
    }
}
