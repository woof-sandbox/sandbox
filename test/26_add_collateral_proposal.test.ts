import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { 
    SandboxController, 
    ConfigController,
    FaucetToken,
    SandboxComet,
    SimplePriceFeed,
    FaucetToken__factory,
    SimplePriceFeed__factory,
    ConfigControllerProposalTest
} from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { expect, exp, defaultAssets, defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";
import { CollateralTokenConfigStruct, ProposeNewCollateralTokenEvent } from "../build/types/ConfigController";
import { CollateralAssetStruct } from "../build/types/SandboxComet";

// Interface for addCollateralToken function
const iface = new ethers.utils.Interface([
    "function addCollateralAsset(tuple(address collateralToken, uint128 supplyCap, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor))"
]);

describe("26. Create Add Collateral Proposal", () => {
    let configController: ConfigController;
    let sandboxController: SandboxController;
    let sandboxComet: SandboxComet;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let users: [SignerWithAddress];
    let cometAddress: string;
    let calldata1: string;
    let calldata2: string;
    let proposalType: number;
    let baseToken: FaucetToken;
    let newCollateralToken1: FaucetToken;
    let newCollateralToken2: FaucetToken;
    let priceFeeds: { [symbol: string]: SimplePriceFeed };
    let tokens: { [symbol: string]: FaucetToken };
    let collateralConfig1: CollateralTokenConfigStruct;
    let collateralConfig2: CollateralTokenConfigStruct;
    let numAssets: number;
    // Constants for new collateral proposal
    const PROPOSE_NEW_COLLATERAL_LIFETIME = 2 * 7 * 24 * 60 * 60; // 2 weeks
    const PROPOSE_NEW_COLLATERAL_MATURITY = 1 * 7 * 24 * 60 * 60; // 1 week
    const PROPOSE_NEW_COLLATERAL_TIMELOCK = 0; // 0 seconds

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        const dao = signers[3];
        users = [signers[4]] as [SignerWithAddress];

        // Create tokens
        const assets = defaultAssets();
        const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
        tokens = {};
        for (const symbol in assets) {
            const config = assets[symbol];
            const decimals = config.decimals || 18;
            const initial = (config.initial != undefined && config.initial.toString()) || 1e6;
            const name = config.name || symbol;
            const token = (await FaucetFactory.deploy(initial, name, decimals, symbol)) as FaucetToken;
            await token.deployed();
            tokens[symbol] = token;
        }

        baseToken = tokens["USDC"];
        newCollateralToken1 = tokens["WETH"];
        newCollateralToken2 = tokens["WBTC"];
        // Create price feeds
        const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
        priceFeeds = {};
        for (const asset in assets) {
            const initialPrice = exp(assets[asset].initialPrice || 1, 8);
            const priceFeedDecimals = assets[asset].priceFeedDecimals || 8;
            const priceFeed = await PriceFeedFactory.deploy(initialPrice, priceFeedDecimals, tokens[asset].address);
            await priceFeed.deployed();
            priceFeeds[asset] = priceFeed;
        }

        // Create SandboxController
        const sandboxControllerOpts = defaultSandboxControllerOpts({
            owner: owner,
            dao: dao,
            treasury: users[0]
        });
        const sandboxControllerInfo = await makeSandboxController(sandboxControllerOpts);
        sandboxController = sandboxControllerInfo.sandboxController;

        // Allocate base token to owner and approve
        await baseToken.allocateTo(owner.address, sandboxControllerOpts.config.suggestedAmountOfSeedReserves);
        
        await sandboxController.whitelistBaseAsset(
            baseToken.address,
            priceFeeds["USDC"].address,
            {
                supplyKink: exp(0.8, 18),
                supplyPerYearInterestRateSlopeLow: exp(0.05, 18),
                supplyPerYearInterestRateSlopeHigh: exp(0.2, 18),
                supplyPerYearInterestRateBase: exp(0.001, 18),
                borrowKink: exp(0.8, 18),
                borrowPerYearInterestRateSlopeLow: exp(0.1, 18),
                borrowPerYearInterestRateSlopeHigh: exp(0.3, 18),
                borrowPerYearInterestRateBase: exp(0.005, 18),
            },
            exp(1, await baseToken.decimals())
        );

        // Whitelist collateral assets (excluding the one we'll add via proposal)
        for (const symbol in assets) {
            if (symbol !== "USDC") {
                const token = tokens[symbol];
                const priceFeed = priceFeeds[symbol];
                await sandboxController.whitelistCollateralAsset(
                    token.address,
                    priceFeed.address,
                    exp(0.5, 18), // minBorrowCollateralFactor
                    exp(0.7, 18), // maxBorrowCollateralFactor
                    exp(0.7, 18), // minLiquidateCollateralFactor
                    exp(0.8, 18), // maxLiquidateCollateralFactor
                    exp(0.8, 18), // minLiquidationFactor
                    exp(1.0, 18)  // maxLiquidationFactor
                );
            }
        }

        // Create ConfigController infrastructure
        const configControllerImpl = await (await ethers.getContractFactory("ConfigController")).deploy();
        await configControllerImpl.deployed();

        const configControllerFactory = await makeConfigControllerFactory(
            sandboxController.address,
            configControllerImpl.address
        );

        const sandboxCometImpl = await (await ethers.getContractFactory("SandboxComet")).deploy();
        await sandboxCometImpl.deployed();

        const cometFactory = await makeCometFactory(
            sandboxCometImpl.address, // Use the deployed implementation contract
            configControllerFactory.address // Use the configControllerFactory
        );

        // Create ConfigController
        const tx = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            1000, // curatorFee: 10%
            "Test Config Controller"
        );
        const receipt = await tx.wait();
        const event = receipt.events?.find(e => e.event === "ConfigControllerCreated");
        const configControllerAddress = event?.args?.[0];
        configController = await ethers.getContractAt("ConfigController", configControllerAddress) as ConfigController;

        // Accept curator proposal
        await configController.connect(curator).acceptProposal(0);

        // Create Comet
        const collateralTokens = [];
        for (const symbol in assets) {
            if (symbol !== "USDC" && symbol !== "WETH" && symbol !== "WBTC") {
                const token = tokens[symbol];
                collateralTokens.push({
                    collateralToken: token.address,
                    supplyCap: exp(1000000, await token.decimals()),
                    borrowCollateralFactor: exp(0.6, 18),
                    liquidateCollateralFactor: exp(0.7, 18),
                    liquidationFactor: exp(0.8, 18)
                });
            }
        }

        const marketConfig = {
            baseToken: baseToken.address,
            baseTokenCurveId: 0,
            collateralTokens: collateralTokens,
            name: "Test Market"
        };

        await configController.createComet(marketConfig);
        cometAddress = await configController.comets(0);
        sandboxComet = await ethers.getContractAt("SandboxComet", cometAddress) as SandboxComet;
        numAssets = await sandboxComet.numAssets();
        // Prepare proposal-specific data
        collateralConfig1 = {
            collateralToken: newCollateralToken1.address,
            supplyCap: exp(1000000, await newCollateralToken1.decimals()),
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.7, 18),
            liquidationFactor: exp(0.8, 18)
        };
        collateralConfig2 = {
            collateralToken: newCollateralToken2.address,
            supplyCap: exp(1000000, await newCollateralToken2.decimals()),
            borrowCollateralFactor: exp(0.6, 18),
            liquidateCollateralFactor: exp(0.7, 18),
            liquidationFactor: exp(0.8, 18)
        };
        calldata1 = iface.encodeFunctionData("addCollateralAsset", [collateralConfig1]);
        calldata2 = iface.encodeFunctionData("addCollateralAsset", [collateralConfig2]);
        proposalType = 1; // ProposeNewCollateralToken

        // Take snapshot
        snapshot = await takeSnapshot();
    });

    describe("create ProposeNewCollateralToken proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should create a ProposeNewCollateralToken proposal", async() => {
            await expect(configController.connect(owner).createProposal(calldata1, cometAddress, proposalType)).to.not.be.reverted;
        });

        it("should show that the proposal counter is incremented", async () => {
            const beforeCallCounter = await configController.proposalCounter();
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const afterCallCounter = await configController.proposalCounter();
            expect(afterCallCounter).to.equal(beforeCallCounter.add(1));
        });

        it("should show that the proposal data is saved correctly", async () => {
            const tx = await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const receipt = await tx.wait();
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
            const proposal = await configController.proposals(await configController.proposalCounter());

            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata1);
            expect(proposal.maturityTime).to.equal(blockTimestamp + PROPOSE_NEW_COLLATERAL_MATURITY);
            expect(proposal.expirationTime).to.equal(blockTimestamp + PROPOSE_NEW_COLLATERAL_LIFETIME);
            expect(proposal.timelock).to.equal(blockTimestamp + PROPOSE_NEW_COLLATERAL_TIMELOCK);
        });

        it("should emit the event when the proposal is created", async () => {
            const tx = await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(await configController.proposalCounter());
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should made the proposal with the same calldata twice", async () => {
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
        });

        it("should create a proposal by the curator", async () => {
            await expect(configController.connect(curator).createProposal(calldata1, cometAddress, proposalType)).to.not.be.reverted;
        });

        it("should create two proposals with equal parameters", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            const proposal1 = await configController.proposals(proposalId1);
            expect(proposal1.proposer).to.equal(owner.address);
            expect(proposal1.proposalType).to.equal(proposalType);
            expect(proposal1.comet).to.equal(cometAddress);
            expect(proposal1.call).to.equal(calldata1);

            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();
            const proposal2 = await configController.proposals(proposalId2);
            expect(proposal2.proposer).to.equal(owner.address);
            expect(proposal2.proposalType).to.equal(proposalType);
            expect(proposal2.comet).to.equal(cometAddress);
            expect(proposal2.call).to.equal(calldata1);
        });
    });

    describe("create ProposeNewCollateralToken proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to create proposal", async () => {
            await expect(
                configController.connect(users[0]).createProposal(calldata1, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when invalid proposal type is used", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata1, cometAddress, 99)
            ).to.be.revertedWithCustomError(configController, "InvalidProposalType");
        });

        it("should revert when invalid selector is used", async () => {
            const invalidCalldata = "0x12345678";
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should revert when trying to add base token as collateral", async () => {
            const invalidCollateralConfig = {
                collateralToken: baseToken.address,
                supplyCap: exp(1000000, await baseToken.decimals()),
                borrowCollateralFactor: exp(0.8, 18),
                liquidateCollateralFactor: exp(0.9, 18),
                liquidationFactor: exp(0.1, 18)
            };
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidCollateralConfig]);
            
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
        });

        it("should revert when trying to add already added collateral token", async () => {
            // First add the token
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId);

            // Try to add the same token again
            await expect(
                configController.connect(owner).createProposal(calldata1, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "CollateralTokenAlreadyAdded");
            
            snapshot.restore();
        });

        it("should revert when unknown comet is used", async () => {
            const unknownComet = "0x1234567890123456789012345678901234567890";
            await expect(
                configController.connect(owner).createProposal(calldata1, unknownComet, proposalType)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when calldata is too short", async () => {
            const wrongCalldata = calldata1.slice(0, -10);
            await expect(configController.createProposal(wrongCalldata, cometAddress, proposalType)).to.be.reverted;
        });

        it("should revert when calldata structure is wrong", async () => {
            const wrongCollateralConfig = {
                collateralToken: newCollateralToken1.address,
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(0.8, 18)
            };
            const wrongIface = new ethers.utils.Interface([
                "function addCollateralAsset((address collateralToken, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor))"
            ]);
            const wrongCalldata = wrongIface.encodeFunctionData("addCollateralAsset", [wrongCollateralConfig]);
            const ADD_COLLATERAL_SELECTOR = "0xfad67aaa";
            const wrongCalldataWithSelector = ADD_COLLATERAL_SELECTOR + wrongCalldata.slice(10);
            await expect(configController.createProposal(wrongCalldataWithSelector, cometAddress, proposalType)).to.be.reverted;
        });

        it("should revert when guardian tries to create proposal", async () => {
            await expect(configController.connect(guardian).createProposal(calldata1, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when collateral token is not whitelisted", async () => {
            const FaucetFactory = await ethers.getContractFactory("FaucetToken");
            const unwhitelistedToken = await FaucetFactory.deploy(
                exp(1000000, 18),
                "Unwhitelisted Token",
                18,
                "UWT"
            );
            await unwhitelistedToken.deployed();
            
            const unwhitelistedConfig = {
                collateralToken: unwhitelistedToken.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(0.8, 18)
            };
            
            const unwhitelistedCalldata = iface.encodeFunctionData("addCollateralAsset", [unwhitelistedConfig]);
            
            await expect(configController.createProposal(unwhitelistedCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "CollateralTokenNotWhitelisted");
        });

        it("should revert when supply cap is zero", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: 0,
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(0.8, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "SupplyCapCantBeZero");
        });

        it("should revert when collateral factors are in wrong order", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.8, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(0.9, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
        });

        it("should revert when borrow collateral factor is too high", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                liquidateCollateralFactor: exp(0.71, 18),
                borrowCollateralFactor: exp(0.701, 18),
                liquidationFactor: exp(0.8, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "BorrowCollateralFactorTooHigh");
        });

        it("should revert when borrow collateral factor is too low", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.4, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(0.8, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "BorrowCollateralFactorTooLow");
        });

        it("should revert when liquidate collateral factor is too high", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.9, 18),
                liquidationFactor: exp(0.95, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "LiquidateCollateralFactorTooHigh");
        });

        it("should revert when liquidate collateral factor is too low", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.59, 18),
                liquidateCollateralFactor: exp(0.59, 18),
                liquidationFactor: exp(0.8, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "LiquidateCollateralFactorTooLow");
        });

        it("should revert when liquidation factor is too high", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(1.1, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "LiquidationFactorTooHigh");
        });

        it("should revert when liquidation factor is too low", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.7, 18),
                liquidationFactor: exp(0.7, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "LiquidationFactorTooLow");
        });

        it("should revert when liquidate collateral factor is greater than liquidation factor", async () => {
            const invalidConfig = {
                collateralToken: newCollateralToken1.address,
                supplyCap: exp(1000000, 18),
                borrowCollateralFactor: exp(0.6, 18),
                liquidateCollateralFactor: exp(0.9, 18),
                liquidationFactor: exp(0.8, 18)
            };
            
            const invalidCalldata = iface.encodeFunctionData("addCollateralAsset", [invalidConfig]);
            
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "WrongCollateralTokenSettings");
        });

        it("should revert when comet address is zero", async () => {
            await expect(configController.createProposal(calldata1, ethers.constants.AddressZero, proposalType)).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when calldata is malformed", async () => {
            const malformedCalldata = calldata1.slice(0, -10);
            await expect(configController.createProposal(malformedCalldata, cometAddress, proposalType)).to.be.reverted;
        });

        it("should revert when empty calldata", async () => {
            await expect(configController.createProposal("0x", cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });
    });

    describe("cancel ProposeNewCollateralToken proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal when the proposal not in the maturity period by the owner", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal when the proposal not in the maturity period by the curator if the curator is the proposer", async () => {
            await configController.connect(curator).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal by the owner if curator is the proposer", async () => {
            await configController.connect(curator).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal by the owner when the proposal is in the maturity period", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should update the storage when the proposal is cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata1);
        });

        it("should emit the event when the proposal is cancelled by the owner", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should cancel the proposal by the curator if the curator is proposed", async () => {
            await configController.connect(curator).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should update the storage when the proposal is cancelled by the curator", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata1);
        });

        it("should emit the event when the proposal is cancelled by the curator", async () => {
            await configController.connect(curator).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(curator).cancelProposal(proposalId);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(curator.address);
        });

        it("should cancel the proposal by the guardian", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should update the storage when the proposal is cancelled by the guardian", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata1);
        });

        it("should emit the event when the proposal is cancelled by the guardian", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(guardian).cancelProposal(proposalId);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(guardian.address);
        });
    });

    describe("cancel ProposeNewCollateralToken proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to cancel proposal", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when proposal is not active", async () => {
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(owner).cancelProposal(proposalId.add(1))).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is expired", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_LIFETIME + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when proposal is out of the maturity period and the guardian is try to cancel the proposal", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when the proposal is created by the owner and the curator is try to cancel the proposal that is in the maturity period", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when the proposal is created by the curator and the guardian is try to cancel the proposal that is out of the maturity period", async () => {
            await configController.connect(curator).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("accept ProposeNewCollateralToken proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should accept the proposal", async () => {
            await configController.createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).acceptProposal(proposalId)).to.not.be.reverted;
        });

        it("should emit the event when the proposal is accepted", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            
            const tx = await configController.connect(owner).acceptProposal(proposalId);
            const receipt = await tx.wait();
            const event = receipt.events?.find(
                (e) => e.event === "ProposeNewCollateralTokenAccepted"
            );
            expect(event).to.not.be.undefined;
            expect(event?.args[0]).to.equal(proposalId);
            expect(event?.args[1]).to.equal(owner.address);
        });

        it("should correctly change the storage", async () => {
            const proposalId = await configController.proposalCounter();
            
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata1);
        });

        it("should add the collateral token to the comet", async () => {
            expect(await sandboxComet.getAssetInfoByAddress(newCollateralToken1.address)).to.not.be.undefined;
        });

        it("should correctly update the numAssets", async () => {
            expect(await sandboxComet.numAssets()).to.equal(numAssets + 1);
        });

        it("should store the collateral token config in the comet", async () => {
            const assetInfo: CollateralAssetStruct = <CollateralAssetStruct>(await sandboxComet.getAssetInfoByAddress(newCollateralToken1.address))[0];
            expect(assetInfo.supplyCap).to.equal(collateralConfig1.supplyCap);
            expect(assetInfo.borrowCollateralFactor).to.equal(collateralConfig1.borrowCollateralFactor);
            expect(assetInfo.liquidateCollateralFactor).to.equal(collateralConfig1.liquidateCollateralFactor);
            expect(assetInfo.liquidationFactor).to.equal(collateralConfig1.liquidationFactor);
            expect(assetInfo.collateralToken).to.equal(newCollateralToken1.address);
        });

        it("should allow curator to accept proposal if the curator is the proposer", async () => {
            await snapshot.restore();
            await configController.connect(curator).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(curator).acceptProposal(proposalId)).to.not.be.reverted;
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            // Create first proposal
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            
            await configController.connect(owner).createProposal(calldata2, cometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();
            
            // Accept first proposal
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId1);
            
            // Accept second proposal
            await configController.connect(owner).acceptProposal(proposalId2);
            
            // Verify both proposals were accepted
            const proposal1 = await configController.proposals(proposalId1);
            const proposal2 = await configController.proposals(proposalId2);
            expect(proposal1.expirationTime).to.equal(0);
            expect(proposal2.expirationTime).to.equal(0);
        });
    });

    describe("accept ProposeNewCollateralToken proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal before maturity period", async () => {
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
        });

        it("should revert when trying to accept proposal after expiration", async () => {
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_LIFETIME + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when non-owner tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(users[0]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(owner).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is cancelled", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata1, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(owner).cancelProposal(proposalId);
            
            await ethers.provider.send("evm_increaseTime", [PROPOSE_NEW_COLLATERAL_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });
    });
});

describe("Check the proposal revert on the SandboxComet side.", () => {
    let configControllerProposalTest: ConfigControllerProposalTest;
    let comet: any;
    let baseToken: FaucetToken;
    let basePriceFeed: SimplePriceFeed;
    let collateralToken: FaucetToken;
    let priceFeed: SimplePriceFeed;
    let sandboxController: any;
    let configControllerFactory: any;
    let cometFactory: any;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let dao: SignerWithAddress;
    let cometAddress: string;
    let snapshot: SnapshotRestorer;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        dao = signers[3];

        // Create base token (USDC)
        const FaucetFactory: FaucetToken__factory = <FaucetToken__factory>await ethers.getContractFactory("FaucetToken");
        baseToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("1000000"), 
            "USD Coin", 
            6, 
            "USDC"
        );
        await baseToken.deployed();

        // Create collateral token (WETH)
        collateralToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("10000"), 
            "Wrapped Ether", 
            18, 
            "WETH"
        );
        await collateralToken.deployed();

        // Create price feeds
        const PriceFeedFactory: SimplePriceFeed__factory = <SimplePriceFeed__factory>await ethers.getContractFactory("SimplePriceFeed");
        
        // Base token price feed (USDC = $1)
        basePriceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("1", 8), // $1 price
            8, // 8 decimals
            baseToken.address
        );
        await basePriceFeed.deployed();
        
        // Collateral token price feed (WETH = $3000)
        priceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("3000", 8), // $3000 price
            8, // 8 decimals
            collateralToken.address
        );
        await priceFeed.deployed();
        // Create SandboxController
        const sandboxControllerOpts = defaultSandboxControllerOpts({
            owner: owner,
            dao: dao,
            treasury: ethers.Wallet.createRandom().address
        });
        const sandboxControllerInfo = await makeSandboxController(sandboxControllerOpts);
        sandboxController = sandboxControllerInfo.sandboxController;
        // Whitelist base token
        await sandboxController.whitelistBaseAsset(
            baseToken.address,
            basePriceFeed.address,
            {
                supplyKink: ethers.utils.parseEther("0.8"),
                supplyPerYearInterestRateBase: ethers.utils.parseEther("0.001"),
                supplyPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.05"),
                supplyPerYearInterestRateSlopeHigh: ethers.utils.parseEther("2"),
                borrowKink: ethers.utils.parseEther("0.8"),
                borrowPerYearInterestRateBase: ethers.utils.parseEther("0.005"),
                borrowPerYearInterestRateSlopeLow: ethers.utils.parseEther("0.1"),
                borrowPerYearInterestRateSlopeHigh: ethers.utils.parseEther("3"),
            },
            ethers.utils.parseUnits("1", 6) // baseBorrowMin
        );

        // Whitelist collateral token
        await sandboxController.whitelistCollateralAsset(
            collateralToken.address,
            priceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );

        // Create ConfigControllerFactory
        const ConfigControllerFactoryFactory = await ethers.getContractFactory("ConfigControllerFactory");
        const ConfigControllerProposalTestFactory = await ethers.getContractFactory("ConfigControllerProposalTest");
        const configControllerImpl = await ConfigControllerProposalTestFactory.deploy();
        configControllerFactory = await ConfigControllerFactoryFactory.deploy(
            sandboxController.address, 
            configControllerImpl.address
        );
        await configControllerFactory.deployed();

        // Create CometFactory
        const CometFactory = await ethers.getContractFactory("CometHarness");
        const cometImpl = await CometFactory.deploy();
        const SandboxCometFactoryFactory = await ethers.getContractFactory("SandboxCometFactory");
        cometFactory = await SandboxCometFactoryFactory.deploy(
            cometImpl.address, 
            configControllerFactory.address
        );
        await cometFactory.deployed();

        // Create ConfigController
        const tx = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            1000, // curatorFee
            "ConfigController"
        );
        const receipt = await tx.wait();
        const [createConfigControllerEvent] = receipt.events?.filter(event => event.event === "ConfigControllerCreated");
        const configControllerAddress = createConfigControllerEvent?.args?.controller;
        // Get ConfigControllerProposalTest instance
        configControllerProposalTest = <ConfigControllerProposalTest>await ethers.getContractAt("ConfigControllerProposalTest", configControllerAddress);

        // Accept curator proposal
        await configControllerProposalTest.connect(curator).acceptProposal(await configControllerProposalTest.proposalCounter());

        // Create comet with only one collateral token
        const cometConfig = {
            name: "Test Comet",
            baseToken: baseToken.address,
            collateralTokens: [{
                collateralToken: collateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            }],
            baseTokenCurveId: 0n
        };

        await configControllerProposalTest.createComet(cometConfig);
        cometAddress = await configControllerProposalTest.comets(0);
        comet = <SandboxComet>await ethers.getContractAt("SandboxComet", cometAddress);

        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    })

    it("should fail when trying to add already existing collateral token", async () => {
        // Create a proposal for the same collateral token that already exists in the comet
        const collateralTokenConfig: CollateralTokenConfigStruct = {
            collateralToken: collateralToken.address, // Use the existing WETH token
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };
        // Encode the function call
        const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
        // Create a proposal
        const tx = await configControllerProposalTest.connect(owner).createProposal2(calldata, cometAddress, 1);
        const receipt = await tx.wait();            
        // Get the proposal ID from the event
        const event = <ProposeNewCollateralTokenEvent> receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
        const proposalId = event.args[0];
        // Fast forward past maturity period (1 week)
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
        await ethers.provider.send("evm_mine", []);
        
        // Try to accept the proposal - this should fail because the token already exists
        await expect(configControllerProposalTest.connect(owner).acceptProposal(proposalId))
            .to.be.revertedWithCustomError(configControllerProposalTest, "CollateralTokenAlreadyAdded");
        
        // Verify the proposal is still active (not executed)
        const proposal = await configControllerProposalTest.proposals(proposalId);
        expect(proposal.expirationTime).to.be.gt(0);
        
        // Verify the comet still has only the original collateral token
        const numAssets = await comet.numAssets();
        expect(numAssets).to.equal(1);
        
        const existingAsset = await comet.collateralAssets(0);
        expect(existingAsset.collateralToken).to.equal(collateralToken.address);
    });

    it("should fail when trying to add base token as collateral token", async () => {
        // Whitelist base token as collateral token (for testing purposes)
        await sandboxController.whitelistCollateralAsset(
            baseToken.address,
            basePriceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );

        // Create a proposal with the collateral token that is the base asset
        const baseTokenConfig: CollateralTokenConfigStruct = {
            collateralToken: baseToken.address, // Use the base token as collateral (should fail)
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };

        // Encode the function call
        const calldata = iface.encodeFunctionData("addCollateralAsset", [baseTokenConfig]);
        
        // Create a proposal
        const tx = await configControllerProposalTest.connect(owner).createProposal2(calldata, cometAddress, 1);
        const receipt = await tx.wait();            
        // Get the proposal ID from the event
        const event = <ProposeNewCollateralTokenEvent> receipt.events?.find(e => e.event === "ProposeNewCollateralToken");
        const proposalId = event.args[0];
        
        // Fast forward past maturity period (1 week)
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
        await ethers.provider.send("evm_mine", []);

        // Try to accept the proposal - this should fail because base token cannot be used as collateral
        await expect(configControllerProposalTest.connect(owner).acceptProposal(proposalId))
            .to.be.revertedWithCustomError(configControllerProposalTest, "CometCallFailed");
        
        // Verify the proposal is still active (not executed)
        const proposalAfterAttempt = await configControllerProposalTest.proposals(proposalId);
        expect(proposalAfterAttempt.expirationTime).to.be.gt(0);
        
        // Verify the comet still has only the original collateral token
        const numAssets = await comet.numAssets();
        expect(numAssets).to.equal(1);
        
        const existingAsset = await comet.collateralAssets(0);
        expect(existingAsset.collateralToken).to.equal(collateralToken.address);
    });

    it("should fail when trying to add collateral token beyond MAX_ASSETS limit", async () => {
        // Create multiple collateral tokens to reach MAX_ASSETS limit
        const MAX_ASSETS = 24;
        const currentAssets = await comet.numAssets();
        const tokensToAdd = MAX_ASSETS - currentAssets;
        
        // Create and whitelist additional collateral tokens
        const additionalTokens: FaucetToken[] = [];
        const additionalPriceFeeds: SimplePriceFeed[] = [];
        
        for (let i = 0; i < tokensToAdd; i++) {
            // Create a new token
            const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken") as FaucetToken__factory;
            const newToken = await FaucetFactory.deploy(
                ethers.utils.parseEther("1000000"), 
                `Additional Token ${i}`, 
                18, 
                `AT${i}`
            );
            await newToken.deployed();
            additionalTokens.push(newToken);
            
            // Create price feed for the new token
            const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed") as SimplePriceFeed__factory;
            const priceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
                ethers.utils.parseUnits("100", 8), // $100 price
                8, // 8 decimals
                newToken.address
            );
            await priceFeed.deployed();
            additionalPriceFeeds.push(priceFeed);
            
            // Whitelist the new collateral token in SandboxController
            await sandboxController.whitelistCollateralAsset(
                newToken.address,
                priceFeed.address,
                ethers.utils.parseEther("0.5"), // minBorrowCF
                ethers.utils.parseEther("0.7"), // maxBorrowCF
                ethers.utils.parseEther("0.6"), // minLiquidateCF
                ethers.utils.parseEther("0.8"), // maxLiquidateCF
                ethers.utils.parseEther("0.8"), // minLiquidationFactor
                ethers.utils.parseEther("1.0")  // maxLiquidationFactor
            );
        }
        
        // Add all tokens up to MAX_ASSETS limit
        for (let i = 0; i < tokensToAdd; i++) {
            const collateralTokenConfig: CollateralTokenConfigStruct = {
                collateralToken: additionalTokens[i].address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };
            
            const calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create proposal
            await configControllerProposalTest.connect(owner).createProposal2(calldata, cometAddress, 1);
            const proposalId = await configControllerProposalTest.proposalCounter();
            
            // Fast forward past maturity period
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Accept the proposal
            await configControllerProposalTest.connect(owner).acceptProposal(proposalId);
        }
        
        // Verify we've reached MAX_ASSETS
        expect(await comet.numAssets()).to.equal(MAX_ASSETS);
        
        // Now try to add one more token - this should fail
        const FaucetFactory: FaucetToken__factory = await ethers.getContractFactory("FaucetToken") as FaucetToken__factory;
        const extraToken = await FaucetFactory.deploy(
            ethers.utils.parseEther("1000000"), 
            "Extra Token", 
            18, 
            "EXT"
        );
        await extraToken.deployed();
        
        // Create price feed for the extra token
        const PriceFeedFactory: SimplePriceFeed__factory = await ethers.getContractFactory("SimplePriceFeed") as SimplePriceFeed__factory;
        const extraPriceFeed: SimplePriceFeed = await PriceFeedFactory.deploy(
            ethers.utils.parseUnits("100", 8), // $100 price
            8, // 8 decimals
            extraToken.address
        );
        await extraPriceFeed.deployed();
        
        // Whitelist the extra token
        await sandboxController.whitelistCollateralAsset(
            extraToken.address,
            extraPriceFeed.address,
            ethers.utils.parseEther("0.5"), // minBorrowCF
            ethers.utils.parseEther("0.7"), // maxBorrowCF
            ethers.utils.parseEther("0.6"), // minLiquidateCF
            ethers.utils.parseEther("0.8"), // maxLiquidateCF
            ethers.utils.parseEther("0.8"), // minLiquidationFactor
            ethers.utils.parseEther("1.0")  // maxLiquidationFactor
        );
        
        // Create proposal for the extra token
        const extraCollateralTokenConfig: CollateralTokenConfigStruct = {
            collateralToken: extraToken.address,
            supplyCap: ethers.utils.parseEther("1000000"),
            borrowCollateralFactor: ethers.utils.parseEther("0.6"),
            liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
            liquidationFactor: ethers.utils.parseEther("0.8"),
        };
        
        const extraCalldata = iface.encodeFunctionData("addCollateralAsset", [extraCollateralTokenConfig]);
        
        // Create proposal
        await configControllerProposalTest.connect(owner).createProposal2(extraCalldata, cometAddress, 1);
        const extraProposalId = await configControllerProposalTest.proposalCounter();
        
        // Fast forward past maturity period
        await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
        await ethers.provider.send("evm_mine", []);
        
        // Try to accept the proposal - this should fail because MAX_ASSETS is reached
        await expect(configControllerProposalTest.connect(owner).acceptProposal(extraProposalId))
            .to.be.revertedWithCustomError(configControllerProposalTest, "MaxCollateralTokensReached");
        
        // Verify the proposal is still active (not executed)
        const proposal = await configControllerProposalTest.proposals(extraProposalId);
        expect(proposal.expirationTime).to.be.gt(0);
        
        // Verify the comet still has exactly MAX_ASSETS
        expect(await comet.numAssets()).to.equal(MAX_ASSETS);
    });

});
