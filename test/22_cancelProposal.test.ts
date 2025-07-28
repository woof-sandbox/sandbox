import { takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { makeProtocol, ethers, expect } from "./helper/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers";
import { CollateralAssetStruct } from "../build/types/SandboxComet";

describe("18. Cancel Proposal", () => {
    let configController;
    let snapshot;
    let owner;
    let comet;
    let curator;
    let guardian;
    let tokens;
    let users;

    before(async () => {
        const protocol = await makeProtocol();
        configController = protocol.configController;
        owner = protocol.owner;
        tokens = protocol.tokens;
        comet = protocol.comet;
        users = protocol.users;
        curator = protocol.curator;
        guardian = protocol.guardian;
    });

    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("cancelProposal", () => {
        let newCollateralToken;
        let collateralTokenConfig;
        let calldata;
        let proposalId;
        
        beforeEach(async () => {
            // Create a new token for testing
            const FaucetFactory = await ethers.getContractFactory("FaucetToken");
            newCollateralToken = await FaucetFactory.deploy(
                ethers.utils.parseEther("1000000"), 
                "New Collateral Token", 
                18, 
                "NCT"
            );
            await newCollateralToken.deployed();
            
            // Create price feed for the new token
            const PriceFeedFactory = await ethers.getContractFactory("SimplePriceFeed");
            const priceFeed = await PriceFeedFactory.deploy(
                ethers.utils.parseUnits("100", 8), // $100 price
                8, // 8 decimals
                newCollateralToken.address
            );
            await priceFeed.deployed();
            
            // Whitelist the new collateral token in SandboxController
            const sandboxController = await ethers.getContractAt("ISandboxController", await configController.sandboxController());
            await sandboxController.whitelistCollateralAsset(
                newCollateralToken.address,
                priceFeed.address,
                ethers.utils.parseEther("0.5"), // minBorrowCF
                ethers.utils.parseEther("0.7"), // maxBorrowCF
                ethers.utils.parseEther("0.6"), // minLiquidateCF
                ethers.utils.parseEther("0.8"), // maxLiquidateCF
                ethers.utils.parseEther("0.8"), // minLiquidationFactor
                ethers.utils.parseEther("1.0")  // maxLiquidationFactor
            );

            // Create the collateral token configuration
            collateralTokenConfig = {
                collateralToken: newCollateralToken.address,
                supplyCap: ethers.utils.parseEther("1000000"),
                borrowCollateralFactor: ethers.utils.parseEther("0.6"),
                liquidateCollateralFactor: ethers.utils.parseEther("0.7"),
                liquidationFactor: ethers.utils.parseEther("0.8"),
            };

            // Create interface for the addCollateral function
            const iface = new ethers.utils.Interface([
                "function addCollateralAsset((address collateralToken, uint128 supplyCap, uint64 borrowCollateralFactor, uint64 liquidateCollateralFactor, uint64 liquidationFactor))"
            ]);
            
            // Encode the function call
            calldata = iface.encodeFunctionData("addCollateralAsset", [collateralTokenConfig]);
            
            // Create a proposal
            await configController.createProposal(calldata, comet.address, 1);
            proposalId = await configController.proposalCounter();
        });

        it("should allow owner to cancel proposal during maturity period", async () => {
            // Cancel proposal by owner during maturity period
            const tx = await configController.cancelProposal(proposalId);
            const receipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "ProposalCanceled");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(proposalId); // proposalId
                expect(event.args[1]).to.equal(owner.address); // canceler
            }
            
            // Verify proposal is cancelled
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should allow guardian to cancel proposal during maturity period", async () => {
            // Cancel proposal by guardian during maturity period
            const tx = await configController.connect(guardian).cancelProposal(proposalId);
            const receipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "ProposalCanceled");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(proposalId); // proposalId
                expect(event.args[1]).to.equal(guardian.address); // canceler
            }
            
            // Verify proposal is cancelled
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should allow proposer to cancel proposal after maturity period", async () => {
            // Fast forward past maturity period (1 week)
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Cancel proposal by proposer (owner) after maturity period
            const tx = await configController.cancelProposal(proposalId);
            const receipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "ProposalCanceled");
            expect(event).to.not.be.undefined;
            
            // Verify proposal is cancelled
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should fail if non-authorized user tries to cancel during maturity period", async () => {
            // Try to cancel proposal by non-authorized user during maturity period
            await expect(configController.connect(users[0]).cancelProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should fail if non-authorized user tries to cancel after maturity period", async () => {
            // Fast forward past maturity period
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Try to cancel proposal by non-authorized user after maturity period
            await expect(configController.connect(users[0]).cancelProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should fail if proposal is already cancelled", async () => {
            // Cancel proposal first
            await configController.cancelProposal(proposalId);
            
            // Try to cancel again
            await expect(configController.cancelProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should fail if proposal is expired", async () => {
            // Fast forward past expiration time (2 weeks)
            await ethers.provider.send("evm_increaseTime", [15 * 24 * 60 * 60]); // 15 days
            await ethers.provider.send("evm_mine", []);
            
            // Try to cancel expired proposal
            await expect(configController.cancelProposal(proposalId))
                .to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should fail if proposal doesn't exist", async () => {
            // Try to cancel non-existent proposal
            await expect(configController.cancelProposal(999))
                .to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should allow curator proposal to be cancelled by proposer", async () => {
            // Create a curator proposal
            const newCurator = users[0].address;
            const curatorCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator]);
            
            await configController.createProposal(curatorCalldata, ethers.constants.AddressZero, 0);
            const curatorProposalId = await configController.proposalCounter();
            
            // Cancel curator proposal by proposer (owner)
            const tx = await configController.cancelProposal(curatorProposalId);
            const receipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "ProposalCanceled");
            expect(event).to.not.be.undefined;
            
            // Verify proposal is cancelled
            const proposal = await configController.proposals(curatorProposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should verify proposal state after cancellation", async () => {
            // Get proposal before cancellation
            const proposalBefore = await configController.proposals(proposalId);
            expect(proposalBefore.expirationTime).to.be.gt(0);
            
            // Cancel proposal
            await configController.cancelProposal(proposalId);
            
            // Get proposal after cancellation
            const proposalAfter = await configController.proposals(proposalId);
            expect(proposalAfter.expirationTime).to.equal(0);
            
            // Other fields should remain unchanged
            expect(proposalAfter.proposer).to.equal(proposalBefore.proposer);
            expect(proposalAfter.proposalType).to.equal(proposalBefore.proposalType);
            expect(proposalAfter.comet).to.equal(proposalBefore.comet);
            expect(proposalAfter.call).to.equal(proposalBefore.call);
        });
    });
}); 