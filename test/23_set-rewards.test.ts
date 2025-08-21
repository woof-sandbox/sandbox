import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ConfigController, CometExtension, SandboxComet } from "../build/types";
import { ethers, expect, makeConfigController, createComet, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

describe("23. Set rewards on Comet", () => {
  let snapshot: SnapshotRestorer;

  let configController: ConfigController;

  let rewardsContract: SignerWithAddress;
  let newRewards: SignerWithAddress;

  let cometExtension: CometExtension;

  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let curator: SignerWithAddress;
  let treasury: SignerWithAddress;
  let guardian: SignerWithAddress;
  let other: SignerWithAddress;

  let comet: SandboxComet;

  before(async () => {
    [owner, dao, treasury, curator, guardian, rewardsContract, newRewards, other] = await ethers.getSigners();

    const opts = await makeConfigController({
      owner: owner,
      dao: dao,
      treasury: treasury.address,
      curator: curator,
      guardian: guardian,
    });
    configController = opts.configController;
    comet = await createComet(owner, opts.opts.assets, configController, opts.sandboxController, opts.collaterals, opts.baseToken);
    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as CometExtension;

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("setRewards Config Controller", function () {
    it("default value for rewards is address(0)", async function () {
      expect(await comet.rewardAddress()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if called by non-owner", async function () {
      await expect(configController.connect(other).setRewards(comet.address, rewardsContract.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (if called by non-owner)", async function () {
      await expect(configController.connect(curator).setRewards(comet.address, rewardsContract.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for dao (if called by non-owner)", async function () {
      await expect(configController.connect(dao).setRewards(comet.address, rewardsContract.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert if comet is zero address", async function () {
      await expect(configController.setRewards(ethers.constants.AddressZero, rewardsContract.address)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if comet is unknown", async function () {
      await expect(configController.setRewards(other.address, rewardsContract.address)).to.be.revertedWithCustomError(
        configController,
        "UnknownComet"
      );
    });

    it("should allow to set rewards contract", async function () {
      await configController.setRewards(comet.address, rewardsContract.address);

      expect(await comet.rewardAddress()).to.equal(rewardsContract.address);
    });

    it("should allow to set rewards contract to zero address", async function () {
      // have non-zero rewards first
      await configController.setRewards(comet.address, rewardsContract.address);
      await configController.setRewards(comet.address, ethers.constants.AddressZero);

      expect(await comet.rewardAddress()).to.equal(ethers.constants.AddressZero);
    });

    it("should emit 'RewardsSet' event", async function () {
      await expect(configController.setRewards(comet.address, rewardsContract.address))
        .to.emit(configController, "RewardsSet")
        .withArgs(comet.address, rewardsContract.address);
    });
  });

  describe("setRewards Comet", () => {
    it("reverts if the caller is not config controller", async () => {
      await expect(cometExtension.connect(other).setRewards(newRewards.address)).to.be.revertedWithCustomError(comet, "Unauthorized");

      expect(await comet.rewardAddress()).to.not.eq(newRewards.address);
    });
  });
});
