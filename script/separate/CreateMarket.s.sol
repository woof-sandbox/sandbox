// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { console } from "forge-std/console.sol";
import { ConfigController, IConfigController } from "contracts/ConfigController.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CreateMarket is Script {
    using stdJson for string;

    function createMarket(string memory marketPath, string memory networkConfigPath) public {
        uint256 marketOwnerPrivateKey = vm.envUint("MARKET_OWNER_PRIVATE_KEY");
        string memory marketConfig = vm.readFile(marketPath);
        string memory networkConfig = vm.readFile(networkConfigPath);

        string memory baseToken = marketConfig.readString(".baseToken");

        address configControllerAddress = marketConfig.readAddress(".configController");
        address baseTokenAddress = networkConfig.readAddress(string.concat(".assets.", baseToken, ".address"));
        uint256 baseTokenCurveId = marketConfig.readUint(".baseTokenCurveId");
        string memory cometName = marketConfig.readString(".name");

        ConfigController configController = ConfigController(configControllerAddress);

        // Read collaterals array from market config - dynamically determine length
        uint256 collateralsLength = 0;

        // Keep trying to read collateral names until we hit one that doesn't exist
        while (collateralsLength < 100) {
            // reasonable upper limit to prevent infinite loop
            string memory testKey = string.concat(".collaterals[", vm.toString(collateralsLength), "].name");

            if (keyExists(marketConfig, testKey)) {
                collateralsLength++;
            } else {
                break;
            }
        }

        // Create array of CollateralTokenConfig
        IConfigController.CollateralTokenConfig[] memory collateralTokens = new IConfigController.CollateralTokenConfig[](
            collateralsLength
        );

        for (uint256 i = 0; i < collateralsLength; i++) {
            string memory collateralName = marketConfig.readString(string.concat(".collaterals[", vm.toString(i), "].name"));
            uint128 supplyCap = uint128(marketConfig.readUint(string.concat(".collaterals[", vm.toString(i), "].supplyCap")));
            uint64 borrowCF = uint64(marketConfig.readUint(string.concat(".collaterals[", vm.toString(i), "].borrowCF")));
            uint64 liquidateCF = uint64(marketConfig.readUint(string.concat(".collaterals[", vm.toString(i), "].liquidateCF")));
            uint64 liquidationF = uint64(marketConfig.readUint(string.concat(".collaterals[", vm.toString(i), "].liquidationF")));

            // Get collateral token address from network config
            address collateralTokenAddress = networkConfig.readAddress(string.concat(".assets.", collateralName, ".address"));

            collateralTokens[i] = IConfigController.CollateralTokenConfig({
                collateralToken: collateralTokenAddress,
                supplyCap: supplyCap,
                borrowCollateralFactor: borrowCF,
                liquidateCollateralFactor: liquidateCF,
                liquidationFactor: liquidationF
            });
        }

        // Create CometConfig struct
        IConfigController.CometConfig memory cometConfig = IConfigController.CometConfig({
            baseToken: baseTokenAddress,
            baseTokenCurveId: baseTokenCurveId,
            collateralTokens: collateralTokens,
            name: cometName
        });

        uint256 amountOfSeedReserves = marketConfig.readUint(".suggestedAmountOfSeedReserves");

        // Start broadcasting and create the comet
        vm.startBroadcast(marketOwnerPrivateKey);
        IERC20(baseTokenAddress).approve(configControllerAddress, amountOfSeedReserves);
        address newComet = configController.createComet(cometConfig);
        vm.stopBroadcast();

        console.log("Created new comet at address:", newComet);

        vm.writeJson(vm.toString(newComet), marketPath, ".comet");
        console.log("Nearly created market was written to market config at:", marketPath);
    }

    // Helper function to check if a JSON key exists without reverting
    function keyExists(string memory json, string memory key) internal view returns (bool) {
        try this.safeReadString(json, key) returns (string memory) {
            return true;
        } catch {
            return false;
        }
    }

    // External function needed for try-catch to work
    function safeReadString(string memory json, string memory key) external pure returns (string memory) {
        return json.readString(key);
    }
}
