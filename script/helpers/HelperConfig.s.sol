// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

import { Script } from "forge-std/Script.sol";
import { stdJson } from "forge-std/StdJson.sol";

contract HelperConfig is Script {
    using stdJson for string;
    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    error HelperConfig__InvalidChainId();

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/
    struct AssetConfig {
        address tokenAddress;
        address priceFeed;
        address chainlinkPriceFeed;
        address fallbackPriceFeed;
        uint64 minBorrowCF;
        uint64 maxBorrowCF;
        uint64 minLiquidateCF;
        uint64 maxLiquidateCF;
        uint64 minLiquidationF;
        uint64 maxLiquidationF;
        uint256 supplyCap;
    }

    struct SandboxControllerConfig {
        uint256 targetPercent;
        uint256 storeFrontPriceFactor;
        uint256 minUpdateTime;
        uint256 maxUpdateTime;
        bool feeEnabled;
        uint256[3] reserveCommissions;
        uint256[3] protocolCommissions;
    }

    struct NetworkConfig {
        address dao;
        address treasury;
        address curator;
        AssetConfig usdc;
        AssetConfig wbtc;
        AssetConfig weth;
        AssetConfig link;
        AssetConfig stETH;
        AssetConfig wstETH;
        AssetConfig sUSDe;
        AssetConfig snx;
        AssetConfig jpy;
        AssetConfig oETH;
        SandboxControllerConfig sandboxControllerConfig;
        address sandboxController;
        address configControllerImplementation;
        address configControllerFactory;
        address cometImplementation;
        address sandboxCometFactory;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    uint256 public constant SEPOLIA_TESTNET_CHAIN_ID = 11155111;

    mapping(uint256 => NetworkConfig) public networkConfigs;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    constructor() {
        networkConfigs[SEPOLIA_TESTNET_CHAIN_ID] = getSepoliaTestnetConfig();
    }

    function getConfig() public view returns (NetworkConfig memory) {
        uint256 chainId = block.chainid;
        if (networkConfigs[chainId].usdc.tokenAddress != address(0)) {
            return networkConfigs[chainId];
        } else {
            revert HelperConfig__InvalidChainId();
        }
    }

    /*//////////////////////////////////////////////////////////////
                                CONFIGS
    //////////////////////////////////////////////////////////////*/

    function getSepoliaTestnetConfig() public view returns (NetworkConfig memory) {
        string memory path = string.concat(vm.projectRoot(), "/script/configs/sepolia.json");
        string memory json = vm.readFile(path);

        NetworkConfig memory config;

        // Read basic config
        config.dao = json.readAddress(".dao");
        config.treasury = json.readAddress(".treasury");
        config.curator = json.readAddress(".curator");
        config.sandboxController = json.readAddress(".SandboxController");
        config.configControllerImplementation = json.readAddress(".ConfigControllerImplementation");
        config.configControllerFactory = json.readAddress(".ConfigControllerFactory");
        config.cometImplementation = json.readAddress(".CometImplementation");
        config.sandboxCometFactory = json.readAddress(".SandboxCometFactory");

        // Read assets
        config.usdc = _readAssetConfig(json, ".assets.USDC");
        config.wbtc = _readAssetConfig(json, ".assets.WBTC");
        config.weth = _readAssetConfig(json, ".assets.WETH");
        config.link = _readAssetConfig(json, ".assets.LINK");
        config.stETH = _readAssetConfig(json, ".assets.stETH");
        config.wstETH = _readAssetConfig(json, ".assets.wstETH");
        config.sUSDe = _readAssetConfig(json, ".assets.sUSDe");
        config.snx = _readAssetConfig(json, ".assets.SNX");
        config.jpy = _readAssetConfig(json, ".assets.JPY");
        config.oETH = _readAssetConfig(json, ".assets.oETH");

        // Read sandbox controller config
        config.sandboxControllerConfig = _readSandboxControllerConfig(json);

        return config;
    }

    function _readAssetConfig(string memory json, string memory assetPath) private pure returns (AssetConfig memory) {
        return
            AssetConfig({
                tokenAddress: json.readAddress(string.concat(assetPath, ".address")),
                priceFeed: json.readAddress(string.concat(assetPath, ".priceFeed")),
                chainlinkPriceFeed: json.readAddress(string.concat(assetPath, ".chainlinkPriceFeed")),
                fallbackPriceFeed: json.readAddress(string.concat(assetPath, ".fallbackPriceFeed")),
                minBorrowCF: uint64(json.readUint(string.concat(assetPath, ".minBorrowCF"))),
                maxBorrowCF: uint64(json.readUint(string.concat(assetPath, ".maxBorrowCF"))),
                minLiquidateCF: uint64(json.readUint(string.concat(assetPath, ".minLiquidateCF"))),
                maxLiquidateCF: uint64(json.readUint(string.concat(assetPath, ".maxLiquidateCF"))),
                minLiquidationF: uint64(json.readUint(string.concat(assetPath, ".minLiquidationF"))),
                maxLiquidationF: uint64(json.readUint(string.concat(assetPath, ".maxLiquidationF"))),
                supplyCap: uint256(json.readUint(string.concat(assetPath, ".supplyCap")))
            });
    }

    function _readSandboxControllerConfig(string memory json) private pure returns (SandboxControllerConfig memory) {
        return
            SandboxControllerConfig({
                targetPercent: json.readUint(".sandboxControllerConfiguration.targetPercent"),
                storeFrontPriceFactor: json.readUint(".sandboxControllerConfiguration.storeFrontPriceFactor"),
                minUpdateTime: json.readUint(".sandboxControllerConfiguration.minUpdateTime"),
                maxUpdateTime: json.readUint(".sandboxControllerConfiguration.maxUpdateTime"),
                feeEnabled: json.readBool(".sandboxControllerConfiguration.feeEnabled"),
                reserveCommissions: [
                    json.readUint(".sandboxControllerConfiguration.reserveCommissions[0]"),
                    json.readUint(".sandboxControllerConfiguration.reserveCommissions[1]"),
                    json.readUint(".sandboxControllerConfiguration.reserveCommissions[2]")
                ],
                protocolCommissions: [
                    json.readUint(".sandboxControllerConfiguration.protocolCommissions[0]"),
                    json.readUint(".sandboxControllerConfiguration.protocolCommissions[1]"),
                    json.readUint(".sandboxControllerConfiguration.protocolCommissions[2]")
                ]
            });
    }
}
