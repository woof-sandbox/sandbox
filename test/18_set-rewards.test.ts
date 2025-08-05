import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometHarness, ConfigController } from "../build/types";
import { ethers, expect, makeProtocol, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

describe("18. Set rewards on Comet", () => {
  let snapshot: SnapshotRestorer;

  let configController: ConfigController;
  let users: SignerWithAddress[];
  let comet: CometHarness;

  before(async () => {
    ({ configController, users, comet } = await makeProtocol());

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("setRewards Config Controller", function () {
    it("should allow to set rewards contract", async function () {
      const rewardsContract = users[4].address;

      await configController.setRewards(comet.address, rewardsContract);

      expect(await comet.rewardAddress()).to.equal(rewardsContract);
    });

    it("should allow to set rewards contract to zero address", async function () {
      await configController.setRewards(comet.address, ethers.constants.AddressZero);

      expect(await comet.rewardAddress()).to.equal(ethers.constants.AddressZero);
    });

    it("should emit 'RewardsSet' event", async function () {
      const rewardsContract = users[4].address;

      await expect(configController.setRewards(comet.address, rewardsContract))
        .to.emit(configController, "RewardsSet")
        .withArgs(comet.address, rewardsContract);
    });

    it("should revert if called by non-owner", async function () {
      const rewardsContract = users[4].address;

      await expect(configController.connect(users[4]).setRewards(comet.address, rewardsContract)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if comet is zero address", async function () {
      const rewardsContract = users[4].address;

      await expect(configController.setRewards(ethers.constants.AddressZero, rewardsContract)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if comet is unknown", async function () {
      const rewardsContract = users[4].address;

      await expect(configController.setRewards(users[5].address, rewardsContract)).to.be.revertedWithCustomError(
        configController,
        "UnknownComet"
      );
    });
  });

  describe("setRewards Comet", () => {
    it("allows to set rewards contract on Comet", async () => {
      const rewards = users[8].address;

      await configController.setRewards(comet.address, rewards);

      expect(await comet.rewardAddress()).to.eq(rewards);
    });

    it("emits an event when rewards are set", async () => {
      const rewards = users[8].address;

      await expect(configController.setRewards(comet.address, rewards)).to.emit(comet, "RewardsSet").withArgs(rewards);

      expect(await comet.rewardAddress()).to.eq(rewards);
    });

    it("allows to set rewards as zero address", async () => {
      await configController.setRewards(comet.address, ethers.constants.AddressZero);

      expect(await comet.rewardAddress()).to.eq(ethers.constants.AddressZero);
    });

    it("reverts if the caller is not config controller", async () => {
      const rewards = users[8].address;

      await expect(comet.connect(users[0]).setRewards(rewards)).to.be.revertedWithCustomError(comet, "Unauthorized");

      expect(await comet.rewardAddress()).to.not.eq(rewards);
    });
  });
});
