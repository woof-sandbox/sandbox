import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometExtension, CometHarness, ConfigController } from "../build/types";
import { ethers, exp, expect, makeProtocol, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

describe("21. Set incentive", () => {
  let snapshot: SnapshotRestorer;

  let configController: ConfigController;
  let users: SignerWithAddress[];
  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let comet: CometHarness;
  let cometExtension: CometExtension;

  // constants
  const newTrackingIndexScale = exp(1, 15);
  const newBaseMinForRewards = exp(1000, 6);
  const newBaseTrackingSupplySpeed = exp(1, 6);
  const newBaseTrackingBorrowSpeed = exp(1, 6);

  before(async () => {
    ({ configController, users, owner, comet, dao } = await makeProtocol());

    cometExtension = (await ethers.getContractAt("CometExtension", comet.address, owner)) as CometExtension;

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("dao incentive config setting", function () {
    it("dao can set dao incentive config", async function () {
      // update dao base tracking speeds
      await comet
        .connect(dao)
        .setDaoIncentiveConfig(newTrackingIndexScale, newBaseMinForRewards, newBaseTrackingSupplySpeed, newBaseTrackingBorrowSpeed);

      // Get updated base tracking speed
      const { daoBaseTrackingSupplySpeed, daoBaseTrackingBorrowSpeed, daoTrackingIndexScale, daoBaseMinForRewards } =
        await cometExtension.getConfiguration();

      // check that new speeds are set
      expect(daoBaseTrackingSupplySpeed).to.equal(newBaseTrackingSupplySpeed);
      expect(daoBaseTrackingBorrowSpeed).to.equal(newBaseTrackingBorrowSpeed);
      expect(daoTrackingIndexScale).to.equal(newTrackingIndexScale);
      expect(daoBaseMinForRewards).to.equal(newBaseMinForRewards);
    });

    it("should emit an event when dao incentive config is set", async function () {
      await expect(
        comet
          .connect(dao)
          .setDaoIncentiveConfig(newTrackingIndexScale, newBaseMinForRewards, newBaseTrackingSupplySpeed, newBaseTrackingBorrowSpeed)
      )
        .to.emit(comet, "DaoIncentiveConfigChanged")
        .withArgs(newTrackingIndexScale, newBaseMinForRewards, newBaseTrackingSupplySpeed, newBaseTrackingBorrowSpeed);
    });

    it("should revert if non-dao tries to set dao base speeds", async function () {
      const value = exp(1, 6);

      await expect(comet.connect(users[0]).setDaoIncentiveConfig(value, value, value, value)).to.be.revertedWithCustomError(
        comet,
        "Unauthorized"
      );
    });

    it("should revert if daoTrackingIndexScale is less than 1", async function () {
      const value = exp(1, 6);

      await expect(comet.connect(dao).setDaoIncentiveConfig(0, value, value, value)).to.be.revertedWithCustomError(
        comet,
        "BadTrackingIndexScale"
      );
    });
  });

  describe("incentive config setting", function () {
    it("should allow to set incentive config on config controller", async () => {
      await configController
        .connect(owner)
        .setIncentiveConfigOnMarket(
          comet.address,
          newTrackingIndexScale,
          newBaseMinForRewards,
          newBaseTrackingSupplySpeed,
          newBaseTrackingBorrowSpeed
        );

      // Get updated base tracking speed
      const { baseTrackingSupplySpeed, baseTrackingBorrowSpeed, trackingIndexScale, baseMinForRewards } =
        await cometExtension.getConfiguration();

      // check that new speeds are set
      expect(baseTrackingSupplySpeed).to.equal(newBaseTrackingSupplySpeed);
      expect(baseTrackingBorrowSpeed).to.equal(newBaseTrackingBorrowSpeed);
      expect(trackingIndexScale).to.equal(newTrackingIndexScale);
      expect(baseMinForRewards).to.equal(newBaseMinForRewards);
    });

    it("should emit an event when incentive config is set", async () => {
      await expect(
        configController
          .connect(owner)
          .setIncentiveConfigOnMarket(
            comet.address,
            newTrackingIndexScale,
            newBaseMinForRewards,
            newBaseTrackingSupplySpeed,
            newBaseTrackingBorrowSpeed
          )
      )
        .to.emit(comet, "IncentiveConfigChanged")
        .withArgs(newTrackingIndexScale, newBaseMinForRewards, newBaseTrackingSupplySpeed, newBaseTrackingBorrowSpeed);
    });

    it("should revert if called by non-owner", async () => {
      await expect(
        comet
          .connect(users[4])
          .setIncentiveConfig(newTrackingIndexScale, newBaseMinForRewards, newBaseTrackingSupplySpeed, newBaseTrackingBorrowSpeed)
      ).to.be.revertedWithCustomError(comet, "Unauthorized");
    });

    it("should revert if trackingIndexScale is less than 1", async () => {
      const value = exp(1, 6);

      await expect(configController.setIncentiveConfigOnMarket(comet.address, 0, value, value, value)).to.be.revertedWithCustomError(
        comet,
        "BadTrackingIndexScale"
      );
    });
  });
});
