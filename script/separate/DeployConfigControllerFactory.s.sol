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
        deployConfigControllerFactory(config, helperConfig);
    }

    function deployConfigControllerFactory(HelperConfig.NetworkConfig memory config, HelperConfig helperConfig) public returns (address configControllerFactory) {
        uint256 configControllerFactoryDeployerPrivateKey = vm.envUint("CONFIG_CONTROLLER_FACTORY_DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(configControllerFactoryDeployerPrivateKey);
        configControllerFactory = address(new ConfigControllerFactory(config.sandboxController, config.configControllerImplementation));
        vm.stopBroadcast();

        console.log("ConfigControllerFactory deployed at:", configControllerFactory);

        string memory networkConfigPath = helperConfig.getChainConfigPath();
        vm.writeJson(vm.toString(configControllerFactory), networkConfigPath, ".ConfigControllerFactory");
    }
}
