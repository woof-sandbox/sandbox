import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { 
    ConfigController,
    ConfigController__factory
} from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { BigNumber, ContractTransaction, ContractReceipt, Event } from "ethers";
import { expect, defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";

describe("30. Owner Transfer Proposal", () => {
    let configController: ConfigController;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let newOwner: SignerWithAddress;
    let users: SignerWithAddress[];
    let cometAddress: string;
    let calldata: string;
    let proposalType: number;
    let curatorProposalType: number;

    // Constants for owner transfer proposals
    const LIFETIME_PERIOD = 2 * 7 * 24 * 60 * 60; // 2 weeks

    before(async () => {
        const signers = await ethers.getSigners();
        owner = signers[0];
        curator = signers[1];
        guardian = signers[2];
        const dao = signers[3];
        users = signers.slice(4); // Get all remaining signers as users array

        // Create SandboxController
        const sandboxControllerOpts = defaultSandboxControllerOpts({
            owner: owner,
            dao: dao,
            treasury: users[0]
        });
        const sandboxControllerInfo = await makeSandboxController(sandboxControllerOpts);
        const sandboxController = sandboxControllerInfo.sandboxController;

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
        
        // Accept the curator proposal
        await configController.connect(curator).acceptProposal(0);
        
        // Prepare owner transfer proposal data
        newOwner = users[0];
        calldata = ethers.utils.defaultAbiCoder.encode(["address"], [newOwner.address]);
        proposalType = 6; // ProposeTransferOwnership
        cometAddress = ethers.constants.AddressZero; // Owner transfer proposals don't use comet address
        curatorProposalType = 0; // ProposeCurator
        snapshot = await takeSnapshot();
    });

    describe("create owner transfer proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should create an owner transfer proposal", async() => {
            await expect(configController.connect(owner).createProposal(calldata, cometAddress, proposalType)).to.not.be.reverted;
        });

        it("should show that the proposal counter is incremented", async () => {
            const beforeCallCounter = await configController.proposalCounter();
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const afterCallCounter = await configController.proposalCounter();
            expect(afterCallCounter).to.equal(beforeCallCounter.add(1));
        });

        it("should show that the proposal data is saved correctly", async () => {
            const tx = await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const receipt = await tx.wait();
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;
            const proposal = await configController.proposals(await configController.proposalCounter());

            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.expirationTime).to.be.equal(blockTimestamp + LIFETIME_PERIOD);
            expect(proposal.maturityTime).to.be.equal(0);
            expect(proposal.timelock).to.equal(0);
        });

        it("should allow creating multiple proposals with the same calldata", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        });

        it("should emit the ProposeTransferOwnership event when the proposal is created", async () => {
            const tx = await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const receipt = await tx.wait();
            const event = receipt.events?.find(
                (e) => e.event === "ProposeTransferOwnership"
            );
            expect(event).to.not.be.undefined;
            expect(event.args[0]).to.equal(await configController.proposalCounter());
            expect(event.args[1]).to.equal(owner.address);
            expect(event.args[2]).to.equal(newOwner.address);
        });
    });

    describe("create owner transfer proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to create proposal", async () => {
            await expect(
                configController.connect(users[0]).createProposal(calldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to create proposal", async () => {
            await expect(
                configController.connect(curator).createProposal(calldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when guardian tries to create proposal", async () => {
            await expect(
                configController.connect(guardian).createProposal(calldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when invalid proposal type is used", async () => {
            await expect(
                configController.connect(owner).createProposal(calldata, cometAddress, 99)
            ).to.be.revertedWithCustomError(configController, "InvalidProposalType");
        });

        it("should revert when proposed new owner is address zero", async () => {
            const encodedZeroAddress = ethers.utils.defaultAbiCoder.encode(["address"], [ethers.constants.AddressZero]);
            await expect(
                configController.connect(owner).createProposal(encodedZeroAddress, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidOwner");
        });

        it("should revert when proposed new owner is current owner", async () => {
            const encodedCurrentOwner = ethers.utils.defaultAbiCoder.encode(["address"], [owner.address]);
            await expect(
                configController.connect(owner).createProposal(encodedCurrentOwner, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidOwner");
        });

        it("should revert when proposed new owner is current curator", async () => {
            const encodedCurrentCurator = ethers.utils.defaultAbiCoder.encode(["address"], [curator.address]);
            await expect(
                configController.connect(owner).createProposal(encodedCurrentCurator, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidOwner");
        });

        it("should revert when proposed new owner is current guardian", async () => {
            const encodedCurrentGuardian = ethers.utils.defaultAbiCoder.encode(["address"], [guardian.address]);
            await expect(
                configController.connect(owner).createProposal(encodedCurrentGuardian, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidOwner");
        });
    });

    describe("cancel owner transfer proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            await expect(tx).to.not.be.reverted;
        });

        it("should update the proposal expiration time when cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when cancelled by owner", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });
    });

    describe("cancel owner transfer proposal - reverts", () => {
        let proposalId: BigNumber;

        before(async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            proposalId = await configController.proposalCounter();
        });

        after(async () => {
            await snapshot.restore();
        });

        it("should revert when non-owner tries to cancel proposal", async () => {
            await expect(configController.connect(users[0]).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to cancel proposal", async () => {
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when guardian tries to cancel proposal", async () => {
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when proposal is not active", async () => {
            await expect(configController.connect(owner).cancelProposal(proposalId.add(1))).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposal is expired", async () => {
            await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });
    });

    describe("accept owner transfer proposal - happy cases", () => {
        let receipt: ContractReceipt;
        after(async () => {
            await snapshot.restore();
        });

        it("should accept the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            const tx = await configController.connect(newOwner).acceptProposal(proposalId);
            receipt = await tx.wait();
            await expect(tx).to.not.be.reverted;
        });

        it("should emit the ProposeTransferOwnershipAccepted event when the proposal is accepted", async () => {
            const event = receipt.events?.find(
                (e) => e.event === "ProposeTransferOwnershipAccepted"
            );
            const proposalId = await configController.proposalCounter();
            expect(event).to.not.be.undefined;
            expect(event?.args?.proposalId).to.equal(proposalId);
            expect(event?.args?.accepter).to.equal(newOwner.address);
            expect(event?.args?.newOwner).to.equal(newOwner.address);
        });

        it("should correctly change the proposal storage", async () => {
            const proposalId = await configController.proposalCounter();
            
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
            expect(proposal.proposalType).to.equal(proposalType);
            expect(proposal.comet).to.equal(cometAddress);
            expect(proposal.call).to.equal(calldata);
            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.maturityTime).to.equal(0);
            expect(proposal.timelock).to.equal(0);
        });

        it("should transfer ownership to new owner", async () => {
            expect(await configController.owner()).to.equal(newOwner.address);
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            // Create first proposal
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            
            // Create second proposal with different owner
            const secondCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [users[1].address]);
            await configController.connect(owner).createProposal(secondCalldata, cometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();

            // Accept first proposal
            await configController.connect(newOwner).acceptProposal(proposalId1);
            expect(await configController.owner()).to.equal(newOwner.address);
            
            await configController.connect(users[1]).acceptProposal(proposalId2);
            expect(await configController.owner()).to.equal(users[1].address);
        });
    });

    describe("accept owner transfer proposal - reverts", () => {
        let proposalId: BigNumber;
        let snapshot: SnapshotRestorer;
        
        before(async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            proposalId = await configController.proposalCounter();
            snapshot = await takeSnapshot();
        });

        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal after expiration", async () => {
            await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(newOwner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
            await snapshot.restore();
        });

        it("should revert when non-proposed owner tries to accept", async () => {
            await expect(
                configController.connect(users[1]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when current owner tries to accept", async () => {
            await expect(
                configController.connect(owner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when curator tries to accept", async () => {
            await expect(
                configController.connect(curator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when guardian tries to accept", async () => {
            await expect(
                configController.connect(guardian).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;

            await expect(
                configController.connect(newOwner).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            await configController.connect(newOwner).acceptProposal(proposalId);
            
            await expect(
                configController.connect(newOwner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
            await snapshot.restore();
        });

        it("should revert when proposal is cancelled", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(owner).cancelProposal(proposalId);
            
            await expect(
                configController.connect(newOwner).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
            await snapshot.restore();
        });

        it("should revert when proposed new owner is current owner", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            await configController.connect(newOwner).acceptProposal(proposalId);
            
            await expect(
                configController.connect(owner).acceptProposal(proposalId.sub(1))
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
            await snapshot.restore();
        });

        it("should revert when proposed new owner is current curator", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            const curatorCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [newOwner.address]);
            await configController.connect(owner).createProposal(curatorCalldata, cometAddress, curatorProposalType);
            const proposalId2 = await configController.proposalCounter();
            await configController.connect(newOwner).acceptProposal(proposalId2);
            
            await expect(
                configController.connect(curator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
            await snapshot.restore();
        });

        it("should revert when proposed new owner is current guardian", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();

            await configController.connect(owner).setGuardian(newOwner.address);
            
            await expect(
                configController.connect(guardian).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("owner transfer edge cases", () => {

        it("should maintain other roles after ownership transfer", async () => {
            // Transfer ownership to new owner
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(newOwner).acceptProposal(proposalId);
            
            // Verify other roles remain unchanged
            expect(await configController.curator()).to.equal(curator.address);
            expect(await configController.guardian()).to.equal(guardian.address);
            expect(await configController.owner()).to.equal(newOwner.address);
        });

        it("should allow new owner to create proposals after transfer", async () => {
            await snapshot.restore();
            // Transfer ownership first
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            
            await configController.connect(newOwner).acceptProposal(proposalId1);
            
            // New owner should be able to create proposals
            const anotherUser = users[3];
            const anotherUserCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [anotherUser.address]);
            
            await expect(
                configController.connect(newOwner).createProposal(anotherUserCalldata, cometAddress, proposalType)
            ).to.not.be.reverted;
        });

        it("should prevent old owner from creating proposals after transfer", async () => {
            await snapshot.restore();
            // Transfer ownership first
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            
            await configController.connect(newOwner).acceptProposal(proposalId1);
            
            // Old owner should not be able to create proposals
            const anotherUser = users[3];
            const anotherUserCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [anotherUser.address]);
            
            await expect(
                configController.connect(owner).createProposal(anotherUserCalldata, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });
});
