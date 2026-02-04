// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";

import { WhitelistBaseAsset } from "script/separate/WhitelistBaseAsset.s.sol";
import { CreateConfigController } from "script/separate/CreateConfigController.s.sol";
import { CreateMarket } from "script/separate/CreateMarket.s.sol";

contract CreateUSDCMarket is Script {
    function run() public {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        WhitelistBaseAsset whitelistBaseAsset = new WhitelistBaseAsset();
        CreateConfigController createConfigController = new CreateConfigController();
        CreateMarket createMarket = new CreateMarket();

        string memory marketPath = helperConfig.getMarketPath("usdc");
        string memory networkConfigPath = helperConfig.getChainConfigPath();

        whitelistBaseAsset.whitelistBaseAsset(config, marketPath, networkConfigPath);

        createConfigController.createConfigController(config, marketPath);

        createMarket.createMarket(marketPath, networkConfigPath);
    }
}
