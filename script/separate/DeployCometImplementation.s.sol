// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { SandboxComet } from "contracts/SandboxComet.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

contract DeployCometImplementation is Script {
    function run() public {
        deployCometImplementation();
    }

    function deployCometImplementation() public returns (address cometImplementation) {
        uint256 configControllerFactoryDeployerPrivateKey = vm.envUint("CONFIG_CONTROLLER_FACTORY_DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(configControllerFactoryDeployerPrivateKey);
        cometImplementation = address(new SandboxComet());
        vm.stopBroadcast();

        console.log("CometImplementation deployed at:", cometImplementation);

        HelperConfig helperConfig = new HelperConfig();
        string memory networkConfigPath = helperConfig.getChainConfigPath();

        vm.writeJson(vm.toString(cometImplementation), networkConfigPath, ".CometImplementation");
        console.log("CometImplementation address written to:", networkConfigPath);
    }
}
