import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { 
    SandboxController, 
    ConfigController,
    FaucetToken,
    SandboxComet,
    SandboxCometFactory,
    ConfigControllerFactory
} from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ContractTransaction, ContractReceipt, Event, BigNumber } from "ethers";
import { expect, makeProtocol } from "./helper/helpers";
import { after } from "mocha";


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

    before(async () => {
        const protocol = await makeProtocol();
        configController = <ConfigController>protocol.configController;
        owner = <SignerWithAddress>protocol.owner;
        cometAddress = await configController.comets(0);
        users = <[SignerWithAddress]>protocol.users;
        curator = <SignerWithAddress>protocol.curator;
        guardian = <SignerWithAddress>protocol.guardian;
        sandboxController = <SandboxController>protocol.sandboxController;
        sandboxComet = <SandboxComet>await ethers.getContractAt("SandboxComet", cometAddress);
        
        // Get the last collateral asset to remove
        const numAssets = await sandboxComet.numAssets();
        const lastAsset = await sandboxComet.getAssetInfo(numAssets - 1);
        collateralToken = lastAsset.collateralToken;
        
        // Encode the function call
        calldata = iface.encodeFunctionData("initiateCollateralRemoval", [collateralToken]);
        snapshot = await takeSnapshot();
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
            await expect(sandboxComet.getAssetInfo(collateralToken)).
        });

    });
});