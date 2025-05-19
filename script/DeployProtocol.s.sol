// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../contracts/SandboxController.sol";
import "../contracts/ConfigControllerFactory.sol";
import "../contracts/MarketFactory.sol";
import "../contracts/SandboxComet.sol";
import "../contracts/test/ManagedFaucetToken.sol";
import "../contracts/test/ManagedSimplePriceFeed.sol";

contract DeployProtocol is Script {
    function run() external {
        // Get owner's private key from .env
        uint256 ownerPrivateKey = vm.envUint("OWNER_PRIVATE_KEY");
        address owner = vm.addr(ownerPrivateKey);

        // Start broadcasting transactions with owner's private key
        vm.startBroadcast(ownerPrivateKey);

        // Deploy implementation contracts
        address marketImplementation = deployMarketImplementation();
        address configControllerImplementation = deployConfigControllerImplementation();

        // Deploy SandboxController
        address sandboxController = deploySandboxController(owner);
        
        // Deploy factories
        address configControllerFactory = deployConfigControllerFactory(configControllerImplementation);
        address marketFactory = deployMarketFactory(marketImplementation, configControllerFactory, sandboxController);
        
        // Deploy test tokens and price feeds
        (address baseToken, address basePriceFeed) = deployBaseAsset();
        (address collateralToken, address collateralPriceFeed) = deployCollateralAsset();

        // Whitelist assets in SandboxController
        whitelistBaseAsset(sandboxController, baseToken, basePriceFeed);
        whitelistCollateralAsset(sandboxController, collateralToken, collateralPriceFeed);

        // Create ConfigController instance
        address configController = createConfigController(
            configControllerFactory,
            sandboxController,
            marketFactory,
            owner
        );

        // Create Market instance
        createMarket(
            configController,
            baseToken,
            basePriceFeed,
            collateralToken,
            collateralPriceFeed
        );

        // Stop broadcasting
        vm.stopBroadcast();

        // Log deployment addresses
        console.log("Owner Address:", owner);
        console.log("Market Implementation:", marketImplementation);
        console.log("ConfigController Implementation:", configControllerImplementation);
        console.log("Market Factory:", marketFactory);
        console.log("ConfigController Factory:", configControllerFactory);
        console.log("SandboxController:", sandboxController);
        console.log("Base Token:", baseToken);
        console.log("Base Price Feed:", basePriceFeed);
        console.log("Collateral Token:", collateralToken);
        console.log("Collateral Price Feed:", collateralPriceFeed);
        console.log("ConfigController:", configController);
    }

    function deployMarketImplementation() internal returns (address) {
        // Deploy Market implementation contract
        SandboxComet market = new SandboxComet();
        return address(market);
    }

    function deployConfigControllerImplementation() internal returns (address) {
        // Deploy ConfigController implementation contract
        ConfigController configController = new ConfigController();
        return address(configController);
    }

    function deployMarketFactory(address marketImplementation, address configControlllerFactory, address sandboxController) internal returns (address) {
        // Deploy MarketFactory
        MarketFactory marketFactory = new MarketFactory(
            marketImplementation,
            configControlllerFactory,
            sandboxController
        );
        return address(marketFactory);
    }

    function deployConfigControllerFactory(address configControllerImplementation) internal returns (address) {
        // Deploy ConfigControllerFactory
        ConfigControllerFactory configControllerFactory = new ConfigControllerFactory(
            configControllerImplementation
        );
        return address(configControllerFactory);
    }

    function deploySandboxController(address owner) internal returns (address) {
        // Deploy SandboxController with valid parameters
        SandboxController sandboxController = new SandboxController(
            owner, // owner
            address(1), // dao (different from owner)
            true, // feeEnabled
            3e17, // protocolFactorBorrow (30%)
            2e17, // reserveFactorBorrow (20%)
            3e17, // protocolFactorLiquidation (30%)
            2e17, // reserveFactorLiquidation (20%)
            5, // maxCollateralAssets
            2e17, // targetReserves (20%)
            95e16, // storeFrontPriceFactor (95%)
            300, // minUpdateTime (5 minutes)
            1e18, // suggestedAmountOfSeedReserves
            3600 // suggestedLockTimeOfSeedReserves (1 hour)
        );
        return address(sandboxController);
    }

    function deployBaseAsset() internal returns (address, address) {
        // Deploy test base token
        ManagedFaucetToken baseToken = new ManagedFaucetToken(
            1e24, // initialAmount
            "Test Base Token",
            8, // decimals
            "TBT"
        );

        // Deploy price feed for base token
        ManagedSimplePriceFeed basePriceFeed = new ManagedSimplePriceFeed(
            1e18, // initial price: 1.0
            8 // decimals
        );

        return (address(baseToken), address(basePriceFeed));
    }

    function deployCollateralAsset() internal returns (address, address) {
        // Deploy test collateral token
        ManagedFaucetToken collateralToken = new ManagedFaucetToken(
            1e24, // initialAmount
            "Test Collateral Token",
            8, // decimals
            "TCT"
        );

        // Deploy price feed for collateral token
        ManagedSimplePriceFeed collateralPriceFeed = new ManagedSimplePriceFeed(
            1e18, // initial price: 1.0
            8 // decimals
        );

        return (address(collateralToken), address(collateralPriceFeed));
    }

    function whitelistBaseAsset(
        address sandboxControllerAddr,
        address baseToken,
        address basePriceFeed
    ) internal {
        SandboxController sandboxController = SandboxController(sandboxControllerAddr);
        
        // Create base asset curve configuration
        ISandboxController.BaseAssetCurve memory curve = ISandboxController.BaseAssetCurve({
            supplyKink: 8e17, // 80%
            supplyPerYearInterestRateSlopeLow: 1e16, // 1%
            supplyPerYearInterestRateSlopeHigh: 2e16, // 2%
            supplyPerYearInterestRateBase: 1e16, // 1%
            borrowKink: 8e17, // 80%
            borrowPerYearInterestRateSlopeLow: 1e16, // 1%
            borrowPerYearInterestRateSlopeHigh: 2e16, // 2%
            borrowPerYearInterestRateBase: 1e16 // 1%
        });

        // Whitelist base asset
        sandboxController.whitelistBaseAsset(
            baseToken,
            basePriceFeed,
            curve,
            1e18 // minBorrow: 1.0
        );
    }

    function whitelistCollateralAsset(
        address sandboxControllerAddr,
        address collateralToken,
        address collateralPriceFeed
    ) internal {
        SandboxController sandboxController = SandboxController(sandboxControllerAddr);

        // Whitelist collateral asset
        sandboxController.whitelistCollateralAsset(
            collateralToken,
            collateralPriceFeed,
            8000, // minBorrowCollateralFactor (80%)
            9000, // maxBorrowCollateralFactor (90%)
            8500, // minLiquidateCollateralFactor (85%)
            9500, // maxLiquidateCollateralFactor (95%)
            5000, // minLiquidationFactor (50%)
            9000 // maxLiquidationFactor (90%)
        );
    }

    function createConfigController(
        address configControllerFactoryAddr,
        address sandboxController,
        address marketFactory,
        address owner
    ) internal returns (address) {
        ConfigControllerFactory factory = ConfigControllerFactory(configControllerFactoryAddr);

        // Create new ConfigController instance
        address configController = factory.createConfigController(
            owner, // owner
            owner, // curator
            owner, // guardian
            sandboxController,
            marketFactory,
            100, // curatorFee (1%)
            "Test Config Controller",
            7 days, // curatorProposalDuration
            7 days // proposalDuration
        );

        return configController;
    }

    function createMarket(
        address configControllerAddr,
        address baseToken,
        address basePriceFeed,
        address collateralToken,
        address collateralPriceFeed
    ) internal {
        IConfigController configController = IConfigController(configControllerAddr);

        // Create collateral token configuration
        IConfigController.CollateralTokenConfig[] memory collateralTokens = 
            new IConfigController.CollateralTokenConfig[](1);
        
        collateralTokens[0] = IConfigController.CollateralTokenConfig({
            collateralToken: collateralToken,
            priceFeed: collateralPriceFeed,
            borrowCollateralFactor: 8000, // 80%
            liquidateCollateralFactor: 8500, // 85%
            liquidationFactor: 5000, // 50%
            supplyCap: 1e24 // 1,000,000 tokens
        });

        // Create market configuration
        IConfigController.MarketConfig memory marketConfig = IConfigController.MarketConfig({
            baseToken: baseToken,
            priceFeed: basePriceFeed,
            collateralTokens: collateralTokens,
            baseTokenCurveId: 0 // Use first curve
        });

        // Create market
        address market = configController.createMarket(marketConfig);
        console.log("Market:", market);
    }
} 