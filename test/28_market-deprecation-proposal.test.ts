import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { 
    SandboxController, 
    ConfigController,
    FaucetToken,
    SandboxComet,
    SimplePriceFeed,
    FaucetToken__factory,
    SimplePriceFeed__factory,
    ConfigController__factory
} from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ContractTransaction, ContractReceipt, Event, BigNumber } from "ethers";
import { expect, exp, defaultAssets, defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";

const iface = new ethers.utils.Interface(["function initiateDeprecation()"]);

describe("28. Market Deprecation Proposal", () => {
    let configController: ConfigController;
    let sandboxController: SandboxController;
    let sandboxComet: SandboxComet;
    let sandboxComet2: SandboxComet;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let users: [SignerWithAddress];
    let cometAddress: string;
    let cometAddress2: string;
    let calldata: string;
    let baseToken: FaucetToken;
    let priceFeeds: { [symbol: string]: SimplePriceFeed };

    // Constants for market deprecation proposal
    const PROPOSAL_TYPE = 4; // ProposeMarketDeprecation
    let maturityPeriod: number;
    let lifetimePeriod: number;
    let timelockPeriod: number;

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        const dao = signers[3];
        users = [signers[4]] as [SignerWithAddress];

        // Create tokens
        const assets = defaultAssets();
        // For current test cases we only need the one collateral asset and one base asset
        const onlyTwoAssets = Object.fromEntries(Object.entries(assets).slice(0, 2));
        const FaucetFactory = (await ethers.getContractFactory("FaucetToken")) as FaucetToken__factory;
        const tokens = {};
        for (const symbol in onlyTwoAssets) {
            const config = onlyTwoAssets[symbol];
            const decimals = config.decimals || 18;
            const initial = (config.initial != undefined && config.initial.toString()) || 1e6;
            const name = config.name || symbol;
            const token = (await FaucetFactory.deploy(initial, name, decimals, symbol)) as FaucetToken;
            await token.deployed();
            tokens[symbol] = token;
        }

        baseToken = tokens["USDC"];

        // Create price feeds
        const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
        priceFeeds = {};
        for (const asset in onlyTwoAssets) {
            const initialPrice = exp(onlyTwoAssets[asset].initialPrice || 1, 8);
            const priceFeedDecimals = onlyTwoAssets[asset].priceFeedDecimals || 8;
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

        // Whitelist collateral assets
        for (const symbol in tokens) {
            if (symbol !== "USDC") {
                const minBorrowCF = exp(0.5, 18);
                const maxBorrowCF = exp(0.7, 18);
                const minLiquidateCF = exp(0.7, 18);
                const maxLiquidateCF = exp(0.8, 18);
                const minLiquidationFactor = exp(0.8, 18);
                const maxLiquidationFactor = exp(1, 18);

                await sandboxController.whitelistCollateralAsset(
                    tokens[symbol].address,
                    priceFeeds[symbol].address,
                    minBorrowCF,
                    maxBorrowCF,
                    minLiquidateCF,
                    maxLiquidateCF,
                    minLiquidationFactor,
                    maxLiquidationFactor
                );
            }
        }

        // Create ConfigController implementation and factory
        const ConfigControllerImpl: ConfigController__factory = await ethers.getContractFactory("ConfigController") as ConfigController__factory;
        const configControllerImpl = await ConfigControllerImpl.deploy();
        await configControllerImpl.deployed();

        const configControllerFactory = await makeConfigControllerFactory(
            sandboxController.address,
            configControllerImpl.address
        );

        // Create Comet implementation and factory
        const SandboxCometImpl = await ethers.getContractFactory("SandboxComet");
        const cometImpl = await SandboxCometImpl.deploy();
        await cometImpl.deployed();

        const cometFactory = await makeCometFactory(cometImpl.address, configControllerFactory.address);

        // Create ConfigController
        const createConfigControllerTx: ContractTransaction = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            1000, // curatorFee (10%)
            "Test Config Controller"
        );
        const createConfigControllerReceipt: ContractReceipt = await createConfigControllerTx.wait();
        const configControllerCreatedEvent: Event = createConfigControllerReceipt.events?.find(
            (e) => e.event === "ConfigControllerCreated"
        );

        const configControllerAddress: string = configControllerCreatedEvent?.args?.controller;

        configController = await ethers.getContractAt("ConfigController", configControllerAddress) as ConfigController;
        // Accept the curator.
        await configController.connect(curator).acceptProposal(0);
        maturityPeriod = await configController.PROPOSE_MARKET_DEPRECATION_MATURITY(); 
        lifetimePeriod = await configController.PROPOSE_MARKET_DEPRECATION_LIFETIME(); 
        timelockPeriod = await configController.PROPOSE_MARKET_DEPRECATION_TIMELOCK(); 
        // Approve base token for ConfigController
        await baseToken.approve(configController.address, sandboxControllerOpts.config.suggestedAmountOfSeedReserves);

        // Create comet
        const collateralTokens = [];
        for (const symbol in tokens) {
            if (symbol !== "USDC") {
                collateralTokens.push({
                    collateralToken: tokens[symbol].address,
                    borrowCollateralFactor: exp(0.6, 18),
                    liquidateCollateralFactor: exp(0.7, 18),
                    liquidationFactor: exp(0.8, 18),
                    supplyCap: exp(1e9, 18),
                });
            }
        }

        const marketConfig = {
            baseToken: baseToken.address,
            collateralTokens: collateralTokens,
            baseTokenCurveId: 0n,
            name: "Comet",
            amountOfSeedReserves: ethers.utils.parseEther("100"),
        };

        await configController.createComet(marketConfig);
        cometAddress = await configController.comets(0);
        sandboxComet = await ethers.getContractAt("SandboxComet", cometAddress) as SandboxComet;

        await configController.createComet(marketConfig);
        cometAddress2 = await configController.comets(1);
        sandboxComet2 = await ethers.getContractAt("SandboxComet", cometAddress2) as SandboxComet;

        // Encode the function call for initiateDeprecation (no parameters)
        calldata = iface.encodeFunctionData("initiateDeprecation");
        snapshot = await takeSnapshot();
    });
    
    describe("create market deprecation proposal - happy cases", () => {
        let beforeCallCounter: BigNumber;
        let receipt: ContractReceipt;
        after(async () => {
            await snapshot.restore();
        });

        it("should create a market deprecation proposal", async() => {
            beforeCallCounter = await configController.proposalCounter();
            const tx = await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should increment the proposal counter", async () => {
            const afterCallCounter = await configController.proposalCounter();
            expect(afterCallCounter).to.equal(beforeCallCounter.add(1));
        });

        it("should show that the proposal data is saved correctly", async () => {
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
            const proposal = await configController.proposals(await configController.proposalCounter());

            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(PROPOSAL_TYPE);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.expirationTime).to.be.equal(blockTimestamp + lifetimePeriod);
            expect(proposal.maturityTime).to.be.equal(blockTimestamp + maturityPeriod);
            expect(proposal.timelock).to.equal(0);
        });

        it("should made the proposal with the same calldata twice", async () => {
            expect(await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE)).to.not.be.reverted;
        });

        it("should accept the proposal in two steps", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId);
        });
    });

    describe("create market deprecation proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to create proposal", async () => {
            await expect(
                configController.connect(users[0]).createProposal(calldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to create proposal", async () => {
            await expect(
                configController.connect(curator).createProposal(calldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when invalid proposal type is used", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata, cometAddress, 99)
            ).to.be.revertedWithCustomError(configController, "InvalidProposalType");
        });

        it("should revert when invalid selector is used", async () => {
            const invalidCalldata = "0x12345678";
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should revert when comet is not belongs to the ConfigController", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata, ethers.Wallet.createRandom().address, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when market is already deprecated", async () => {
            // First create and accept a proposal to deprecate the market
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId);

            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId);

            // Try to create another deprecation proposal
            await expect(
                configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "MarketAlreadyDeprecated");
        });
    });

    describe("cancel market deprecation proposal - happy cases", () => {
        let receipt: ContractReceipt;
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal that is in the timelock period by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId);

            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).cancelProposal(proposalId);
        });

        it("should cancel the proposal when the proposal not in the maturity period by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should update the proposal expiration time when the proposal is cancelled by the owner not in the maturity period", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the owner not in the maturity period", async () => {
            const proposalId = await configController.proposalCounter();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should cancel the proposal by the owner when the proposal is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should update the proposal expiration time when the proposal is cancelled by the owner when the proposal is in the maturity period", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the owner when the proposal is in the maturity period", async () => {
            const proposalId = await configController.proposalCounter();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should cancel the proposal by the guardian when the proposal is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(guardian).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should update the proposal expiration time when the proposal is cancelled by the guardian when the proposal is in the maturity period", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the guardian when the proposal is in the maturity period", async () => {
            const proposalId = await configController.proposalCounter();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(guardian.address);
        });
    });

    describe("cancel market deprecation proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner and non-guardian tries to cancel proposal that is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to cancel proposal that is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when proposal is not active", async () => {
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(owner).cancelProposal(proposalId.add(1))).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is expired", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [lifetimePeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when proposal is out of the maturity period and guardian tries to cancel it", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("accept market deprecation proposal - happy cases", () => {
        let receipt: ContractReceipt;
        let createProposalBlockNumber: number;
        let timelockBlockNumber: number;
        after(async () => {
            await snapshot.restore();
        });

        it("should accept the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            createProposalBlockNumber = (await ethers.provider.getBlock("latest")).number;
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId);
            timelockBlockNumber = (await ethers.provider.getBlock("latest")).number;
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            const tx = await configController.connect(owner).acceptProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should emit the event when the proposal is accepted", async () => {
            const proposalId = await configController.proposalCounter();
            const event = receipt.events?.find(
                (e) => e.event === "ProposeMarketDeprecationAccepted"
            );
            expect(event).to.not.be.undefined;
            expect(event.args[0]).to.equal(proposalId);
            expect(event.args[1]).to.equal(owner.address);
            expect(event.args[2]).to.equal(cometAddress);
        });

        it("should correctly change the storage", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            const blockTimestamp = (await ethers.provider.getBlock(createProposalBlockNumber)).timestamp;
            const timelockBlockTimestamp = (await ethers.provider.getBlock(timelockBlockNumber)).timestamp;
            ;
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.maturityTime).to.equal(blockTimestamp + maturityPeriod);
            expect(proposal.timelock).to.equal(timelockBlockTimestamp + timelockPeriod);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
        });

        it("should initiate the market deprecation", async () => {
            // Check that the market is now in the deprecation process.
            expect(await sandboxComet.isDeprecated()).to.be.true;
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            // Create multiple proposals
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId1 = await configController.proposalCounter();
            await configController.connect(owner).createProposal(calldata, cometAddress2, PROPOSAL_TYPE);
            const proposalId2 = await configController.proposalCounter();

            // Wait for maturity
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            
            // Accept first proposal
            await configController.connect(owner).acceptProposal(proposalId1);

            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId1);
            
            // Verify market is deprecated
            expect(await sandboxComet.isDeprecated()).to.be.true;

            // Accept second proposal
            await configController.connect(owner).acceptProposal(proposalId2);

            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId2);

            // Verify second market is deprecated
            expect(await sandboxComet2.isDeprecated()).to.be.true;
        });
    });

    describe("accept market deprecation proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal before maturity period", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
        });

        it("should revert when trying to accept proposal before timelock period", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId);
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalNotTimelocked");
        });

        it("should revert when trying to accept proposal after expiration", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [lifetimePeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when non-owner tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(users[0]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(curator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(owner).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId);
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId);

            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when market is already deprecated", async () => {
            await snapshot.restore();

            // First deprecate the market
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId1 = await configController.proposalCounter();
            // Try to create and accept another deprecation proposal
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId2 = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId1);
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId1);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId2)
            ).to.be.revertedWithCustomError(configController, "MarketAlreadyDeprecated");
        });

        it("should revert when proposal is cancelled", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(owner).cancelProposal(proposalId);
            
            await ethers.provider.send("evm_increaseTime", [maturityPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });
    });
});
