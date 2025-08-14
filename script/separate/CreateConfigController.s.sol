// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { ConfigControllerFactory } from "contracts/ConfigControllerFactory.sol";
import { ConfigController } from "contracts/ConfigController.sol";

contract CreateConfigController is Script {
    using stdJson for string;

    function createConfigController(HelperConfig.NetworkConfig memory config, string memory marketPath) public {
        uint256 marketOwnerPrivateKey = vm.envUint("MARKET_OWNER_PRIVATE_KEY");
        string memory marketConfig = vm.readFile(marketPath);

        ConfigControllerFactory configControllerFactory = ConfigControllerFactory(config.configControllerFactory);

        address curator = marketConfig.readAddress(".curator");
        address guardian = marketConfig.readAddress(".guardian");
        address cometFactory = config.sandboxCometFactory;
        uint32 curatorFee = uint32(marketConfig.readUint(".curatorFee"));
        string memory name = marketConfig.readString(".configControllerName");
        uint40 curatorProposalDuration = uint40(marketConfig.readUint(".curatorProposalDuration"));
        uint40 proposalDuration = uint40(marketConfig.readUint(".proposalDuration"));

        vm.startBroadcast(marketOwnerPrivateKey);

        address configController = configControllerFactory.createConfigController(
            curator,
            guardian,
            cometFactory,
            curatorFee,
            name,
            curatorProposalDuration,
            proposalDuration
        );

        vm.stopBroadcast();

        // Write newly created config controller to market config
        vm.writeJson(vm.toString(configController), marketPath, ".configController");
    }
}
