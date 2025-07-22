import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometHarness, ConfigController, ISandboxController } from "../build/types";
import { ethers, expect, makeProtocol, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

describe("4. ConfigController", () => {
  let snapshot: SnapshotRestorer;

  let configController: ConfigController;
  let users: SignerWithAddress[];
  let owner: SignerWithAddress;
  let sandboxController: ISandboxController;
  let comet: CometHarness;

  before(async () => {
    ({ configController, users, owner, sandboxController, comet } = await makeProtocol());

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("grantOwnership", () => {
    it("should transfer ownership", async () => {
      await configController.grantOwnership(users[4].address);

      expect(await configController.owner()).to.equal(users[4].address);
    });

    it("reverts if newOwner is zero address", async () => {
      await expect(configController.grantOwnership(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if not owner", async () => {
      await expect(configController.connect(users[4]).grantOwnership(users[5].address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });

  describe("Curator Role Proposal", () => {
    it("should allow owner to propose new curator", async () => {
      const proposedCurator = users[4].address;
      await expect(configController.proposeCurator(proposedCurator))
        .to.emit(configController, "CuratorProposed")
        .withArgs(await configController.curator(), proposedCurator, await configController.curatorProposalExpiry());
      expect(await configController.proposedCurator()).to.equal(proposedCurator);
      expect(await configController.curatorProposalExpiry()).to.be.gt(0);
    });

    it("should allow proposed curator to accept the role", async () => {
      const proposedCurator = users[4].address;
      const currentCurator = await configController.curator();
      await configController.proposeCurator(proposedCurator);
      await expect(configController.connect(users[4]).acceptCuratorRole())
        .to.emit(configController, "CuratorAccepted")
        .withArgs(currentCurator, proposedCurator);
      expect(await configController.curator()).to.equal(proposedCurator);
      expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
      expect(await configController.curatorProposalExpiry()).to.equal(0);
    });

    it("should allow owner to cancel curator proposal", async () => {
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      await expect(configController.cancelCuratorProposal())
        .to.emit(configController, "CuratorProposalCancelled")
        .withArgs(proposedCurator);
      expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
      expect(await configController.curatorProposalExpiry()).to.equal(0);
    });

    it("should revert if non-owner tries to propose curator", async () => {
      const proposedCurator = users[4].address;
      await expect(configController.connect(users[4]).proposeCurator(proposedCurator)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if non-proposed curator tries to accept role", async () => {
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      await expect(configController.connect(users[5]).acceptCuratorRole()).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert if non-owner tries to cancel proposal", async () => {
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      await expect(configController.connect(users[4]).cancelCuratorProposal()).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if proposing zero address as curator", async () => {
      await expect(configController.proposeCurator(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if proposing current curator as new curator", async () => {
      const currentCurator = await configController.curator();
      await expect(configController.proposeCurator(currentCurator)).to.be.revertedWithCustomError(configController, "InvalidCurator");
    });

    it("should revert if trying to accept expired proposal", async () => {
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      // Fast forward time past the proposal expiration
      await ethers.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]); // 8 days
      await ethers.provider.send("evm_mine", []);
      await expect(configController.connect(users[4]).acceptCuratorRole()).to.be.revertedWithCustomError(
        configController,
        "ProposalExpired"
      );
    });

    it("should revert if trying to cancel non-existent proposal", async () => {
      await expect(configController.cancelCuratorProposal()).to.be.revertedWithCustomError(configController, "NoActiveProposal");
    });

    it("should allow owner to remove curator", async () => {
      const currentCurator = await configController.curator();
      await expect(configController.removeCurator()).to.emit(configController, "CuratorCanceled").withArgs(currentCurator);
      expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if non-owner tries to remove curator", async () => {
      await expect(configController.connect(users[4]).removeCurator()).to.be.revertedWithCustomError(configController, "Unauthorized");
    });
  });

  describe("setGuardian", () => {
    it("should allow owner to set new guardian", async () => {
      const newGuardian = users[4].address;
      const currentGuardian = await configController.guardian();
      await expect(configController.setGuardian(newGuardian))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(currentGuardian, newGuardian);
      expect(await configController.guardian()).to.equal(newGuardian);
    });

    it("should allow owner to set guardian to zero address", async () => {
      const currentGuardian = await configController.guardian();
      await expect(configController.setGuardian(ethers.constants.AddressZero))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(currentGuardian, ethers.constants.AddressZero);
      expect(await configController.guardian()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if non-owner tries to set guardian", async () => {
      const newGuardian = users[4].address;
      await expect(configController.connect(users[4]).setGuardian(newGuardian)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });

  describe("setProposalDurations", function () {
    it("should allow owner to set valid durations", async function () {
      const maxUpdateTime = (await sandboxController.proposalBoundaries())[1];
      const newDuration = maxUpdateTime - 1 * 24 * 60 * 60; // 6 days

      const oldCuratorDuration = await configController.curatorProposalDuration();
      const oldProposalDuration = await configController.proposalDuration();

      await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
        .to.emit(configController, "ProposalDurationsUpdated")
        .withArgs(oldCuratorDuration, newDuration, oldProposalDuration, newDuration);

      expect(await configController.proposalDuration()).to.equal(newDuration);
      expect(await configController.curatorProposalDuration()).to.equal(newDuration);
    });

    it("should revert when durations are below minimum update time", async function () {
      const newDuration = 299;
      await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when minUpdate is higher than new duration", async function () {
      const minUpdateTime = (await sandboxController.proposalBoundaries())[0];
      const newDuration = minUpdateTime + 1 * 60 * 24 * 24; // +1 days
      await expect(configController.connect(owner).setProposalDurations(newDuration, minUpdateTime - 1)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );

      await expect(configController.connect(owner).setProposalDurations(minUpdateTime - 1, newDuration)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when durations are set to zero", async function () {
      await expect(configController.connect(owner).setProposalDurations(0, 0)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when called by non-owner", async function () {
      const newDuration = 14 * 24 * 60 * 60; // 14 days
      await expect(configController.connect(users[0]).setProposalDurations(newDuration, newDuration)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should emit event with correct old and new values", async function () {
      const maxUpdateTime = (await sandboxController.proposalBoundaries())[1];
      const newDuration = maxUpdateTime - 1 * 24 * 60 * 60; // 6 days

      const oldCuratorDuration = await configController.curatorProposalDuration();
      const oldProposalDuration = await configController.proposalDuration();

      await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
        .to.emit(configController, "ProposalDurationsUpdated")
        .withArgs(oldCuratorDuration, newDuration, oldProposalDuration, newDuration);
    });
  });

  describe("setIncentiveConfigOnMarket", function () {
    // Data for the incentive config
    const trackingIndexScale = 1000;
    const baseMinForRewards = 1000000n;
    const baseTrackingSupplySpeed = 500;
    const baseTrackingBorrowSpeed = 300;
    const minSupplyForReward = 1000n;
    const minBorrowForReward = 500n;

    it("should allow to set incentive config on market", async () => {
      // Set incentive config
      await configController
        .connect(owner)
        .setIncentiveConfigOnMarket(
          comet.address,
          trackingIndexScale,
          baseMinForRewards,
          baseTrackingSupplySpeed,
          baseTrackingBorrowSpeed,
          minSupplyForReward,
          minBorrowForReward
        );

      // Check that the config was set correctly
      const cometExtension = await ethers.getContractAt("CometExtension", comet.address);
      const config = await cometExtension.getConfiguration();
      expect(config.trackingIndexScale).to.equal(trackingIndexScale);
      expect(config.baseMinForRewards).to.equal(baseMinForRewards);
      expect(config.baseTrackingSupplySpeed).to.equal(baseTrackingSupplySpeed);
      expect(config.baseTrackingBorrowSpeed).to.equal(baseTrackingBorrowSpeed);
      expect(config.minSupplyForReward).to.equal(minSupplyForReward);
      expect(config.minBorrowForReward).to.equal(minBorrowForReward);
    });

    it("should revert if called by non-owner", async () => {
      await expect(
        configController
          .connect(users[4])
          .setIncentiveConfigOnMarket(
            comet.address,
            trackingIndexScale,
            baseMinForRewards,
            baseTrackingSupplySpeed,
            baseTrackingBorrowSpeed,
            minSupplyForReward,
            minBorrowForReward
          )
      ).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert if comet address is zero", async () => {
      await expect(
        configController.setIncentiveConfigOnMarket(
          ethers.constants.AddressZero,
          trackingIndexScale,
          baseMinForRewards,
          baseTrackingSupplySpeed,
          baseTrackingBorrowSpeed,
          minSupplyForReward,
          minBorrowForReward
        )
      ).to.be.revertedWithCustomError(configController, "ZeroAddress");
    });

    it("should revert if comet is not owned by the controller", async () => {
      await expect(
        configController
          .connect(owner)
          .setIncentiveConfigOnMarket(
            users[4].address,
            trackingIndexScale,
            baseMinForRewards,
            baseTrackingSupplySpeed,
            baseTrackingBorrowSpeed,
            minSupplyForReward,
            minBorrowForReward
          )
      ).to.be.revertedWithCustomError(configController, "UnknownComet");
    });
  });
});
