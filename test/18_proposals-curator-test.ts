import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { makeProtocol, ethers, expect } from "./helper/helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ContractTransaction, ContractReceipt } from "ethers";
import { ConfigController } from "../build/types";

describe("18. Proposals - Curator", () => {
    let configController: ConfigController;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let users: [SignerWithAddress];

    before(async () => {
        const protocol = await makeProtocol();
        configController = <ConfigController>protocol.configController;
        owner = <SignerWithAddress>protocol.owner;
        curator = <SignerWithAddress>protocol.curator;
        users = <[SignerWithAddress]>protocol.users;

        snapshot = await takeSnapshot();
    });

    afterEach(async () => {
        await snapshot.restore();
    });

    describe("createProposal - ProposeCurator", () => {
        it("should create a curator proposal successfully", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            // Create the proposal
            const tx: ContractTransaction = await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            const receipt: ContractReceipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "CuratorProposed");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(await configController.proposalCounter()); // proposalId
                expect(event.args[1]).to.equal(curator.address); // old curator
                expect(event.args[2]).to.equal(newCurator.address); // new curator
            }

            // Check proposal was created correctly
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            
            expect(proposal.proposer).to.equal(owner.address);
            expect(proposal.proposalType).to.equal(0); // ProposeCurator
            expect(proposal.comet).to.equal(ethers.constants.AddressZero);
            expect(proposal.call).to.equal(encodedNewCurator);
            expect(proposal.expirationTime).to.be.gt(0);
            expect(proposal.maturityTime).to.equal(0);
            expect(proposal.timelock).to.equal(0);
        });

        it("should fail if non-owner tries to create curator proposal", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            await expect(configController.connect(users[1]).createProposal(encodedNewCurator, ethers.constants.AddressZero, 0)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should fail if proposed curator is current curator", async () => {
            const encodedCurrentCurator = ethers.utils.defaultAbiCoder.encode(["address"], [curator.address]);
            
            await expect(configController.createProposal(encodedCurrentCurator, ethers.constants.AddressZero, 0)).to.be.revertedWithCustomError(configController, "InvalidCurator");
        });

        it("should fail if proposed curator is owner", async () => {
            const encodedOwner = ethers.utils.defaultAbiCoder.encode(["address"], [owner.address]);
            
            await expect(configController.createProposal(encodedOwner, ethers.constants.AddressZero, 0)).to.be.revertedWithCustomError(configController, "InvalidCurator");
        });

        it("should fail if proposed curator is guardian", async () => {
            const guardian = await configController.guardian();
            const encodedGuardian = ethers.utils.defaultAbiCoder.encode(["address"], [guardian]);
            
            await expect(configController.createProposal(encodedGuardian, ethers.constants.AddressZero, 0)).to.be.revertedWithCustomError(configController, "InvalidCurator");
        });

        it("should increment proposal counter correctly", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            const initialCounter = await configController.proposalCounter();
            
            // Create first proposal
            await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            expect(await configController.proposalCounter()).to.equal(initialCounter + 1);
            
            // Create second proposal
            await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            expect(await configController.proposalCounter()).to.equal(initialCounter + 2);
        });

        it("should set correct timestamps for curator proposal", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            const currentTime = Math.floor(Date.now() / 1000);
            
            // Create the proposal
            await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            
            // Check expiration time (1 week from now)
            expect(proposal.expirationTime).to.be.gt(currentTime + 6 * 24 * 60 * 60); // > 6 days
            expect(proposal.expirationTime).to.be.lt(currentTime + 8 * 24 * 60 * 60); // < 8 days
            
            // Check maturity time (should be 0 for curator proposals)
            expect(proposal.maturityTime).to.equal(0);
            
            // Check timelock (should be 0 for curator proposals)
            expect(proposal.timelock).to.equal(0);
        });
    });

    describe("acceptProposal - ProposeCurator", () => {
        it("should accept a curator proposal successfully", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            // Create the proposal
            await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            const proposalId = await configController.proposalCounter();
            
            // Accept the proposal
            const tx = await configController.connect(newCurator).acceptProposal(proposalId);
            const receipt = await tx.wait();
            
            // Check if the event was emitted
            const event = receipt.events?.find(e => e.event === "CuratorAccepted");
            expect(event).to.not.be.undefined;
            
            if (event && event.args) {
                expect(event.args[0]).to.equal(proposalId); // proposalId
                expect(event.args[1]).to.equal(curator.address); // old curator
                expect(event.args[2]).to.equal(newCurator.address); // new curator
            }

            // Check that curator was updated
            expect(await configController.curator()).to.equal(newCurator.address);
        });

        it("should fail if non-proposed curator tries to accept", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            // Create the proposal
            await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            const proposalId = await configController.proposalCounter();
            
            await expect(configController.connect(users[1]).acceptProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should fail if proposal has expired", async () => {
            const newCurator = users[0];
            const encodedNewCurator = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
            
            // Create the proposal
            await configController.createProposal(encodedNewCurator, ethers.constants.AddressZero, 0);
            const proposalId = await configController.proposalCounter();
            
            // Fast forward time to expire the proposal (1 week + 1 day)
            await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
            await ethers.provider.send("evm_mine", []);
            
            // Try to accept expired proposal
            try {
                await configController.connect(newCurator).acceptProposal(proposalId);
                expect.fail("Should have reverted with ProposalExpired");
            } catch (error) {
                expect(error.message).to.include("ProposalExpired");
            }
        });

        it("should fail if proposal doesn't exist", async () => {
            const newCurator = users[0];
            
            try {
                await configController.connect(newCurator).acceptProposal(999); // Non-existent proposal
                expect.fail("Should have reverted with NoActiveProposal");
            } catch (error) {
                expect(error.message).to.include("NoActiveProposal");
            }
        });
    });
}); 