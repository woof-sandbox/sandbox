// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

import { CreateConfigController } from "script/separate/CreateConfigController.s.sol";
import { CreateMarket } from "script/separate/CreateMarket.s.sol";

contract CreateUSDCMarket2 is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        CreateConfigController createConfigController = new CreateConfigController();
        CreateMarket createMarket = new CreateMarket();

        string memory marketPath = helperConfig.getMarketPath("usdc2");
        string memory networkConfigPath = helperConfig.getChainConfigPath();

        createConfigController.createConfigController(config, marketPath);

        createMarket.createMarket(marketPath, networkConfigPath);
    }
}
