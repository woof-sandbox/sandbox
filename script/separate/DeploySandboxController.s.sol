// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script, console } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { SandboxController, ISandboxController } from "contracts/SandboxController.sol";

contract DeploySandboxController is Script {
    using stdJson for string;

    function deploySandboxController(HelperConfig.NetworkConfig memory config) public returns (address sandboxController) {
        uint256 sandboxControllerDeployerPrivateKey = vm.envUint("SANDBOX_CONTROLLER_DEPLOYER_PRIVATE_KEY");

        ISandboxController.SandboxControllerConfiguration memory sandboxControllerConfig = ISandboxController
            .SandboxControllerConfiguration({
                targetPercent: uint64(config.sandboxControllerConfig.targetPercent),
                storeFrontPriceFactor: uint64(config.sandboxControllerConfig.storeFrontPriceFactor),
                minUpdateTime: uint40(config.sandboxControllerConfig.minUpdateTime),
                maxUpdateTime: uint40(config.sandboxControllerConfig.maxUpdateTime)
            });

        vm.startBroadcast(sandboxControllerDeployerPrivateKey);
        sandboxController = address(
            new SandboxController(
                config.owner,
                config.dao,
                config.treasury,
                config.sandboxControllerConfig.feeEnabled,
                sandboxControllerConfig, // config
                [
                    uint64(config.sandboxControllerConfig.reserveCommissions[0]),
                    uint64(config.sandboxControllerConfig.reserveCommissions[1]),
                    uint64(config.sandboxControllerConfig.reserveCommissions[2])
                ], // reserveCommissions
                [
                    uint64(config.sandboxControllerConfig.protocolCommissions[0]),
                    uint64(config.sandboxControllerConfig.protocolCommissions[1]),
                    uint64(config.sandboxControllerConfig.protocolCommissions[2])
                ] // protocolCommissions
            )
        );
        vm.stopBroadcast();

        console.log("SandboxController deployed at:", sandboxController);

        string memory path;
        if (11155111 == block.chainid) {
            path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");
        } else {
            revert("Invalid chain ID");
        }

        vm.writeJson(vm.toString(sandboxController), path, ".SandboxController");
    }
}
