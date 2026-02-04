// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { SandboxController, ISandboxController } from "contracts/SandboxController.sol";

contract WhitelistBaseAsset is Script {
    using stdJson for string;

    function whitelistBaseAsset(HelperConfig.NetworkConfig memory config, string memory marketPath, string memory marketConfigPath) public {
        uint256 sandboxControllerDeployerPrivateKey = vm.envUint("SANDBOX_CONTROLLER_DEPLOYER_PRIVATE_KEY");
        string memory marketConfig = vm.readFile(marketPath);
        string memory networkConfig = vm.readFile(marketConfigPath);

        _whitelistBaseAssetInternal(config, marketConfig, networkConfig, sandboxControllerDeployerPrivateKey);
    }

    function _whitelistBaseAssetInternal(
        HelperConfig.NetworkConfig memory config,
        string memory marketConfig,
        string memory sepoliaConfig,
        uint256 sandboxControllerDeployerPrivateKey
    ) internal {
        string memory baseToken = marketConfig.readString(".baseToken");

        // Get addresses
        address baseTokenAddress = sepoliaConfig.readAddress(string.concat(".assets.", baseToken, ".address"));
        address priceFeedAddress = sepoliaConfig.readAddress(string.concat(".assets.", baseToken, ".priceFeed"));

        // Build curve in separate function to reduce stack depth
        ISandboxController.BaseAssetCurve memory curve = _buildCurve(marketConfig);

        // Get remaining parameters
        uint256 minBorrow = marketConfig.readUint(".minBorrow");
        uint256 amountOfSeedReserves = marketConfig.readUint(".suggestedAmountOfSeedReserves");
        uint256 lockTimeOfSeedReserves = marketConfig.readUint(".suggestedLockTimeOfSeedReserves");

        SandboxController sandboxController = SandboxController(config.sandboxController);

        vm.startBroadcast(sandboxControllerDeployerPrivateKey);

        sandboxController.whitelistBaseAsset(
            baseTokenAddress,
            priceFeedAddress,
            curve,
            minBorrow,
            amountOfSeedReserves,
            uint40(lockTimeOfSeedReserves)
        );

        vm.stopBroadcast();

        // uint256 daoPrivateKey = vm.envUint("DAO_PRIVATE_KEY");
        // vm.startBroadcast(daoPrivateKey);
        // sandboxController.changeBaseAssetCurve(baseTokenAddress, 0, curve);
        // vm.stopBroadcast();
    }

    function _buildCurve(string memory marketConfig) internal pure returns (ISandboxController.BaseAssetCurve memory) {
        return
            ISandboxController.BaseAssetCurve({
                supplyKink: uint64(marketConfig.readUint(".curve.supplyKink")),
                supplyPerYearInterestRateSlopeLow: uint64(marketConfig.readUint(".curve.supplyPerYearInterestRateSlopeLow")),
                supplyPerYearInterestRateSlopeHigh: uint64(marketConfig.readUint(".curve.supplyPerYearInterestRateSlopeHigh")),
                supplyPerYearInterestRateBase: uint64(marketConfig.readUint(".curve.supplyPerYearInterestRateBase")),
                borrowKink: uint64(marketConfig.readUint(".curve.borrowKink")),
                borrowPerYearInterestRateSlopeLow: uint64(marketConfig.readUint(".curve.borrowPerYearInterestRateSlopeLow")),
                borrowPerYearInterestRateSlopeHigh: uint64(marketConfig.readUint(".curve.borrowPerYearInterestRateSlopeHigh")),
                borrowPerYearInterestRateBase: uint64(marketConfig.readUint(".curve.borrowPerYearInterestRateBase"))
            });
    }
}
