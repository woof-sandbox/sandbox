import { ethers, expect, makeConfigController } from "./helper/helpers";

describe("ConfigController", () => {
  describe("grantOwnership", () => {
    it("should transfer ownership", async () => {
      const { configController, users } = await makeConfigController();

      await configController.grantOwnership(users[4].address);

      expect(await configController.owner()).to.equal(users[4].address);
    });

    it("reverts if newOwner is zero address", async () => {
      const { configController } = await makeConfigController();

      await expect(configController.grantOwnership(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if not owner", async () => {
      const { configController, users } = await makeConfigController();

      await expect(configController.connect(users[4]).grantOwnership(users[5].address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });

  describe("Curator Role Proposal", () => {
    it("should allow owner to propose new curator", async () => {
      const { configController, users } = await makeConfigController();
      const proposedCurator = users[4].address;
      await expect(configController.proposeCurator(proposedCurator))
        .to.emit(configController, "CuratorProposed")
        .withArgs(await configController.curator(), proposedCurator, await configController.curatorProposalExpiry());
      expect(await configController.proposedCurator()).to.equal(proposedCurator);
      expect(await configController.curatorProposalExpiry()).to.be.gt(0);
    });

    it("should allow proposed curator to accept the role", async () => {
      const { configController, users } = await makeConfigController();
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
      const { configController, users } = await makeConfigController();
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      await expect(configController.cancelCuratorProposal())
        .to.emit(configController, "CuratorProposalCancelled")
        .withArgs(proposedCurator);
      expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
      expect(await configController.curatorProposalExpiry()).to.equal(0);
    });

    it("should revert if non-owner tries to propose curator", async () => {
      const { configController, users } = await makeConfigController();
      const proposedCurator = users[4].address;
      await expect(configController.connect(users[4]).proposeCurator(proposedCurator)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if non-proposed curator tries to accept role", async () => {
      const { configController, users } = await makeConfigController();
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      await expect(configController.connect(users[5]).acceptCuratorRole()).to.be.revertedWithCustomError(configController, "Unauthorized");
    });

    it("should revert if non-owner tries to cancel proposal", async () => {
      const { configController, users } = await makeConfigController();
      const proposedCurator = users[4].address;
      await configController.proposeCurator(proposedCurator);
      await expect(configController.connect(users[4]).cancelCuratorProposal()).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if proposing zero address as curator", async () => {
      const { configController } = await makeConfigController();
      await expect(configController.proposeCurator(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if proposing current curator as new curator", async () => {
      const { configController } = await makeConfigController();
      const currentCurator = await configController.curator();
      await expect(configController.proposeCurator(currentCurator)).to.be.revertedWithCustomError(configController, "InvalidCurator");
    });

    it("should revert if trying to accept expired proposal", async () => {
      const { configController, users } = await makeConfigController();
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
      const { configController } = await makeConfigController();
      await expect(configController.cancelCuratorProposal()).to.be.revertedWithCustomError(configController, "NoActiveProposal");
    });

    it("should allow owner to remove curator", async () => {
      const { configController, users } = await makeConfigController();
      const currentCurator = await configController.curator();
      await expect(configController.removeCurator()).to.emit(configController, "CuratorCanceled").withArgs(currentCurator);
      expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if non-owner tries to remove curator", async () => {
      const { configController, users } = await makeConfigController();
      await expect(configController.connect(users[4]).removeCurator()).to.be.revertedWithCustomError(configController, "Unauthorized");
    });
  });

  describe("setGuardian", () => {
    it("should allow owner to set new guardian", async () => {
      const { configController, users } = await makeConfigController();
      const newGuardian = users[4].address;
      const currentGuardian = await configController.guardian();
      await expect(configController.setGuardian(newGuardian))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(currentGuardian, newGuardian);
      expect(await configController.guardian()).to.equal(newGuardian);
    });

    it("should allow owner to set guardian to zero address", async () => {
      const { configController } = await makeConfigController();
      const currentGuardian = await configController.guardian();
      await expect(configController.setGuardian(ethers.constants.AddressZero))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(currentGuardian, ethers.constants.AddressZero);
      expect(await configController.guardian()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if non-owner tries to set guardian", async () => {
      const { configController, users } = await makeConfigController();
      const newGuardian = users[4].address;
      await expect(configController.connect(users[4]).setGuardian(newGuardian)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });

  describe("setProposalDurations", function () {
    it("should allow owner to set valid durations", async function () {
      const { configController, owner, sandboxController } = await makeConfigController();

      const maxUpdateTime = (await sandboxController.proposalBoundaries())[1];
      const newDuration = maxUpdateTime.sub(1 * 24 * 60 * 60); // 6 days

      const oldCuratorDuration = await configController.curatorProposalDuration();
      const oldProposalDuration = await configController.proposalDuration();

      await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
        .to.emit(configController, "ProposalDurationsUpdated")
        .withArgs(oldCuratorDuration, newDuration, oldProposalDuration, newDuration);

      expect(await configController.proposalDuration()).to.equal(newDuration);
      expect(await configController.curatorProposalDuration()).to.equal(newDuration);
    });

    it("should revert when durations are below minimum update time", async function () {
      const { configController, owner } = await makeConfigController();
      const newDuration = 299;
      await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when minUpdate is higher than new duration", async function () {
      const { configController, owner, sandboxController } = await makeConfigController();

      const minUpdateTime = (await sandboxController.proposalBoundaries())[0];
      const newDuration = minUpdateTime.add(1 * 60 * 24 * 24); // +1 days
      await expect(configController.connect(owner).setProposalDurations(newDuration, minUpdateTime.sub(1))).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );

      await expect(configController.connect(owner).setProposalDurations(minUpdateTime.sub(1), newDuration)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when durations are set to zero", async function () {
      const { configController, owner } = await makeConfigController();
      await expect(configController.connect(owner).setProposalDurations(0, 0)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when called by non-owner", async function () {
      const { configController, users } = await makeConfigController();
      const newDuration = 14 * 24 * 60 * 60; // 14 days
      await expect(configController.connect(users[0]).setProposalDurations(newDuration, newDuration)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should emit event with correct old and new values", async function () {
      const { configController, owner, sandboxController } = await makeConfigController();

      const maxUpdateTime = (await sandboxController.proposalBoundaries())[1];
      const newDuration = maxUpdateTime.sub(1 * 24 * 60 * 60); // 6 days

      const oldCuratorDuration = await configController.curatorProposalDuration();
      const oldProposalDuration = await configController.proposalDuration();

      await expect(configController.connect(owner).setProposalDurations(newDuration, newDuration))
        .to.emit(configController, "ProposalDurationsUpdated")
        .withArgs(oldCuratorDuration, newDuration, oldProposalDuration, newDuration);
    });
  });
});
