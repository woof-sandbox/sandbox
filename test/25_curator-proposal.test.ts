import { SnapshotRestorer, takeSnapshot } from "@nomicfoundation/hardhat-network-helpers";
import { 
    ConfigController,
    ConfigController__factory
} from "../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers } from "hardhat";
import { ContractTransaction, ContractReceipt, Event } from "ethers";
import { expect, defaultSandboxControllerOpts, makeSandboxController, makeConfigControllerFactory, makeCometFactory } from "./helper/helpers";

describe("25. Curator Proposal", () => {
    let configController: ConfigController;
    let snapshot: SnapshotRestorer;
    let owner: SignerWithAddress;
    let curator: SignerWithAddress;
    let guardian: SignerWithAddress;
    let newCurator: SignerWithAddress;
    let users: SignerWithAddress[];
    let cometAddress: string;
    let calldata: string;
    let proposalType: number;

    // Constants for curator proposals
    const MATURITY_PERIOD = 0; // Curator proposals have no maturity period
    const LIFETIME_PERIOD = 7 * 24 * 60 * 60; // 1 week
    const TIMELOCK_PERIOD = 0; // Curator proposals have no timelock

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
        
        // Prepare curator proposal data
        newCurator = users[0];
        calldata = ethers.utils.defaultAbiCoder.encode(["address"], [newCurator.address]);
        proposalType = 0; // ProposeCurator
        cometAddress = ethers.constants.AddressZero; // Curator proposals don't use comet address
        
        snapshot = await takeSnapshot();
    });

    describe("create curator proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should create a curator proposal", async() => {
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
            expect(proposal.maturityTime).to.be.equal(blockTimestamp + MATURITY_PERIOD);
            expect(proposal.timelock).to.equal(blockTimestamp + TIMELOCK_PERIOD);
        });

        it("should made the proposal with the same calldata twice", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
        });

        it("should emit the event when the proposal is created", async () => {
            const tx = await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const receipt = await tx.wait();
            const blockTimestamp = (await ethers.provider.getBlock(receipt.blockNumber)).timestamp;

            expect(receipt.events[0].args[0]).to.equal(await configController.proposalCounter());
            expect(receipt.events[0].args[1]).to.equal(curator.address);
            expect(receipt.events[0].args[2]).to.equal(newCurator.address);
            expect(receipt.events[0].args[3]).to.equal(blockTimestamp + LIFETIME_PERIOD);
        });
    });

    describe("create curator proposal - reverts", () => {
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

        it("should revert when proposed curator is current curator", async () => {
            const encodedCurrentCurator = ethers.utils.defaultAbiCoder.encode(["address"], [curator.address]);
            await expect(
                configController.connect(owner).createProposal(encodedCurrentCurator, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidCurator");
        });

        it("should revert when proposed curator is owner", async () => {
            const encodedOwner = ethers.utils.defaultAbiCoder.encode(["address"], [owner.address]);
            await expect(
                configController.connect(owner).createProposal(encodedOwner, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidCurator");
        });

        it("should revert when proposed curator is guardian", async () => {
            const encodedGuardian = ethers.utils.defaultAbiCoder.encode(["address"], [guardian.address]);
            await expect(
                configController.connect(owner).createProposal(encodedGuardian, cometAddress, proposalType)
            ).to.be.revertedWithCustomError(configController, "InvalidCurator");
        });
    });

    describe("cancel curator proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should cancel the proposal when the proposal not in the maturity period by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should update storage when the proposal that is not in the maturity period is cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should cancel the proposal by the owner when the proposal is in the maturity period", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.not.be.reverted;
        });

        it("should update storage when the proposal that is in the maturity period is cancelled by the owner", async () => {
            const proposalId = await configController.proposalCounter();
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should emit the event when the proposal is cancelled by the owner", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            const tx = await configController.connect(owner).cancelProposal(proposalId);
            const receipt = await tx.wait();
            expect(receipt.events[0].args[0]).to.equal(proposalId);
            expect(receipt.events[0].args[1]).to.equal(owner.address);
        });
    });

    describe("cancel curator proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });
        
        it("should revert cancel the proposal by the guardian since the proposal maturity period is zero", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await expect(configController.connect(guardian).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
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
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(owner).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when the proposal is created by the owner and the curator is try to cancel the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await expect(configController.connect(curator).cancelProposal(proposalId)).to.be.revertedWithCustomError(configController, "Unauthorized");
        });
    });

    describe("accept curator proposal - happy cases", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should accept the proposal", async () => {
            await configController.createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            await expect(configController.connect(newCurator).acceptProposal(proposalId)).to.not.be.reverted;
        });

        it("should emit the event when the proposal is accepted", async () => {
            await snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            
            const tx = await configController.connect(newCurator).acceptProposal(proposalId);
            const receipt = await tx.wait();
            const event = receipt.events?.find(
                (e) => e.event === "CuratorAccepted"
            );
            expect(event).to.not.be.undefined;
            expect(event?.args?.proposalId).to.equal(proposalId);
            expect(event?.args?.oldCurator).to.equal(curator.address);
            expect(event?.args?.newCurator).to.equal(newCurator.address);
        });

        it("should correctly change the proposal storage", async () => {
            const proposalId = await configController.proposalCounter();
            
            const proposal = await configController.proposals(proposalId);
            expect(proposal.expirationTime).to.equal(0);
        });

        it("should transfer curator role to new curator", async () => {
            expect(await configController.curator()).to.equal(newCurator.address);
        });

        it("should correctly handle multiple proposals and accept them in sequence", async () => {
            await snapshot.restore();
            // Create first proposal
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId1 = await configController.proposalCounter();
            
            // Create second proposal with different curator
            const secondCalldata = ethers.utils.defaultAbiCoder.encode(["address"], [users[1]?.address || ethers.constants.AddressZero]);
            await configController.connect(owner).createProposal(secondCalldata, cometAddress, proposalType);
            const proposalId2 = await configController.proposalCounter();
            
            // Wait for maturity
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);

            // Accept first proposal
            await configController.connect(newCurator).acceptProposal(proposalId1);
            expect(await configController.curator()).to.equal(newCurator.address);
            
            // Accept second proposal
            if (users[1]) {
                await configController.connect(users[1]).acceptProposal(proposalId2);
                expect(await configController.curator()).to.equal(users[1].address);
            }
        });
    });

    describe("accept curator proposal - reverts", () => {
        after(async () => {
            await snapshot.restore();
        });

        it("should revert when trying to accept proposal after expiration", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(newCurator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");

            snapshot.restore();
        });

        it("should revert when non-proposed curator tries to accept", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await expect(
                configController.connect(users[1]).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "Unauthorized");
        });

        it("should revert when trying to accept non-existent proposal", async () => {
            const nonExistentProposalId = 999;
            await expect(
                configController.connect(newCurator).acceptProposal(nonExistentProposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when trying to accept already accepted proposal", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(newCurator).acceptProposal(proposalId);
            
            await expect(
                configController.connect(newCurator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });

        it("should revert when proposed curator is guardian", async () => {
            snapshot.restore();
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);

            await configController.connect(owner).setGuardian(newCurator.address);

            await expect(
                configController.connect(newCurator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "InvalidCurator");

            snapshot.restore();
        });

        it("should revert when proposal is expired", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await ethers.provider.send("evm_increaseTime", [LIFETIME_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(newCurator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "ProposalExpired");
        });

        it("should revert when proposal is cancelled", async () => {
            await configController.connect(owner).createProposal(calldata, cometAddress, proposalType);
            const proposalId = await configController.proposalCounter();
            
            await configController.connect(owner).cancelProposal(proposalId);
            
            await ethers.provider.send("evm_increaseTime", [MATURITY_PERIOD + 1]);
            await ethers.provider.send("evm_mine", []);
            
            await expect(
                configController.connect(newCurator).acceptProposal(proposalId)
            ).to.be.revertedWithCustomError(configController, "NoActiveProposal");
        });
    });
});
