import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ConfigController, ISandboxController, SandboxComet, SandboxComet__factory } from "../build/types";
import {
  ethers,
  expect,
  makeConfigController,
  defaultCollateralConfig,
  CollateralConfig,
  SnapshotRestorer,
  takeSnapshot,
  DEFAULT_UPDATE_TIME,
} from "./helper/helpers";
import { CometConfigStruct, CollateralTokenConfigStruct } from "../build/types/ConfigController";
import { BigNumberish } from "ethers";

describe("4. ConfigController", () => {
  let owner, dao, curator, other, treasury, guardian: SignerWithAddress;
  let curatorProposalDuration: BigNumberish;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  let baseToken;
  let collateralTokens: CollateralTokenConfigStruct[] = [];

  before(async function () {
    [owner, dao, treasury, curator, guardian, other] = await ethers.getSigners();

    const opts = await makeConfigController(
      {
        owner: owner,
        dao: dao,
        treasury: treasury.address,
        curator: curator,
        guardian: guardian,
      },
      false
    );
    configController = opts.configController;
    sandboxController = opts.sandboxController;

    baseToken = opts.baseToken;

    const asset = Object.keys(opts.collaterals)[0];
    const collateralConfig: CollateralConfig = defaultCollateralConfig();
    collateralTokens.push({
      collateralToken: opts.collaterals[asset].address,
      borrowCollateralFactor: collateralConfig.borrowCF,
      liquidateCollateralFactor: collateralConfig.liquidateCF,
      liquidationFactor: collateralConfig.liquidationFactor,
      supplyCap: collateralConfig.supplyCap,
    });

    curatorProposalDuration = await configController.curatorProposalDuration();
  });

  /// for integrity. construction is checked in another testset
  describe("initial check", () => {
    it("owner should be set", async () => {
      expect(await configController.owner()).to.equal(owner.address);
    });

    it("curator should be proposed and not set", async () => {
      expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
      expect(await configController.proposedCurator()).to.equal(curator.address);
    });

    it("guardian is set", async () => {
      expect(await configController.guardian()).to.equal(guardian.address);
    });

    it("proposal duration is default", async () => {
      expect(curatorProposalDuration).to.equal(DEFAULT_UPDATE_TIME);
    });

    it("no comets registered", async () => {
      expect(await configController.cometsLength()).to.equal(0);
    });
  });

  describe("Curator Role Proposal", () => {
    describe("Initial flow", () => {
      it("1. should revert on curator other than initial", async () => {
        await expect(configController.connect(other).acceptCuratorRole()).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("2. initial curator can accept", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await expect(configController.connect(curator).acceptCuratorRole()).to.not.be.reverted;
        expect(await configController.curator()).to.equal(curator.address);
        expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);

        await snapshot.restore();
      });

      it("3. initial proposal (set during creation) can expire", async () => {
        await ethers.provider.send("evm_increaseTime", [DEFAULT_UPDATE_TIME + 1]); // 7 days 1 sec
        await ethers.provider.send("evm_mine", []);

        await expect(configController.connect(curator).acceptCuratorRole()).to.be.revertedWithCustomError(
          configController,
          "ProposalExpired"
        );
      });

      it("4. should allow owner to propose new curator", async () => {
        expect(await configController.proposeCurator(other.address))
          .to.emit(configController, "CuratorProposed")
          .withArgs(
            ethers.constants.AddressZero,
            other.address,
            (await ethers.provider.getBlock("latest")).timestamp + DEFAULT_UPDATE_TIME
          );

        expect(await configController.proposedCurator()).to.equal(other.address);
        expect(await configController.curatorProposalExpiry()).to.equal(
          (await ethers.provider.getBlock("latest")).timestamp + DEFAULT_UPDATE_TIME
        );
      });

      it("5. should allow owner to propose new curator before the expiration of previous", async () => {
        expect(await configController.proposeCurator(curator.address))
          .to.emit(configController, "CuratorProposed")
          .withArgs(other.address, curator.address, (await ethers.provider.getBlock("latest")).timestamp + DEFAULT_UPDATE_TIME);
        expect(await configController.proposedCurator()).to.equal(curator.address);
        expect(await configController.curatorProposalExpiry()).to.equal(
          (await ethers.provider.getBlock("latest")).timestamp + DEFAULT_UPDATE_TIME
        );
      });

      it("6. should allow proposed curator to accept the role", async () => {
        expect(await configController.connect(curator).acceptCuratorRole())
          .to.emit(configController, "CuratorAccepted")
          .withArgs(ethers.constants.AddressZero, curator.address);
        expect(await configController.curator()).to.equal(curator.address);
        expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
        expect(await configController.curatorProposalExpiry()).to.equal(0);
      });
    });

    describe("reverts and checks", () => {
      it("should revert if non-owner tries to propose curator", async () => {
        await expect(configController.connect(other).proposeCurator(dao.address)).to.be.revertedWithCustomError(
          configController,
          "Unauthorized"
        );
      });

      it("should revert for curator (non-owner tries to propose curator)", async () => {
        await expect(configController.connect(curator).proposeCurator(other.address)).to.be.revertedWithCustomError(
          configController,
          "Unauthorized"
        );
      });

      it("should revert if proposing current curator as new curator", async () => {
        expect(await configController.curator()).to.equal(curator.address);
        await expect(configController.proposeCurator(curator.address)).to.be.revertedWithCustomError(configController, "InvalidCurator");
      });

      it("should revert if proposing zero address as curator", async () => {
        await expect(configController.proposeCurator(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
          configController,
          "ZeroAddress"
        );
      });

      it("should revert if trying to cancel non-existent proposal", async () => {
        expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
        await expect(configController.cancelCuratorProposal()).to.be.revertedWithCustomError(configController, "NoActiveProposal");
      });

      it("should revert if non-proposed curator tries to accept role", async () => {
        await configController.proposeCurator(other.address);
        await expect(configController.connect(curator).acceptCuratorRole()).to.be.revertedWithCustomError(configController, "Unauthorized");
        await expect(configController.connect(treasury).acceptCuratorRole()).to.be.revertedWithCustomError(
          configController,
          "Unauthorized"
        );
      });

      it("should revert if trying to accept expired proposal", async () => {
        await configController.proposeCurator(other.address);
        // Fast forward time past the proposal expiration
        await ethers.provider.send("evm_increaseTime", [DEFAULT_UPDATE_TIME + 1]);
        await ethers.provider.send("evm_mine", []);
        await expect(configController.connect(other).acceptCuratorRole()).to.be.revertedWithCustomError(
          configController,
          "ProposalExpired"
        );
      });

      it("should revert if non-owner tries to remove curator", async () => {
        await expect(configController.connect(dao).removeCurator()).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("should revert for curator (if non-owner tries to remove curator) - can't remove self", async () => {
        await expect(configController.connect(curator).removeCurator()).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("should revert if cancelled not by owner", async () => {
        expect(await configController.proposedCurator()).to.not.equal(ethers.constants.AddressZero);
        await expect(configController.connect(other).cancelCuratorProposal()).to.be.revertedWithCustomError(
          configController,
          "Unauthorized"
        );
      });

      it("should revert for curator (if cancelled not by owner)", async () => {
        expect(await configController.proposedCurator()).to.not.equal(ethers.constants.AddressZero);
        await expect(configController.connect(curator).cancelCuratorProposal()).to.be.revertedWithCustomError(
          configController,
          "Unauthorized"
        );
      });
    });

    describe("happy cases", () => {
      it("should allow owner to cancel curator proposal", async () => {
        expect(await configController.proposedCurator()).to.not.equal(ethers.constants.AddressZero);

        expect(await configController.cancelCuratorProposal())
          .to.emit(configController, "CuratorProposalCancelled")
          .withArgs(other.address);

        expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
        expect(await configController.curatorProposalExpiry()).to.equal(0);
      });

      it("should allow owner to remove curator", async () => {
        expect(await configController.removeCurator())
          .to.emit(configController, "CuratorCanceled")
          .withArgs(curator.address);
        expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
      });

      it("should allow proposed curator to accept the role", async () => {
        await configController.proposeCurator(curator.address);

        expect(await configController.connect(curator).acceptCuratorRole())
          .to.emit(configController, "CuratorAccepted")
          .withArgs(ethers.constants.AddressZero, curator.address);

        expect(await configController.curator()).to.equal(curator.address);
        expect(await configController.proposedCurator()).to.equal(ethers.constants.AddressZero);
        expect(await configController.curatorProposalExpiry()).to.equal(0);
      });
    });
  });

  describe("grantOwnership", () => {
    it("reverts if newOwner is zero address", async () => {
      await expect(configController.grantOwnership(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert if not owner", async () => {
      await expect(configController.connect(other).grantOwnership(treasury.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (if not owner)", async () => {
      expect(await configController.curator()).to.equal(curator.address);

      await expect(configController.connect(curator).grantOwnership(treasury.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for the same value", async () => {
      await expect(configController.grantOwnership(owner.address)).to.be.revertedWithCustomError(configController, "IncorrectValue");
    });

    it("should transfer ownership", async () => {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      await expect(configController.grantOwnership(other.address)).to.not.be.reverted;
      expect(await configController.owner()).to.equal(other.address);

      await snapshot.restore();
    });

    it("should emit event during ownership transfer", async () => {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      expect(await configController.grantOwnership(other.address))
        .to.emit(configController, "OwnershipGranted")
        .withArgs(owner.address, other.address);

      await snapshot.restore();
    });
  });

  describe("setGuardian", () => {
    it("should allow owner to set new guardian", async () => {
      expect(await configController.setGuardian(other.address))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(guardian.address, other.address);

      expect(await configController.guardian()).to.equal(other.address);
    });

    it("should allow owner to set guardian to zero address", async () => {
      expect(await configController.setGuardian(ethers.constants.AddressZero))
        .to.emit(configController, "GuardianUpdated")
        .withArgs(other.address, ethers.constants.AddressZero);

      expect(await configController.guardian()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if non-owner tries to set guardian", async () => {
      await expect(configController.connect(other).setGuardian(guardian.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (if non-owner tries to set guardian)", async () => {
      await expect(configController.connect(curator).setGuardian(guardian.address)).to.be.revertedWithCustomError(
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

      expect(await configController.connect(owner).setProposalDurations(newDuration, newDuration))
        .to.emit(configController, "ProposalDurationsUpdated")
        .withArgs(oldCuratorDuration, newDuration, oldProposalDuration, newDuration);

      expect(await configController.proposalDuration()).to.equal(newDuration);
      expect(await configController.curatorProposalDuration()).to.equal(newDuration);
    });

    it("should revert when durations are below minimum update time", async function () {
      const minUpdateTime = (await sandboxController.proposalBoundaries())[0];
      const newDuration = minUpdateTime - 1;

      await expect(configController.connect(owner).setProposalDurations(newDuration, minUpdateTime)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );

      await expect(configController.connect(owner).setProposalDurations(minUpdateTime, newDuration)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when durations are above maximum update time", async function () {
      const maxUpdateTime = (await sandboxController.proposalBoundaries())[1];
      const newDuration = maxUpdateTime + 1;

      await expect(configController.connect(owner).setProposalDurations(newDuration, maxUpdateTime)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooLong"
      );

      await expect(configController.connect(owner).setProposalDurations(maxUpdateTime, newDuration)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooLong"
      );
    });

    it("should revert when durations are set to zero", async function () {
      await expect(configController.connect(owner).setProposalDurations(DEFAULT_UPDATE_TIME, 0)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );

      await expect(configController.connect(owner).setProposalDurations(0, DEFAULT_UPDATE_TIME)).to.be.revertedWithCustomError(
        configController,
        "ProposalDurationTooShort"
      );
    });

    it("should revert when called by non-owner", async function () {
      const newDuration = 14 * 24 * 60 * 60; // 14 days
      await expect(configController.connect(other).setProposalDurations(newDuration, newDuration)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (when called by non-owner)", async function () {
      const newDuration = 14 * 24 * 60 * 60; // 14 days
      await expect(configController.connect(curator).setProposalDurations(newDuration, newDuration)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });
  });

  describe("Fees", function () {
    /// tests for setCometFee()
    // extractFees() tests only basic reverts - fees extraction is tested in a separate testset
    let externalComet: SandboxComet;
    let newComet: SandboxComet;
    let marketConfig: CometConfigStruct;

    before(async function () {
      const sandboxComet_: SandboxComet__factory = (await ethers.getContractFactory("SandboxComet")) as SandboxComet__factory;
      externalComet = await sandboxComet_.deploy();
      await externalComet.deployed();

      marketConfig = {
        baseToken: baseToken.address,
        collateralTokens: collateralTokens.map(obj => ({ ...obj })),
        baseTokenCurveId: 0n,
        name: "Comet",
      };
    });

    // no comets by default
    it("should revert when setting fees with no Comets", async function () {
      await expect(configController.setCometFee(externalComet.address, true)).to.be.revertedWithCustomError(
        configController,
        "UnknownComet"
      );
    });

    it("should revert when extracting fees with no Comets", async function () {
      await expect(configController.extractFees(externalComet.address, baseToken.address)).to.be.revertedWithCustomError(
        configController,
        "UnknownComet"
      );
    });

    it("should have disabled controller fee for new Comet ", async function () {
      const amount = await sandboxController.suggestedAmountOfSeedReserves(baseToken.address);
      await baseToken.allocateTo(owner.address, amount);
      await baseToken.approve(configController.address, amount);

      await configController.connect(owner).createComet(marketConfig);
      newComet = (await ethers.getContractAt("SandboxComet", await configController.comets(0))) as SandboxComet;

      expect(await configController.cometFeeEnabled(newComet.address)).to.be.false;
    });

    it("should revert when setting fees with zero address", async function () {
      await expect(configController.setCometFee(ethers.constants.AddressZero, true)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert when extracting fees without Comet address", async function () {
      await expect(configController.extractFees(ethers.constants.AddressZero, baseToken.address)).to.be.revertedWithCustomError(
        configController,
        "ZeroAddress"
      );
    });

    it("should revert when setting fees for external comet", async function () {
      await expect(configController.setCometFee(externalComet.address, true)).to.be.revertedWithCustomError(
        configController,
        "UnknownComet"
      );
    });

    it("should revert when extracting fees for external comet", async function () {
      await expect(configController.extractFees(externalComet.address, baseToken.address)).to.be.revertedWithCustomError(
        configController,
        "UnknownComet"
      );
    });

    it("should revert when setting same fee flag", async function () {
      await expect(configController.setCometFee(newComet.address, false)).to.be.revertedWithCustomError(configController, "IncorrectValue");
    });

    it("should revert when setting fee not by owner", async function () {
      await expect(configController.connect(other).setCometFee(newComet.address, true)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (when setting fee not by owner)", async function () {
      await expect(configController.connect(curator).setCometFee(newComet.address, true)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert when extracting fee not by owner", async function () {
      await expect(configController.connect(other).extractFees(newComet.address, baseToken.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (when extracting fee not by owner)", async function () {
      await expect(configController.connect(curator).extractFees(newComet.address, baseToken.address)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should allow owner to change fee flag for a comet", async function () {
      expect(await configController.setCometFee(newComet.address, true))
        .to.emit(configController, "CometFeeEnabled")
        .withArgs(configController.address, newComet.address, true);
    });
  });
});
