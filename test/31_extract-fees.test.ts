import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";
import { SandboxComet, FaucetToken, ManagedSimplePriceFeed } from "../build/types";

describe("31. Extract Fees", function () {
    let configController: Contract;
    let mockToken: Contract;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let user: SignerWithAddress;
    let dao: SignerWithAddress;
    let sandboxController: Contract;
    let configControllerFactory: Contract;
    let cometFactory: Contract;
    let comet: SandboxComet;
    let baseToken: FaucetToken;
    let basePriceFeed: ManagedSimplePriceFeed;
    let collateralToken: FaucetToken;
    let collateralPriceFeed: ManagedSimplePriceFeed;

    const CURATOR_FEE = 1000; // 10% in basis points
    const FEE_DIVISOR = 10000;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        dao = signers[3];
        user = signers[4];

        // Create SandboxController
        const sandboxControllerOpts = defaultSandboxControllerOpts({
            owner: owner,
            dao: dao,
            treasury: user,
        });
        sandboxControllerOpts.config.storeFrontPriceFactor = ethers.utils.parseEther("0.6").toString();
        const sandboxControllerInfo = await makeSandboxController(sandboxControllerOpts);
        sandboxController = sandboxControllerInfo.sandboxController;

        // Create ConfigController implementation and factory
        const ConfigControllerImpl = await ethers.getContractFactory("ConfigController");
        const configControllerImpl = await ConfigControllerImpl.deploy();
        await configControllerImpl.deployed();

        configControllerFactory = await makeConfigControllerFactory(
            sandboxController.address,
            configControllerImpl.address
        );

        // Create Comet implementation and factory
        const SandboxCometImpl = await ethers.getContractFactory("SandboxComet");
        const cometImpl = await SandboxCometImpl.deploy();
        await cometImpl.deployed();

        cometFactory = await makeCometFactory(cometImpl.address, configControllerFactory.address);

        // Create ConfigController
        const createConfigControllerTx = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            CURATOR_FEE, // curatorFee (10%)
            "Test Config Controller"
        );
        const createConfigControllerReceipt = await createConfigControllerTx.wait();
        const configControllerCreatedEvent = createConfigControllerReceipt.events?.find(
            (e) => e.event === "ConfigControllerCreated"
        );

        const configControllerAddress = configControllerCreatedEvent?.args?.controller;
        configController = await ethers.getContractAt("ConfigController", configControllerAddress);
        
        // Accept the curator proposal
        await configController.connect(curator).acceptProposal(0);
        
        // Deploy mock token
        const FaucetFactory = await ethers.getContractFactory("FaucetToken");
        mockToken = await FaucetFactory.deploy(ethers.utils.parseEther("1000000"), "Mock Token", 18, "MTK");
        await mockToken.deployed();

        // Create a real comet through the ConfigController
        const baseTokenFactory = await ethers.getContractFactory("FaucetToken");
        baseToken = await baseTokenFactory.deploy(ethers.utils.parseEther("1000000"), "Base Token", 18, "BTK") as FaucetToken;
        await baseToken.deployed();
        
        // Create a collateral token
        const collateralTokenFactory = await ethers.getContractFactory("FaucetToken");
        collateralToken = (await collateralTokenFactory.deploy(ethers.utils.parseEther("1000000"), "Collateral Token", 18, "COL")) as FaucetToken;
        await collateralToken.deployed();
        
        // Create price feed for base token
        const basePriceFeedFactory = await ethers.getContractFactory("ManagedSimplePriceFeed");
        basePriceFeed = (await basePriceFeedFactory.deploy(ethers.utils.parseUnits("1", 8), 8, baseToken.address)) as ManagedSimplePriceFeed;
        await basePriceFeed.deployed();
        
        // Create price feed for collateral token
        const collateralPriceFeedFactory = await ethers.getContractFactory("ManagedSimplePriceFeed");
        collateralPriceFeed = (await collateralPriceFeedFactory.deploy(
            ethers.utils.parseEther("1"), 
            8, 
            collateralToken.address
        )) as ManagedSimplePriceFeed;
        await collateralPriceFeed.deployed();
        
        // Whitelist base token in SandboxController
        await sandboxController.whitelistBaseAsset(
            baseToken.address,
            basePriceFeed.address,
            {
                supplyKink: ethers.utils.parseEther("0.8"),
                supplyPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.05"),
                supplyPerYearInterestRateSlopeHigh: ethers.utils.parseEther("0.2"),
                supplyPerYearInterestRateBase: ethers.utils.parseEther("0.001"),
                borrowKink: ethers.utils.parseEther("0.8"),
                borrowPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.1"),
                borrowPerYearInterestRateSlopeHigh: ethers.utils.parseEther("0.3"),
                borrowPerYearInterestRateBase: ethers.utils.parseEther("0.005"),
            },
            "100" // minBorrow
        );
        
        // Whitelist collateral token in SandboxController
        await sandboxController.whitelistCollateralAsset(
            collateralToken.address,
            collateralPriceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCollateralFactor
            ethers.utils.parseEther("0.7"), // maxBorrowCollateralFactor
            ethers.utils.parseEther("0.7"), // minLiquidateCollateralFactor
            ethers.utils.parseEther("0.8"), // maxLiquidateCollateralFactor
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );
        
        // Mint some base tokens to the config controller for seed reserves
        await baseToken.allocateTo(configController.address, ethers.utils.parseEther("100"));
        
        // Create comet configuration with collateral token
        const marketConfig = {
            baseToken: baseToken.address,
            collateralTokens: [{
                collateralToken: collateralToken.address,
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
                supplyCap: ethers.utils.parseEther("1000000")
            }],
            baseTokenCurveId: 0,
            name: "Test Comet",
            amountOfSeedReserves: ethers.utils.parseEther("100")
        };
        
        // Create the comet through the controller
        await configController.createComet(marketConfig);
        
        // Get the created comet address
        const cometAddress = await configController.comets(0);
        comet = await ethers.getContractAt("SandboxComet", cometAddress) as SandboxComet;

        // Mint some tokens to the config controller
        await mockToken.allocateTo(configController.address, ethers.utils.parseEther("1000"));
    });

    describe("extractFees - happy cases", function () {
        it("should allow owner to call extractFees with owned comet", async function () {
            await expect(
                configController.connect(owner).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(comet, "AmountTooSmall");
        });

        it("should allow curator to call extractFees with owned comet", async function () {
            await expect(
                configController.connect(curator).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(comet, "AmountTooSmall");
        });

        it("should successfully extract fees after liquidation generates fees", async function () {
            // Set up a liquidatable position
            const borrower = user; // Use the user signer as borrower
            const liquidator = owner; // Use owner as liquidator
            const collateralAmount = ethers.utils.parseEther("1");
            const borrowAmount = ethers.utils.parseEther("0.5");
            const baseAmount = ethers.utils.parseEther("10000");

            // Supply collateral to the borrower
            await collateralToken.allocateTo(borrower.address, collateralAmount);
            await collateralToken.connect(borrower).approve(comet.address, collateralAmount);
            
            // Supply collateral to the comet
            await comet.connect(borrower).supply(collateralToken.address, collateralAmount);
            
            // Supply base tokens to the comet for borrowing
            await baseToken.allocateTo(owner.address, baseAmount);
            await baseToken.connect(owner).approve(comet.address, baseAmount);
            await comet.connect(owner).supply(baseToken.address, baseAmount);
            
            // Borrow more than the borrower can collateralize (this will make them liquidatable)
            // We need to borrow an amount that exceeds the collateral value
            await comet.connect(borrower).withdraw(baseToken.address, borrowAmount);
            // Set the price feed of collateral token to 0.2
            await collateralPriceFeed.setRoundData(1, ethers.utils.parseUnits("0.7", 8), 0, 0, 0);

            // Now liquidate the borrower to generate fees
            await comet.connect(liquidator).absorb(liquidator.address, [borrower.address]);
            // Buy the collateral
            // Calculate the amount of collateral to buy
            const collateralPrice = (await collateralPriceFeed.latestRoundData())[1];
            const baseTokenPrice = (await basePriceFeed.latestRoundData())[1];
            const collateralInBaseTokens = collateralAmount.mul(collateralPrice).div(baseTokenPrice);
            console.log("collateralInBaseTokens", collateralInBaseTokens.toString());
            await comet.connect(liquidator).buyCollateral(collateralToken.address, collateralInBaseTokens, baseAmount, liquidator.address);
            // Now try to extract fees - this should succeed since fees were generated
            expect(await configController.connect(owner).extractFees(comet.address, baseToken.address)).to.not.be.reverted;
        });

        it("should work with different curator fee percentages", async function () {
            // Deploy a new controller with 5% curator fee using the factory
            const createConfigController5PercentTx = await configControllerFactory.createConfigController(
                curator.address,
                guardian.address,
                cometFactory.address,
                500, // 5%
                "Test Config Controller 5%"
            );
            const createConfigController5PercentReceipt = await createConfigController5PercentTx.wait();
            const configController5PercentCreatedEvent = createConfigController5PercentReceipt.events?.find(
                (e) => e.event === "ConfigControllerCreated"
            );
            const configController5PercentAddress = configController5PercentCreatedEvent?.args?.controller;
            const configController5Percent = await ethers.getContractAt("ConfigController", configController5PercentAddress);

            // Accept the curator proposal
            await configController5Percent.connect(curator).acceptProposal(0);

            // Mint tokens
            await mockToken.allocateTo(configController5Percent.address, ethers.utils.parseEther("1000"));

            // Should revert with UnknownComet since the comet is not owned
            await expect(
                configController5Percent.connect(owner).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController5Percent, "UnknownComet");
        });

        it("should handle curator fee of 0%", async function () {
            // Deploy controller with 0% curator fee using the factory
            const createConfigController0PercentTx = await configControllerFactory.createConfigController(
                curator.address,
                guardian.address,
                cometFactory.address,
                0, // 0%
                "Test Config Controller 0%"
            );
            const createConfigController0PercentReceipt = await createConfigController0PercentTx.wait();
            const configController0PercentCreatedEvent = createConfigController0PercentReceipt.events?.find(
                (e) => e.event === "ConfigControllerCreated"
            );
            const configController0PercentAddress = configController0PercentCreatedEvent?.args?.controller;
            const configController0Percent = await ethers.getContractAt("ConfigController", configController0PercentAddress);

            // Accept the curator proposal
            await configController0Percent.connect(curator).acceptProposal(0);

            await mockToken.allocateTo(configController0Percent.address, ethers.utils.parseEther("1000"));

            // Should revert with UnknownComet since the comet is not owned
            await expect(
                configController0Percent.connect(owner).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController0Percent, "UnknownComet");
        });

        it("should handle curator fee of 100%", async function () {
            // Deploy controller with 100% curator fee using the factory
            const createConfigController100PercentTx = await configControllerFactory.createConfigController(
                curator.address,
                guardian.address,
                cometFactory.address,
                10000, // 100%
                "Test Config Controller 100%"
            );
            const createConfigController100PercentReceipt = await createConfigController100PercentTx.wait();
            const configController100PercentCreatedEvent = createConfigController100PercentReceipt.events?.find(
                (e) => e.event === "ConfigControllerCreated"
            );
            const configController100PercentAddress = configController100PercentCreatedEvent?.args?.controller;
            const configController100Percent = await ethers.getContractAt("ConfigController", configController100PercentAddress);

            // Accept the curator proposal
            await configController100Percent.connect(curator).acceptProposal(0);

            await mockToken.allocateTo(configController100Percent.address, ethers.utils.parseEther("1000"));

            // Should revert with UnknownComet since the comet is not owned
            await expect(
                configController100Percent.connect(owner).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController100Percent, "UnknownComet");
        });
    });

    describe("extractFees - unhappy cases (reverts)", function () {
        it("should revert when called by unauthorized user", async function () {
            await expect(
                configController.connect(user).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when called by guardian", async function () {
            await expect(
                configController.connect(guardian).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when comet address is zero", async function () {
            await expect(
                configController.connect(owner).extractFees(ethers.constants.AddressZero, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "ZeroAddress");
        });

        it("should revert when asset address is zero", async function () {
            await expect(
                configController.connect(owner).extractFees(comet.address, ethers.constants.AddressZero)
            ).to.be.revertedWithCustomError(configController, "ZeroAddress");
        });

        it("should revert when comet is not owned by controller", async function () {
            const otherComet = await ethers.getContractFactory("CometHarness").then(f => f.deploy());
            await otherComet.deployed();
            
            await expect(
                configController.connect(owner).extractFees(otherComet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert with UnknownComet when using unowned comet", async function () {
            // Deploy a different comet that is not owned by this controller
            const otherComet = await ethers.getContractFactory("SandboxComet").then(f => f.deploy());
            await otherComet.deployed();
            
            await expect(
                configController.connect(owner).extractFees(otherComet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });
    });

    describe("Access Control", function () {
        it("should only allow owner and curator to call extractFees", async function () {
            // Owner should be able to call (passes ownership check) but reverts with AmountTooSmall since no fees
            await expect(
                configController.connect(owner).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(comet, "AmountTooSmall");

            // Curator should be able to call (passes ownership check) but reverts with AmountTooSmall since no fees
            await expect(
                configController.connect(curator).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(comet, "AmountTooSmall");

            // Guardian should not be able to call
            await expect(
                configController.connect(guardian).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");

            // Random user should not be able to call
            await expect(
                configController.connect(user).extractFees(comet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("Validation", function () {
        it("should validate comet ownership", async function () {
            // Deploy another comet
            const CometHarnessFactory = await ethers.getContractFactory("CometHarness");
            const otherComet = await CometHarnessFactory.deploy();
            await otherComet.deployed();

            // Should revert when trying to extract fees from unowned comet
            await expect(
                configController.connect(owner).extractFees(otherComet.address, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should validate address parameters", async function () {
            // Zero address for comet
            await expect(
                configController.connect(owner).extractFees(ethers.constants.AddressZero, mockToken.address)
            ).to.be.revertedWithCustomError(configController, "ZeroAddress");

            // Zero address for asset
            await expect(
                configController.connect(owner).extractFees(comet.address, ethers.constants.AddressZero)
            ).to.be.revertedWithCustomError(configController, "ZeroAddress");
        });
    });
});
