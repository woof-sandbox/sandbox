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
import { ContractReceipt } from "ethers";
import { expect, exp, defaultAssets, defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";

// Interface for initiateCurveTransition function
const iface = new ethers.utils.Interface([
    "function initiateCurveTransition(uint8 curveId)"
]);

describe("27. Create Change Curve Proposal", () => {
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
    let proposalType: number;
    let baseToken: FaucetToken;
    let priceFeeds: { [symbol: string]: SimplePriceFeed };
    let tokens: { [symbol: string]: FaucetToken };
    let receipt: ContractReceipt;
    let secondCometAddress: string;
    // Constants for change curve proposal
    const CHANGE_CURVE_LIFETIME = 2 * 7 * 24 * 60 * 60; // 2 weeks
    const CHANGE_CURVE_MATURITY = 1 * 7 * 24 * 60 * 60; // 1 week
    const CHANGE_CURVE_TIMELOCK = 0; // 0 seconds
    const NEW_CURVE_ID = 1; // ID of the new curve to transition to

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
        await baseToken.allocateTo(owner.address, ethers.BigNumber.from(sandboxControllerOpts.config.suggestedAmountOfSeedReserves).mul(2));
        
        // Whitelist base asset with multiple curves
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

        // Add a second curve for testing transitions
        await sandboxController.addBaseAssetCurve(
            baseToken.address,
            {
                supplyKink: exp(0.9, 18),
                supplyPerYearInterestRateSlopeLow: exp(0.08, 18),
                supplyPerYearInterestRateSlopeHigh: exp(0.25, 18),
                supplyPerYearInterestRateBase: exp(0.002, 18),
                borrowKink: exp(0.9, 18),
                borrowPerYearInterestRateSlopeLow: exp(0.12, 18),
                borrowPerYearInterestRateSlopeHigh: exp(0.35, 18),
                borrowPerYearInterestRateBase: exp(0.008, 18),
            }
        );

        // Whitelist collateral assets
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
            sandboxCometImpl.address,
            configControllerFactory.address
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
            if (symbol !== "USDC") {
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

        await configController.createComet(marketConfig);
        secondCometAddress = await configController.comets(1);

        // Prepare proposal-specific data
        calldata = iface.encodeFunctionData("initiateCurveTransition", [NEW_CURVE_ID]);
        proposalType = 3; // ProposeCometCurve

        // Take snapshot
        snapshot = await takeSnapshot();
    });

    describe("create ProposeCometCurve proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should create a ProposeCometCurve proposal", async() => {
            const tx = await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should show that the proposal counter is incremented", async () => {
            expect(await configController.proposalCounter()).to.equal(1);
        });

        it("should show that the proposal data is saved correctly", async () => {
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
            const proposal = await configController.proposals(await configController.proposalCounter());

            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.maturityTime).to.equal(blockTimestamp + CHANGE_CURVE_MATURITY);
            expect(proposal.expirationTime).to.equal(blockTimestamp + CHANGE_CURVE_LIFETIME);
            expect(proposal.timelock).to.equal(blockTimestamp + CHANGE_CURVE_TIMELOCK);
        });

        it("should emit the event when the proposal is created", async () => {
            expect(receipt.events[0].args[0]).to.equal(await configController.proposalCounter());
            expect(receipt.events[0].args[1]).to.equal(owner.address);
            expect(receipt.events[0].args[2]).to.equal(NEW_CURVE_ID);
        });

        it("should made the proposal with the same calldata twice", async () => {
            expect(await configController.connect(owner).createProposal(calldata, cometAddress, proposalType)).to.not.be.reverted;
        });

        it("should create a proposal by the curator", async () => {
            await expect(configController.connect(curator).createProposal(calldata, cometAddress, proposalType)).to.not.be.reverted;
        });

        it("should create two proposals with equal parameters", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            const proposal1 = await configController.proposals(proposalId1);
            expect(proposal1.proposer).to.equal(owner.address);
            expect(proposal1.proposalType).to.equal(proposalType);
            expect(proposal1.comet).to.equal(cometAddress);
            expect(proposal1.call).to.equal(calldata);

            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();
            const proposal2 = await configController.proposals(proposalId2);
            expect(proposal2.proposer).to.equal(owner.address);
            expect(proposal2.proposalType).to.equal(proposalType);
            expect(proposal2.comet).to.equal(cometAddress);
            expect(proposal2.call).to.equal(calldata);
        });
    });

    describe("create ProposeCometCurve proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to create proposal", async () => {
            await expect(
                configController.connect(users[0]).createProposal(calldata, cometAddress, proposalType)
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
                configController.connect(owner).createProposal(invalidCalldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should revert when unknown comet is used", async () => {
            const unknownComet = "0x1234567890123456789012345678901234567890";
            await expect(
                configController.connect(owner).createProposal(calldata, unknownComet, proposalType)
            ).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when calldata is too short", async () => {
            const wrongCalldata = calldata.slice(0, -10);
            await expect(configController.createProposal(wrongCalldata, cometAddress, proposalType)).to.be.reverted;
        });

        it("should revert when calldata structure is wrong", async () => {
            const wrongIface = new ethers.utils.Interface([
                "function initiateCurveTransition(uint16 curveId)"
            ]);
            const wrongCalldata = wrongIface.encodeFunctionData("initiateCurveTransition", [NEW_CURVE_ID]);
            await expect(configController.createProposal(wrongCalldata, cometAddress, proposalType)).to.be.reverted;
        });

        it("should revert when guardian tries to create proposal", async () => {
            await expect(configController.connect(guardian).createProposal(calldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when comet address is zero", async () => {
            await expect(configController.createProposal(calldata, ethers.constants.AddressZero, proposalType)).to.be.revertedWithCustomError(configController, "UnknownComet");
        });

        it("should revert when calldata is malformed", async () => {
            const malformedCalldata = calldata.slice(0, -10);
            await expect(configController.createProposal(malformedCalldata, cometAddress, proposalType)).to.be.reverted;
        });

        it("should revert when empty calldata", async () => {
            await expect(configController.createProposal("0x", cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "InvalidSelector");
        });

        it("should revert when curve ID is invalid", async () => {
            const invalidCurveId = 99; // Non-existent curve ID
            const invalidCalldata = iface.encodeFunctionData("initiateCurveTransition", [invalidCurveId]);
            await expect(configController.createProposal(invalidCalldata, cometAddress, proposalType)).to.be.revertedWithCustomError(configController, "InvalidCurveId");
        });
    });

    describe("cancel ProposeCometCurve proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal when the proposal not in the maturity period by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal when the proposal not in the maturity period by the curator if the curator is the proposer", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal by the owner if curator is the proposer", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should cancel the proposal by the owner when the proposal is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            const tx = await configController.connect(owner).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should update the storage when the proposal is cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
        });

        it("should emit the event when the proposal is cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });

        it("should cancel the proposal by the curator if the curator is proposed and the proposal is in the maturity period", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(curator).cancelProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should update the storage when the proposal is cancelled by the curator", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
        });

        it("should emit the event when the proposal is cancelled by the curator", async () => {
            const proposalId = await configController.proposalCounter();
            
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(curator.address);
        });

        it("should cancel the proposal by the guardian", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should update the storage when the proposal is cancelled by the guardian", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
        });

        it("should emit the event when the proposal is cancelled by the guardian", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(guardian).cancelProposal(proposalId);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(guardian.address);
        });
    });

    describe("cancel ProposeCometCurve proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to cancel proposal", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when proposal is not active", async () => {
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(owner).cancelProposal(proposalId.add(1))).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is expired", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_LIFETIME + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when proposal is out of the maturity period and the guardian is try to cancel the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when the proposal is created by the owner and the curator is try to cancel the proposal that is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when the proposal is created by the curator and the guardian is try to cancel the proposal that is out of the maturity period", async () => {
            await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("accept ProposeCometCurve proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should accept the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            const tx = await configController.connect(owner).acceptProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should emit the event when the proposal is accepted", async () => {
            const proposalId = await configController.proposalCounter();

            const event = receipt.events?.find(
                (e) => e.event === "ProposeCurveTransitionAccepted"
            );
            expect(event).to.not.be.undefined;
            expect(event?.args[0]).to.equal(proposalId);
            expect(event?.args[1]).to.equal(owner.address);
            expect(event?.args[2]).to.equal(NEW_CURVE_ID);
        });

        it("should correctly change the storage", async () => {
            const proposalId = await configController.proposalCounter();
            
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
        });

        it("should initiate the curve transition in the comet", async () => {
            expect(await sandboxComet.isTransitionActive()).to.be.true;
        });

        it("should allow curator to accept proposal if the curator is the proposer", async () => {
            await snapshot.restore();
            await configController.connect(curator).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(curator).acceptProposal(proposalId)).to.not.be.reverted;
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            // Create first proposal
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            
            // Create second proposal with different curve ID
            await configController.connect(owner).createProposal(calldata, secondCometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();
            
            // Accept first proposal
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
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

    describe("accept ProposeCometCurve proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal before maturity period", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalNotMatured");
        });

        it("should revert when trying to accept proposal after expiration", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_LIFETIME + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when non-owner tries to accept proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(users[0]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(
                configController.connect(owner).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).acceptProposal(proposalId);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is cancelled", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(owner).cancelProposal(proposalId);
            
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when transition is already active", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await configController.connect(owner).acceptProposal(proposalId);

            // Try to create a new proposal
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [CHANGE_CURVE_MATURITY + 1]);
            await ethers.provider.send("evm_mine", []);

            await expect(configController.connect(owner).acceptProposal(proposalId2)).to.be.revertedWithCustomError(configController, "CurveTransitionAlreadyInitiated");
        });
    });

});