// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../contracts/SandboxController.sol";
import "../contracts/ConfigControllerFactory.sol";
import "../contracts/SandboxCometFactory.sol";
import "../contracts/SandboxComet.sol";
import "../contracts/test/ManagedFaucetToken.sol";
import "../contracts/test/ManagedSimplePriceFeed.sol";
import "../contracts/interfaces/ISandboxComet.sol";

contract DeployProtocol is Script {
    address curator;
    address owner;
    uint256 ownerPrivateKey;
    uint256 userPrivateKey;
    address basePriceFeed1;
    address collateralPriceFeed1;
    address collateralPriceFeed2;
    address collateralPriceFeed3;
    address collateralPriceFeed4;
    address baseToken1;
    address collateralToken1;
    address collateralToken2;
    address collateralToken3;
    address collateralToken4;

    uint64 internal constant SECONDS_PER_YEAR = 31_536_000;

    function run() external {
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
        address sandboxController = deploySandboxController(owner);

        // Deploy factories
        address configControllerFactory = deployConfigControllerFactory(sandboxController, configControllerImplementation);
        address cometFactory = deploySandboxCometFactory(cometImplementation, configControllerFactory, sandboxController);

        // Deploy test tokens and price feeds for Comet 1
        (baseToken1, basePriceFeed1) = deployBaseAsset("USDC", 6);
        (collateralToken1, collateralPriceFeed1) = deployCollateralAsset("WETH", 18);
        (collateralToken2, collateralPriceFeed2) = deployCollateralAsset("WBTC", 8);

        // Deploy test tokens and price feeds for Comet 2
        (collateralToken3, collateralPriceFeed3) = deployCollateralAsset("COMP", 18);
        (collateralToken4, collateralPriceFeed4) = deployCollateralAsset("LINK", 18);

        // Whitelist assets in SandboxController for Comet 1
        whitelistBaseAsset(sandboxController, baseToken1, basePriceFeed1);
        whitelistCollateralAsset(sandboxController, collateralToken1, collateralPriceFeed1);
        whitelistCollateralAsset(sandboxController, collateralToken2, collateralPriceFeed2);

        // Whitelist assets in SandboxController for Comet 2
        whitelistCollateralAsset(sandboxController, collateralToken3, collateralPriceFeed3);
        whitelistCollateralAsset(sandboxController, collateralToken4, collateralPriceFeed4);

        // Create ConfigController instances
        address configController1 = createConfigController(configControllerFactory, sandboxController, cometFactory, owner);

        address configController2 = createConfigController(configControllerFactory, sandboxController, cometFactory, owner);

        // Initialize arrays with correct sizes
        address[] memory collateralTokens1 = new address[](2);
        collateralTokens1[0] = collateralToken1;
        collateralTokens1[1] = collateralToken2;

        address[] memory collateralPriceFeeds1 = new address[](2);
        collateralPriceFeeds1[0] = collateralPriceFeed1;
        collateralPriceFeeds1[1] = collateralPriceFeed2;

        // Create Comet instances
        address comet1 = createComet(configController1, baseToken1, basePriceFeed1, collateralTokens1, collateralPriceFeeds1);

        address[] memory collateralTokens2 = new address[](4);
        collateralTokens2[0] = collateralToken1;
        collateralTokens2[1] = collateralToken2;
        collateralTokens2[2] = collateralToken3;
        collateralTokens2[3] = collateralToken4;

        address[] memory collateralPriceFeeds2 = new address[](4);
        collateralPriceFeeds2[0] = collateralPriceFeed1;
        collateralPriceFeeds2[1] = collateralPriceFeed2;
        collateralPriceFeeds2[2] = collateralPriceFeed3;
        collateralPriceFeeds2[3] = collateralPriceFeed4;

        address comet2 = createComet(configController2, baseToken1, basePriceFeed1, collateralTokens2, collateralPriceFeeds2);

        // Stop broadcasting
        vm.stopBroadcast();

        setPrices();

        // Log deployment addresses
        console.log("Owner Address:", owner);
        console.log("Comet Implementation:", cometImplementation);
        console.log("ConfigController Implementation:", configControllerImplementation);
        console.log("Comet Factory:", cometFactory);
        console.log("ConfigController Factory:", configControllerFactory);
        console.log("SandboxController:", sandboxController);

        console.log("\nComet 1 Configuration:");
        console.log("Base Token (USDC):", baseToken1);
        console.log("Base Price Feed:", basePriceFeed1);
        console.log("Collateral Token 1 (WETH):", collateralToken1);
        console.log("Collateral Price Feed 1:", collateralPriceFeed1);
        console.log("Collateral Token 2 (WBTC):", collateralToken2);
        console.log("Collateral Price Feed 2:", collateralPriceFeed2);
        console.log("ConfigController 1:", configController1);
        console.log("Comet 1:", comet1);

        console.log("\nComet 2 Configuration:");
        console.log("Base Token (USDC):", baseToken1);
        console.log("Base Price Feed:", basePriceFeed1);
        console.log("Collateral Token 1 (WETH):", collateralToken1);
        console.log("Collateral Price Feed 1:", collateralPriceFeed1);
        console.log("Collateral Token 2 (WBTC):", collateralToken2);
        console.log("Collateral Price Feed 2:", collateralPriceFeed2);
        console.log("Collateral Token 3 (COMP):", collateralToken3);
        console.log("Collateral Price Feed 3:", collateralPriceFeed3);
        console.log("Collateral Token 4 (LINK):", collateralToken4);
        console.log("Collateral Price Feed 4:", collateralPriceFeed4);
        console.log("ConfigController 2:", configController2);
        console.log("Comet 2:", comet2);
    }

    function setPrices() internal {
        vm.startBroadcast(ownerPrivateKey);

        console.log("Setting prices");
        ManagedSimplePriceFeed(basePriceFeed1).setRoundData(0, 99981900, block.timestamp, block.timestamp, 0); // USDC
        ManagedSimplePriceFeed(collateralPriceFeed1).setRoundData(0, 248628071000, block.timestamp, block.timestamp, 0); // WETH
        ManagedSimplePriceFeed(collateralPriceFeed2).setRoundData(0, 10357813578659, block.timestamp, block.timestamp, 0); // WBTC
        ManagedSimplePriceFeed(collateralPriceFeed3).setRoundData(0, 4915585997, block.timestamp, block.timestamp, 0); // COMP
        ManagedSimplePriceFeed(collateralPriceFeed4).setRoundData(0, 1318540000, block.timestamp, block.timestamp, 0); // LINK
        console.log("Prices set");

        vm.stopBroadcast();
    }

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

    function deploySandboxController(address owner_) internal returns (address) {
        // Deploy SandboxController with valid parameters
        SandboxController sandboxController = new SandboxController(
            owner_, // owner
            address(1), // dao (different from owner)
            address(2), // treasury (for now random address)
            true, // feeEnabled
            ISandboxController.SandboxControllerConfiguration({
                targetPercent: 2e17, // targetPercent (20%)
                storeFrontPriceFactor: 6e17, // storeFrontPriceFactor (60%)
                minUpdateTime: 300, // minUpdateTime (5 minutes)
                maxUpdateTime: 3600, // maxUpdateTime (1 hour)
                suggestedLockTimeOfSeedReserves: 3600, // suggestedLockTimeOfSeedReserves (1 hour)
                suggestedAmountOfSeedReserves: 250 // suggestedAmountOfSeedReserves
            }),
            [uint64(4e16), uint64(3e16), uint64(2e16)], // reserveCommissions
            [uint64(4e16), uint64(3e16), uint64(2e16)], // protocolCommissions
            7 days // removalCollateralDuration
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

        // Whitelist base asset
        sandboxController.whitelistBaseAsset(baseToken, basePriceFeed, curve, 10);
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
            9.5e17 // maxLiquidationFactor (95%)
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
        address[] memory collateralPriceFeeds
    ) internal returns (address) {
        IConfigController configController = IConfigController(configControllerAddr);

        // Create collateral token configuration
        IConfigController.CollateralTokenConfig[] memory collateralConfigs = new IConfigController.CollateralTokenConfig[](
            collateralTokens.length
        );

        for (uint i = 0; i < collateralTokens.length; i++) {
            collateralConfigs[i] = IConfigController.CollateralTokenConfig({
                collateralToken: collateralTokens[i],
                supplyCap: 1e24, // 1,000,000 tokens
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
