// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import { Script, console } from "forge/lib/forge-std/src/Script.sol";
import { SandboxController } from "contracts/SandboxController.sol";
import { ConfigController } from "contracts/ConfigController.sol";
import { ConfigControllerFactory } from "contracts/ConfigControllerFactory.sol";
import { IConfigController } from "contracts/interfaces/internal/sandbox/IConfigController.sol";
import { ISandboxController } from "contracts/interfaces/internal/sandbox/ISandboxController.sol";
import { SandboxCometFactory } from "contracts/SandboxCometFactory.sol";
import { SandboxComet } from "contracts/SandboxComet.sol";
import { ManagedFaucetToken } from "contracts/tests/ManagedFaucetToken.sol";
import { ManagedSimplePriceFeed } from "contracts/tests/ManagedSimplePriceFeed.sol";
import { HelperConfig } from "script/helpers/HelperConfig.s.sol";
import { IERC20Metadata } from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

contract DeployProtocol is Script {
    address curator;
    address owner;
    uint256 ownerPrivateKey;
    uint256 userPrivateKey;

    uint64 internal constant SECONDS_PER_YEAR = 31_536_000;
    uint256 internal constant MILLION = 1_000_000;

    function run() external {
        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.NetworkConfig memory config = helperConfig.getConfig();

        // Get owner's private key from .env
        ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        owner = vm.addr(ownerPrivateKey);
        userPrivateKey = vm.envUint("USER_PRIVATE_KEY");
        curator = vm.addr(userPrivateKey);
        console.log("Curator:", curator);
        // Start broadcasting transactions with owner's private key
        vm.startBroadcast(ownerPrivateKey);

        // Deploy implementation contracts
        address cometImplementation = deployCometImplementation();
        address configControllerImplementation = deployConfigControllerImplementation();

        // Deploy SandboxController
        address sandboxController = deploySandboxController();

        // Deploy factories
        address configControllerFactory = deployConfigControllerFactory(sandboxController, configControllerImplementation);
        address cometFactory = deploySandboxCometFactory(cometImplementation, configControllerFactory, sandboxController);

        // Whitelist USDC as base asset in SandboxController
        whitelistBaseAsset(sandboxController, config.usdc, config.usdcPriceFeed);

        // Whitelist collaterals
        // WETH
        whitelistCollateralAsset(sandboxController, config.weth, config.wethPriceFeed);
        // WBTC
        whitelistCollateralAsset(sandboxController, config.wbtc, config.wbtcPriceFeed);
        // COMP
        whitelistCollateralAsset(sandboxController, config.comp, config.compPriceFeed);
        // LINK
        whitelistCollateralAsset(sandboxController, config.link, config.linkPriceFeed);

        // Create ConfigController instances
        address configController1 = createConfigController(configControllerFactory, sandboxController, cometFactory, owner);

        address configController2 = createConfigController(configControllerFactory, sandboxController, cometFactory, owner);

        // Initialize arrays with correct sizes
        address[] memory collateralTokens1 = new address[](2);
        collateralTokens1[0] = config.weth;
        collateralTokens1[1] = config.wbtc;
        address[] memory collateralPriceFeeds1 = new address[](2);
        collateralPriceFeeds1[0] = config.wethPriceFeed;
        collateralPriceFeeds1[1] = config.wbtcPriceFeed;
        uint128[] memory supplyCaps1 = new uint128[](2);
        supplyCaps1[0] = 402207198880612340000; // 1 million $
        supplyCaps1[1] = 965454719; // 1 million $

        // Create Comet instances
        address comet1 = createComet(
            configController1,
            config.usdc,
            config.usdcPriceFeed,
            collateralTokens1,
            collateralPriceFeeds1,
            supplyCaps1
        );

        address[] memory collateralTokens2 = new address[](4);
        collateralTokens2[0] = config.weth;
        collateralTokens2[1] = config.wbtc;
        collateralTokens2[2] = config.comp;
        collateralTokens2[3] = config.link;

        address[] memory collateralPriceFeeds2 = new address[](4);
        collateralPriceFeeds2[0] = config.wethPriceFeed;
        collateralPriceFeeds2[1] = config.wbtcPriceFeed;
        collateralPriceFeeds2[2] = config.compPriceFeed;
        collateralPriceFeeds2[3] = config.linkPriceFeed;

        uint128[] memory supplyCaps2 = new uint128[](4);
        supplyCaps2[0] = 402207198880612340000; // 1 million $
        supplyCaps2[1] = 965454719; // 1 million $
        supplyCaps2[2] = 20343454485595485000000; // 1 million $
        supplyCaps2[3] = 75841461009904890000000; // 1 million $

        address comet2 = createComet(
            configController2,
            config.usdc,
            config.usdcPriceFeed,
            collateralTokens2,
            collateralPriceFeeds2,
            supplyCaps2
        );

        // Stop broadcasting
        vm.stopBroadcast();

        vm.startBroadcast(userPrivateKey);
        ConfigController(configController1).acceptCuratorRole();
        ConfigController(configController2).acceptCuratorRole();
        vm.stopBroadcast();

        // setPrices();

        // Log deployment addresses
        console.log("Token addresses:");
        console.log("USDC:", config.usdc);
        console.log("WETH:", config.weth);
        console.log("WBTC:", config.wbtc);
        console.log("COMP:", config.comp);
        console.log("LINK:", config.link);
        console.log("Price Feed addresses:");
        console.log("USDC Price Feed:", config.usdcPriceFeed);
        console.log("WETH Price Feed:", config.wethPriceFeed);
        console.log("WBTC Price Feed:", config.wbtcPriceFeed);
        console.log("COMP Price Feed:", config.compPriceFeed);
        console.log("LINK Price Feed:", config.linkPriceFeed);

        console.log("Owner Address:", owner);
        console.log("Comet Implementation:", cometImplementation);
        console.log("ConfigController Implementation:", configControllerImplementation);
        console.log("Comet Factory:", cometFactory);
        console.log("ConfigController Factory:", configControllerFactory);
        console.log("SandboxController:", sandboxController);

        console.log("\nComet 1 Configuration:");
        console.log("Base Token (USDC):");
        console.log("Collaterals: WETH, WBTC");
        console.log("ConfigController 1:", configController1);
        console.log("Comet 1:", comet1);

        console.log("\nComet 2 Configuration:");
        console.log("Base Token (USDC)");
        console.log("Collaterals: WETH, WBTC, COMP, LINK");
        console.log("ConfigController 2:", configController2);
        console.log("Comet 2:", comet2);
    }

    // function setPrices() internal {
    //     vm.startBroadcast(ownerPrivateKey);

    //     console.log("Setting prices");
    //     ManagedSimplePriceFeed(basePriceFeed1).setRoundData(0, 99981900, block.timestamp, block.timestamp, 0); // USDC
    //     ManagedSimplePriceFeed(collateralPriceFeed1).setRoundData(0, 248628071000, block.timestamp, block.timestamp, 0); // WETH
    //     ManagedSimplePriceFeed(collateralPriceFeed2).setRoundData(0, 10357813578659, block.timestamp, block.timestamp, 0); // WBTC
    //     ManagedSimplePriceFeed(collateralPriceFeed3).setRoundData(0, 4915585997, block.timestamp, block.timestamp, 0); // COMP
    //     ManagedSimplePriceFeed(collateralPriceFeed4).setRoundData(0, 1318540000, block.timestamp, block.timestamp, 0); // LINK
    //     console.log("Prices set");

    //     vm.stopBroadcast();
    // }

    function deployCometImplementation() internal returns (address) {
        // Deploy Comet implementation contract
        SandboxComet comet = new SandboxComet();
        return address(comet);
    }

    function deployConfigControllerImplementation() internal returns (address) {
        // Deploy ConfigController implementation contract
        ConfigController configController = new ConfigController();
        return address(configController);
    }

    function deploySandboxCometFactory(
        address cometImplementation,
        address configControlllerFactory,
        address sandboxController
    ) internal returns (address) {
        // Deploy CometFactory
        SandboxCometFactory cometFactory = new SandboxCometFactory(cometImplementation, configControlllerFactory);
        return address(cometFactory);
    }

    function deployConfigControllerFactory(address sandboxController, address configControllerImplementation) internal returns (address) {
        // Deploy ConfigControllerFactory
        ConfigControllerFactory configControllerFactory = new ConfigControllerFactory(sandboxController, configControllerImplementation);
        return address(configControllerFactory);
    }

    function deploySandboxController() internal returns (address) {
        // Create SandboxController configuration
        ISandboxController.SandboxControllerConfiguration memory config = ISandboxController.SandboxControllerConfiguration({
            targetPercent: 2e17, // 20%
            storeFrontPriceFactor: 6e17, // 60%
            minUpdateTime: 300, // 5 minutes
            maxUpdateTime: 3600 // 1 hour
        });
        // Deploy SandboxController with valid parameters
        SandboxController sandboxController = new SandboxController(
            address(2), // treasury (for now random address)
            true, // feeEnabled
            config,
            [uint64(4e16), uint64(3e16), uint64(2e16)], // reserveCommissions
            [uint64(4e16), uint64(3e16), uint64(2e16)] // protocolCommissions
        );
        return address(sandboxController);
    }

    function deployBaseAsset(string memory name, uint8 decimals) internal returns (address, address) {
        // Deploy test base token
        ManagedFaucetToken baseToken = new ManagedFaucetToken(
            1e24, // initialAmount
            name,
            decimals,
            name
        );

        // Deploy price feed for base token
        ManagedSimplePriceFeed basePriceFeed = new ManagedSimplePriceFeed(
            1e18, // initial price: 1.0
            8,
            address(baseToken)
        );

        return (address(baseToken), address(basePriceFeed));
    }

    function deployCollateralAsset(string memory name, uint8 decimals) internal returns (address, address) {
        // Deploy test collateral token
        ManagedFaucetToken collateralToken = new ManagedFaucetToken(
            1e24, // initialAmount
            name,
            decimals,
            name
        );

        // Deploy price feed for collateral token
        ManagedSimplePriceFeed collateralPriceFeed = new ManagedSimplePriceFeed(
            1e18, // initial price: 1.0
            8,
            address(collateralToken)
        );

        return (address(collateralToken), address(collateralPriceFeed));
    }

    function whitelistBaseAsset(address sandboxControllerAddr, address baseToken, address basePriceFeed) internal {
        SandboxController sandboxController = SandboxController(sandboxControllerAddr);

        // Create base asset curve configuration
        ISandboxController.BaseAssetCurve memory curve = ISandboxController.BaseAssetCurve({
            supplyKink: 9e17, // 90%
            supplyPerYearInterestRateSlopeLow: 1141552511 * SECONDS_PER_YEAR,
            supplyPerYearInterestRateSlopeHigh: 101344495180 * SECONDS_PER_YEAR,
            supplyPerYearInterestRateBase: 140000000 * SECONDS_PER_YEAR,
            borrowKink: 9e17, // 90%
            borrowPerYearInterestRateSlopeLow: 880834601 * SECONDS_PER_YEAR,
            borrowPerYearInterestRateSlopeHigh: 114155251141 * SECONDS_PER_YEAR,
            borrowPerYearInterestRateBase: 475646879 * SECONDS_PER_YEAR
        });

        uint256 suggestedAmountOfSeedReserves = 3600; // 3600 wei
        uint40 suggestedLockTimeOfSeedReserves = 604800; // 1 week

        // Whitelist base asset
        sandboxController.whitelistBaseAsset(
            baseToken,
            basePriceFeed,
            curve,
            10,
            suggestedAmountOfSeedReserves,
            suggestedLockTimeOfSeedReserves
        );
    }

    function whitelistCollateralAsset(address sandboxControllerAddr, address collateralToken, address collateralPriceFeed) internal {
        SandboxController sandboxController = SandboxController(sandboxControllerAddr);

        // Whitelist collateral asset
        sandboxController.whitelistCollateralAsset(
            collateralToken,
            collateralPriceFeed,
            8e17, // minBorrowCollateralFactor (80%)
            9e17, // maxBorrowCollateralFactor (90%)
            8.5e17, // minLiquidateCollateralFactor (85%)
            9.5e17, // maxLiquidateCollateralFactor (95%)
            8.5e17, // minLiquidationFactor (85%)
            9.5e17, // maxLiquidationFactor (95%)
            300_000 * 1e18 // 300k tokens as 15% of presumable 1mln supply
        );
    }

    function createConfigController(
        address configControllerFactoryAddr,
        address sandboxController,
        address cometFactory,
        address owner
    ) internal returns (address) {
        ConfigControllerFactory factory = ConfigControllerFactory(configControllerFactoryAddr);

        // Create new ConfigController instance
        address configController = factory.createConfigController(
            curator, // curator
            address(0), // guardian
            cometFactory,
            100, // curatorFee (1%)
            "Test Config Controller",
            3600, // curatorProposalDuration
            3600 // proposalDuration
        );

        return configController;
    }

    function createComet(
        address configControllerAddr,
        address baseToken,
        address basePriceFeed,
        address[] memory collateralTokens,
        address[] memory collateralPriceFeeds,
        uint128[] memory supplyCaps
    ) internal returns (address) {
        IConfigController configController = IConfigController(configControllerAddr);

        // Create collateral token configuration
        IConfigController.CollateralTokenConfig[] memory collateralConfigs = new IConfigController.CollateralTokenConfig[](
            collateralTokens.length
        );

        for (uint i = 0; i < collateralTokens.length; i++) {
            // (, int256 price, , , ) = ManagedSimplePriceFeed(collateralPriceFeeds[i]).latestRoundData();

            collateralConfigs[i] = IConfigController.CollateralTokenConfig({
                collateralToken: collateralTokens[i],
                supplyCap: supplyCaps[i], // 1 million tokens
                borrowCollateralFactor: 8.1e17, // 80%
                liquidateCollateralFactor: 8.5e17, // 85%
                liquidationFactor: 9e17 // 90%
            });
        }

        // Create comet config
        IConfigController.CometConfig memory cometConfig = IConfigController.CometConfig({
            baseToken: baseToken,
            baseTokenCurveId: 0, // Use first curve
            collateralTokens: collateralConfigs,
            name: "Comet"
        });

        // Create comet
        address comet = configController.createComet(cometConfig);

        return comet;
    }
}
