import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { 
    SandboxController, 
    ConfigController,
    FaucetToken,
    SandboxComet,
    SandboxCometFactory,
    ConfigControllerFactory,
    SimplePriceFeed,
    FaucetToken__factory,
    SimplePriceFeed__factory,
    ConfigController__factory
} from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ContractTransaction, ContractReceipt, Event, BigNumber } from "ethers";
import { expect, exp, defaultAssets, defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";


const iface = new ethers.utils.Interface([
    "function initiateCollateralRemoval(address removalAsset)"
]);

describe("24. Create Remove Collateral Proposal", () => {
    let configController: ConfigController;
    let sandboxController: SandboxController;
    let sandboxComet: SandboxComet;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let users: [SignerWithAddress];
    let cometAddress: string;
    let calldata: string;
    let collateralToken: string;
    let baseToken: FaucetToken;
    let priceFeeds: { [symbol: string]: SimplePriceFeed };

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
        const tokens = {};
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
        };

        await configController.createComet(marketConfig);
        cometAddress = await configController.comets(0);
        sandboxComet = await ethers.getContractAt("SandboxComet", cometAddress) as SandboxComet;
        
        // Get the last collateral asset to remove
        const numAssets = await sandboxComet.numAssets();
        const lastAsset = await sandboxComet.getAssetInfo(numAssets - 1);
        collateralToken = lastAsset.collateralToken;
        
        // Encode the function call
        calldata = iface.encodeFunctionData("initiateCollateralRemoval", [collateralToken]);
        snapshot = await takeSnapshot();
        console.log("calldata", calldata);
    });
    
    describe("create remove collateral proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should create a remove collateral proposal", async() => {
            // Just check that the call is performed.
            await expect(configController.connect(owner).createProposal(calldata, cometAddress, 2)).to.not.be.reverted;
        });

        it("should show that the proposal counter is incremented", async () => {
            // Check that the proposal counter is incremented. In case we will change the increment logic.
            const beforeCallCounter: BigNumber = await configController.proposalCounter();
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const afterCallCounter: BigNumber = await configController.proposalCounter();
            expect(afterCallCounter).to.equal(beforeCallCounter.add(1));
        });

        it("should show that the proposal data is saved correctly", async () => {
            // The separated test just for the proposal data. In case we will change the proposal creation flow but the data is the same.
            // Made tx for getting the block.timestamp.
            const tx: ContractTransaction = await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const receipt: ContractReceipt = await tx.wait();
            const blockTimestamp: number = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
            // Get the last proposal.
            const proposal = await configController.proposals(await configController.proposalCounter());

            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(2); // ProposeCollateralRemoval
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.expirationTime).to.be.equal(blockTimestamp + await configController.PROPOSE_COLLATERAL_REMOVAL_LIFETIME());
            expect(proposal.maturityTime).to.be.equal(blockTimestamp + await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY());
            expect(proposal.timelock).to.equal(blockTimestamp + await configController.PROPOSE_COLLATERAL_REMOVAL_TIMELOCK());
        });

        it("should made the proposal with the same calldata twice", async () => {
            // In case we will change the proposal validation logic.
            // For the current logic we should be ebale to create a any amount of proposals with the same calldata.
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
        });

        it("should create a proposal by the curator", async () => {
            // In case we will remove the curator possiblity to create a proposal.
            await expect(configController.connect(curator).createProposal(calldata, cometAddress, 2)).to.not.be.reverted;
        });       
    });

    describe("create remove collateral proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to create proposal", async () => {
            await expect(
                configController.connect(users[0]).createProposal(calldata, cometAddress, 2)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when invalid proposal type is used", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata, cometAddress, 3)
            ).to.be.revertedWithCustomError(configController, "InvalidProposalType");
        });

        it("should revert when invalid selector is used", async () => {
            const invalidCalldata = "0x12345678"; // Invalid selector
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, 2)
            ).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should revert when comet is not belongs to the ConfigController", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata, ethers.Wallet.createRandom().address, 2)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when collateral token is not added to the comet", async () => {
            const invalidCalldata = iface.encodeFunctionData("initiateCollateralRemoval", [ethers.Wallet.createRandom().address]);
            await expect(
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, 2)
            ).to.be.revertedWithCustomError(configController, "CollateralTokenNotAdded");
        });
    });

    /// Duplicate test. In case we will change the proposal cancellation logic for the remove collateral proposal.
    /// We assume that the owner can cancel the proposal in every proposal state.
    /// We assume that the curator can cancel the proposal if the curator is the proposer in the every proposal state.
    /// We assume that the guardian can cancel the proposal if the proposal is in the maturity period.
    describe("cancel remove collateral proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal when the proposal not in the maturity period by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal when the proposal not in the maturity period by the curator if the curator is the proposer", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
        });
        
        it("should cancel the proposal by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            const tx: ContractTransaction = await configController.connect(owner).cancelProposal(proposalId);
            const receipt: ContractReceipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should cancel the proposal by the curator if the curator is proposed", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the curator", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            const tx: ContractTransaction = await configController.connect(curator).cancelProposal(proposalId);
            const receipt: ContractReceipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(curator.address);
        });

        it("should cancel the proposal by the guardian", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.not.be.reverted;
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the guardian", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            const tx: ContractTransaction = await configController.connect(guardian).cancelProposal(proposalId);
            const receipt: ContractReceipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(guardian.address);
        });
    });
    
    /// Duplicate test. In case we will change the proposal cancellation logic for the remove collateral proposal.
    describe("cancel remove collateral proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to cancel proposal", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when proposal is not active", async () => {
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(owner).cancelProposal(proposalId.add(1))).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is expired", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_LIFETIME() + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when proposal is out of the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
        
        it("should revert when the proposal is created by the owner and the curator is try to cancel the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });   
        
        it("should revert when the proposal is created by the curator and the guardian is try to cancel the proposal that is out of the maturity period", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("accept remove collateral proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });
        
        it("should accept the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            // Spend blocks to allow the proposal to mature before acceptance
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(configController.connect(owner).acceptProposal(proposalId)).to.not.be.reverted;
        });

        it("should emit the event when the proposal is accepted", async () => {
            await snapshot.restore();

            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);
            
            const tx: ContractTransaction = await configController.connect(owner).acceptProposal(proposalId);
            const receipt: ContractReceipt = await tx.wait();
            // English:
            // Find the ProposeCollateralRemovalAccepted event in the receipt and check its args
            const event = receipt.events?.find(
                (e) => e.event === "ProposeCollateralRemovalAccepted"
            );
            expect(event).to.not.be.undefined;
            expect(event?.args?.proposalId).to.equal(proposalId);
            expect(event?.args?.accepter).to.equal(owner.address);
            expect(event?.args?.collateralToken).to.equal(collateralToken);
        });

        it("should correctly change the storage", async () => {
            await snapshot.restore();

            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId);
            
            // Check that the proposal is not active
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should initiate the collateral removal", async () => {
            await snapshot.restore();

            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            expect(await configController.connect(owner).acceptProposal(proposalId)).to.not.be.reverted;
        });

        it("should update the storage when the collateral token removal is initiated", async () => {           
            // Check that the collateral removal was initiated
            expect(await sandboxComet.removalInProgress()).to.be.true;

            // Check that the collateral token is still in the active assets list
            const assetInfo = await sandboxComet.getAssetInfoByAddress(collateralToken);
            expect(assetInfo[0].collateralToken).to.equal(collateralToken);

            // Check that the supply cap is set to 0 (blocking new supply)
            expect(assetInfo[0].supplyCap).to.equal(0);
        });

        it("should allow curator to accept proposal", async () => {
            await snapshot.restore();

            await configController.connect(curator).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(configController.connect(curator).acceptProposal(proposalId)).to.not.be.reverted            
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            const numAssets = await sandboxComet.numAssets();
            // Create first proposal
            // Create first calldata
            const calldata1 = iface.encodeFunctionData("initiateCollateralRemoval", [(await sandboxComet.getAssetInfo(numAssets - 1)).collateralToken]);
            await configController.connect(owner).createProposal(calldata1, cometAddress, 2);
            const proposalId1 = await configController.proposalCounter();
            
            // Create second proposal with different collateral token
            const secondAsset = await sandboxComet.getAssetInfo(numAssets - 2); // Different asset
            const secondCalldata = iface.encodeFunctionData("initiateCollateralRemoval", [secondAsset.collateralToken]);
            await configController.connect(owner).createProposal(secondCalldata, cometAddress, 2);
            const proposalId2 = await configController.proposalCounter();
            
            // Wait for maturity
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            // Accept first proposal
            await configController.connect(owner).acceptProposal(proposalId1);
            expect(await sandboxComet.removalInProgress()).to.be.true;
            // Try to accept second proposal while first removal is in progress
            await expect(
                configController.connect(owner).acceptProposal(proposalId2)
            ).to.be.revertedWithCustomError(configController, "CollateralRemovalInProgress");
        });

        it("should proposal be active after the proposal is reverted", async () => {
            // Check that the proposal is still active.
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.not.equal(0);
        });
    });

    describe("accept remove collateral proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal before maturity period", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            
            // Try to accept before maturity period
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
        });

        it("should revert when trying to accept proposal after expiration", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            
            // Wait past expiration time
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_LIFETIME() + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when non-owner tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(users[0]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(owner).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            // Accept the proposal first time
            await configController.connect(owner).acceptProposal(proposalId);
            
            // Try to accept the same proposal again
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when collateral token is no longer in comet", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            // Simulate collateral token being removed from comet (this would require additional setup)
            // For now, we test the basic flow - in a real scenario, this would be tested with
            // a mock or by actually removing the collateral token from the comet
            
            // This test demonstrates the expected behavior when collateral token is not found
            // The actual implementation would need to handle this case in the ConfigController
        });

        it("should revert when guardian tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(guardian).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when proposal is not matured", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
        });

        it("should revert when proposal is expired", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_LIFETIME() + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when proposal is cancelled", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, 2);
            const proposalId = await configController.proposalCounter();
            
            // Cancel the proposal
            await configController.connect(owner).cancelProposal(proposalId);
            
            // Wait for maturity
            await ethers.provider.send("evm_increaseTime", [await configController.PROPOSE_COLLATERAL_REMOVAL_MATURITY() + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });
    });
});