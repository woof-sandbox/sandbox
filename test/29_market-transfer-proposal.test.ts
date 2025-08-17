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

const iface = new ethers.utils.Interface(["function transferMarket(address)"]);

describe("29. Market Transfer Proposal", () => {
    let configController: ConfigController;
    let configController2: ConfigController;
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

    // Constants for market transfer proposal
    const PROPOSAL_TYPE = 5; // ProposeMarketTransfer
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

        // Create first ConfigController
        const createConfigControllerTx: ContractTransaction = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            1000, // curatorFee (10%)
            "Test Config Controller 1"
        );
        const createConfigControllerReceipt: ContractReceipt = await createConfigControllerTx.wait();
        const configControllerCreatedEvent: Event = createConfigControllerReceipt.events?.find(
            (e) => e.event === "ConfigControllerCreated"
        );

        const configControllerAddress: string = configControllerCreatedEvent?.args?.controller;
        configController = await ethers.getContractAt("ConfigController", configControllerAddress) as ConfigController;

        // Create second ConfigController
        const createConfigController2Tx: ContractTransaction = await configControllerFactory.createConfigController(
            curator.address,
            guardian.address,
            cometFactory.address,
            1000, // curatorFee (10%)
            "Test Config Controller 2"
        );
        const createConfigController2Receipt: ContractReceipt = await createConfigController2Tx.wait();
        const configController2CreatedEvent: Event = createConfigController2Receipt.events?.find(
            (e) => e.event === "ConfigControllerCreated"
        );

        const configController2Address: string = configController2CreatedEvent?.args?.controller;
        configController2 = await ethers.getContractAt("ConfigController", configController2Address) as ConfigController;

        // Accept the curator for both controllers
        await configController.connect(curator).acceptProposal(0);
        await configController2.connect(curator).acceptProposal(0);

        lifetimePeriod = await configController.PROPOSE_MARKET_TRANSFER_LIFETIME(); 
        timelockPeriod = await configController.PROPOSE_MARKET_TRANSFER_TIMELOCK(); 

        // Approve base token for ConfigController
        await baseToken.approve(configController.address, sandboxControllerOpts.config.suggestedAmountOfSeedReserves);

        // Create comet in first controller
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
            name: "Comet 1",
            amountOfSeedReserves: ethers.utils.parseEther("100"),
        };

        await configController.createComet(marketConfig);
        cometAddress = await configController.comets(0);
        sandboxComet = await ethers.getContractAt("SandboxComet", cometAddress) as SandboxComet;

        await configController.createComet(marketConfig);
        cometAddress2 = await configController.comets(1);
        sandboxComet2 = await ethers.getContractAt("SandboxComet", cometAddress2) as SandboxComet;

        // Encode the function call for transferMarket (with target controller address)
        calldata = ethers.utils.defaultAbiCoder.encode(["address"], [configController2.address]);
        snapshot = await takeSnapshot();
    });
    
    describe("create market transfer proposal - happy cases", () => {
        let beforeCallCounter: BigNumber;
        let receipt: ContractReceipt;
        after(async () => {
            await snapshot.restore();
        });

        it("should create a market transfer proposal", async() => {
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
            expect(proposal.maturityTime).to.be.equal(0); // No maturity time for market transfer
            expect(proposal.timelock).to.equal(0);
        });

        it("should emit the ProposeMarketTransfer event", async () => {
            const proposalId = await configController.proposalCounter();
            const event = receipt.events?.find(
                (e) => e.event === "ProposeMarketTransfer"
            );
            expect(event).to.not.be.undefined;
            expect(event.args[0]).to.equal(proposalId);
            expect(event.args[1]).to.equal(owner.address);
            expect(event.args[2]).to.equal(configController2.address);
        });

        it("should allow creating multiple proposals for the same market", async () => {
            expect(await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE)).to.not.be.reverted;
        });
    });

    describe("create market transfer proposal - reverts", () => {
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

        it("should revert when comet is not owned by the ConfigController", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata, ethers.Wallet.createRandom().address, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when target config controller is address zero", async () => {
            const invalidCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [ethers.constants.AddressZero]);
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "InvalidConfigController");
        });

        it("should revert when target config controller is not a valid controller", async () => {
            const invalidCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [ethers.Wallet.createRandom().address]);
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "InvalidConfigController");
        });

        it("should revert when target config controller is the same as current controller", async () => {
            const invalidCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [configController.address]);
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, PROPOSAL_TYPE)
            ).to.be.revertedWithCustomError(configController, "InvalidConfigController");
        });
    });

    describe("cancel market transfer proposal - happy cases", () => {
        let receipt: ContractReceipt;
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should update the proposal expiration time when cancelled when cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when cancelled by owner", async () => {
            const proposalId = await configController.proposalCounter();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should cancel the proposal if the proposal has a timelock by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await configController.connect(owner).acceptProposal(proposalId);
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            const tx = await configController.connect(owner).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should emit the event when cancelled by the owner; if the proposal has a timelock", async () => {
            const proposalId = await configController.proposalCounter();
            
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });
    });

    describe("cancel market transfer proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to cancel proposal", async () => {
            await configController.createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to cancel proposal", async () => {
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
    });

    describe("accept market transfer proposal - happy cases", () => {
        let receipt: ContractReceipt;
        let createProposalBlockNumber: number;
        let timelockBlockNumber: number;
        after(async () => {
            await snapshot.restore();
        });

        it("should accept the proposal and set timelock on first acceptance", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            createProposalBlockNumber = (await ethers.provider.getBlock("latest")).number;
            const proposalId = await configController.proposalCounter();
            
            const tx = await configController.connect(owner).acceptProposal(proposalId);
            receipt = await tx.wait();
            timelockBlockNumber = (await ethers.provider.getBlock("latest")).number;
            await expect(tx).to.not.be.reverted;
        });

        it("should emit the ProposalTimelockSetted event on first acceptance", async () => {
            const proposalId = await configController.proposalCounter();
            const event = receipt.events?.find(
                (e) => e.event === "ProposalTimelockSetted"
            );
            expect(event).to.not.be.undefined;
            expect(event.args[0]).to.equal(proposalId);
            expect(event.args[1]).to.equal(owner.address);
        });

        it("should correctly set the timelock timestamp", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
            expect(proposal.timelock).to.equal(blockTimestamp + timelockPeriod);
        });

        it("should execute the transfer on second acceptance after timelock", async () => {
            const proposalId = await configController.proposalCounter();
            
            // Wait for timelock period
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            
            const tx = await configController.connect(owner).acceptProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should emit the ProposeMarketTransferAccepted event on execution", async () => {
            const proposalId = await configController.proposalCounter();
            const event = receipt.events?.find(
                (e) => e.event === "ProposeMarketTransferAccepted"
            );
            expect(event).to.not.be.undefined;
            expect(event.args[0]).to.equal(proposalId);
            expect(event.args[1]).to.equal(owner.address);
            expect(event.args[2]).to.equal(configController2.address);
        });

        it("should correctly update the storage after transfer", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);

            const timelockBlockTimestamp = (await ethers.provider.getBlock(timelockBlockNumber)).timestamp;
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.timelock).to.equal(timelockBlockTimestamp + timelockPeriod);  
            expect(proposal.proposalType).to.equal(PROPOSAL_TYPE);
            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.maturityTime).to.equal(0);
            expect(await configController.cometId(cometAddress)).to.equal(0);
        });

        it("should remove the comet from the source controller", async () => {
            // Check that the comet is no longer owned by the source controller
            expect(await configController.isCometOwned(cometAddress)).to.be.false;
            
            // Check that the comet array is updated
            expect(await configController.cometsLength()).to.equal(1); // Only comet2 should remain
            expect(await configController.comets(0)).to.equal(cometAddress2);
        });

        it("should add the comet to the target controller", async () => {
            // Check that the comet is now owned by the target controller
            expect(await configController2.isCometOwned(cometAddress)).to.be.true;
            
            // Check that the comet array is updated in target controller
            expect(await configController2.cometsLength()).to.equal(1);
            expect(await configController2.comets(0)).to.equal(cometAddress);
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            
            // Create multiple proposals for different comets
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId1 = await configController.proposalCounter();
            
            const calldata2 = await ethers.utils.defaultAbiCoder.encode(["address"], [configController2.address]);
            await configController.connect(owner).createProposal(calldata2, cometAddress2, PROPOSAL_TYPE);
            const proposalId2 = await configController.proposalCounter();

            // Accept first proposal
            await configController.connect(owner).acceptProposal(proposalId1);
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId1);
            
            // Verify first market is transferred
            expect(await configController.isCometOwned(cometAddress)).to.be.false;
            expect(await configController2.isCometOwned(cometAddress)).to.be.true;

            // Accept second proposal
            await configController.connect(owner).acceptProposal(proposalId2);
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            await configController.connect(owner).acceptProposal(proposalId2);

            // Verify second market is transferred
            expect(await configController.isCometOwned(cometAddress2)).to.be.false;
            expect(await configController2.isCometOwned(cometAddress2)).to.be.true;
        });
    });

    describe("accept market transfer proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal before timelock period", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            // First acceptance should work
            await configController.connect(owner).acceptProposal(proposalId);
            
            // Second acceptance before timelock should fail
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
            
            await expect(
                configController.connect(users[0]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(curator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when guardian tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(guardian).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;
            await expect(
                configController.connect(owner).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            // First acceptance
            await configController.connect(owner).acceptProposal(proposalId);
            
            // Wait for timelock
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            
            // Second acceptance (execution)
            await configController.connect(owner).acceptProposal(proposalId);

            // Try to accept again
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is cancelled", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(owner).cancelProposal(proposalId);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when target controller is not the one specified in calldata", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, PROPOSAL_TYPE);
            const proposalId = await configController.proposalCounter();
            
            // First acceptance should work
            await configController.connect(owner).acceptProposal(proposalId);
            
            // Wait for timelock
            await ethers.provider.send("evm_increaseTime", [timelockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);
            
            // Try to accept with different signer (not the target controller owner)
            await expect(
                configController.connect(users[0]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });
});
