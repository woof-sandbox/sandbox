// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.28;

import "forge-std/Script.sol";
import "../contracts/SandboxController.sol";
import "../contracts/ConfigControllerFactory.sol";
import "../contracts/SandboxCometFactory.sol";
import "../contracts/SandboxComet.sol";
import "../contracts/interfaces/ISandboxComet.sol";
import "../contracts/test/MockPriceFeed.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployProtocolArbitrum
 * @notice This script is used to deploy the protocol on Arbitrum.
 * @dev This script is used to deploy the protocol on Arbitrum.
 */
contract DeployProtocol is Script {
    address curator;
    address owner;
    uint256 ownerPrivateKey;
    uint256 userPrivateKey;
    address basePriceFeed1;
    address collateralPriceFeed1;
    address collateralPriceFeed2;
    address collateralPriceFeed3;
    address baseToken1 = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
    address collateralToken1 = 0x912CE59144191C1204E64559FE8253a0e49E6548;
    address collateralToken2 = 0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a;
    address collateralToken3 = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;

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

        // Deploy price feeds for Comet 1.
        basePriceFeed1 = deployPriceFeed(0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3, baseToken1);
        collateralPriceFeed1 = deployPriceFeed(0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6, collateralToken1);
        collateralPriceFeed2 = deployPriceFeed(0xDB98056FecFff59D032aB628337A4887110df3dB, collateralToken2);

        // Deploy test tokens and price feeds for Comet 2
        collateralPriceFeed3 = deployPriceFeed(0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612, collateralToken3);

        // Whitelist assets in SandboxController for Comet 1
        whitelistBaseAsset(sandboxController, baseToken1, basePriceFeed1);
        whitelistCollateralAsset(sandboxController, collateralToken1, collateralPriceFeed1);
        whitelistCollateralAsset(sandboxController, collateralToken2, collateralPriceFeed2);

        // Whitelist assets in SandboxController for Comet 2
        whitelistCollateralAsset(sandboxController, collateralToken3, collateralPriceFeed3);

        // Create ConfigController instances
        address configController1 = createConfigController(configControllerFactory, sandboxController, cometFactory, owner);

        IERC20(baseToken1).approve(configController1, type(uint256).max);

        address configController2 = createConfigController(configControllerFactory, sandboxController, cometFactory, owner);

        IERC20(baseToken1).approve(configController2, type(uint256).max);

        // Initialize arrays with correct sizes
        address[] memory collateralTokens1 = new address[](2);
        collateralTokens1[0] = collateralToken1;
        collateralTokens1[1] = collateralToken2;

        address[] memory collateralPriceFeeds1 = new address[](2);
        collateralPriceFeeds1[0] = collateralPriceFeed1;
        collateralPriceFeeds1[1] = collateralPriceFeed2;

        // Create Comet instances
        address comet1 = createComet(configController1, baseToken1, basePriceFeed1, collateralTokens1, collateralPriceFeeds1);

        address[] memory collateralTokens2 = new address[](3);
        collateralTokens2[0] = collateralToken1;
        collateralTokens2[1] = collateralToken2;
        collateralTokens2[2] = collateralToken3;

        address[] memory collateralPriceFeeds2 = new address[](3);
        collateralPriceFeeds2[0] = collateralPriceFeed1;
        collateralPriceFeeds2[1] = collateralPriceFeed2;
        collateralPriceFeeds2[2] = collateralPriceFeed3;

        address comet2 = createComet(configController2, baseToken1, basePriceFeed1, collateralTokens2, collateralPriceFeeds2);
        // Stop broadcasting
        vm.stopBroadcast();

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
        console.log("Collateral Token 1 (ARB):", collateralToken1);
        console.log("Collateral Price Feed 1:", collateralPriceFeed1);
        console.log("Collateral Token 2 (GMX):", collateralToken2);
        console.log("Collateral Price Feed 2:", collateralPriceFeed2);
        console.log("ConfigController 1:", configController1);
        console.log("Comet 1:", comet1);

        console.log("\nComet 2 Configuration:");
        console.log("Base Token (USDC):", baseToken1);
        console.log("Base Price Feed:", basePriceFeed1);
        console.log("Collateral Token 1 (ARB):", collateralToken1);
        console.log("Collateral Price Feed 1:", collateralPriceFeed1);
        console.log("Collateral Token 2 (GMX):", collateralToken2);
        console.log("Collateral Price Feed 2:", collateralPriceFeed2);
        console.log("Collateral Token 3 (WETH):", collateralToken3);
        console.log("Collateral Price Feed 3:", collateralPriceFeed3);
        console.log("ConfigController 2:", configController2);
        console.log("Comet 2:", comet2);
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

    function deploySandboxController(address owner) internal returns (address) {
        ISandboxController.SandboxControllerConfiguration memory config = ISandboxController.SandboxControllerConfiguration({
            targetPercent: 2e17, // 20%
            storeFrontPriceFactor: 6e17, // 60%
            minUpdateTime: 300, // 5 minutes
            maxUpdateTime: 3600 // 1 hour
        });
        // Deploy SandboxController with valid parameters
        SandboxController sandboxController = new SandboxController(
            owner, // owner
            address(1), // dao (different from owner)
            address(2), // treasury (for now random address)
            true, // feeEnabled
            config,
            [uint64(4e16), uint64(3e16), uint64(2e16)], // reserveCommissions
            [uint64(4e16), uint64(3e16), uint64(2e16)] // protocolCommissions
        );
        return address(sandboxController);
    }

    function deployPriceFeed(address _priceFeed, address _underlyingToken) internal returns (address) {
        // Deploy price feed
        MockPriceFeed priceFeed = new MockPriceFeed(8, _underlyingToken, _priceFeed);
        return address(priceFeed);
    }

    function whitelistBaseAsset(address sandboxControllerAddr, address baseToken, address basePriceFeed) internal {
        SandboxController sandboxController = SandboxController(sandboxControllerAddr);

        // Create base asset curve configuration
        ISandboxController.BaseAssetCurve memory curve = ISandboxController.BaseAssetCurve({
            supplyKink: 9e17, // 90%
            supplyPerYearInterestRateSlopeLow: 1141552511 * SECONDS_PER_YEAR,
            supplyPerYearInterestRateSlopeHigh: 101344495180 * SECONDS_PER_YEAR,
            supplyPerYearInterestRateBase: 0,
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
                borrowCollateralFactor: 8000, // 80%
                liquidateCollateralFactor: 8500, // 85%
                liquidationFactor: 5000 // 50%
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
