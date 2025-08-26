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
} from "./helper/helpers";
import { CollateralTokenConfigStruct } from "../build/types/ConfigController";
import { BigNumber, BigNumberish } from "ethers";

describe("4. ConfigController", () => {
  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let curator: SignerWithAddress;
  let other: SignerWithAddress;
  let treasury: string;
  let guardian: SignerWithAddress;
  let curatorProposalDuration: BigNumberish;
  let configController: ConfigController;
  let sandboxController: ISandboxController;

  let baseToken;
  let collateralTokens: CollateralTokenConfigStruct[] = [];

  before(async function () {
    treasury = ethers.Wallet.createRandom().address;
    [owner, dao, curator, guardian, other] = await ethers.getSigners();

    const opts = await makeConfigController({
      owner: owner,
      dao: dao,
      treasury: treasury,
      curator: curator,
      guardian: guardian,
      acceptCurator: false,
    });
    configController = opts.configController;
    sandboxController = opts.sandboxController;

    baseToken = opts.baseToken;

    const collateralConfig: CollateralConfig = defaultCollateralConfig();

    const supplyCap = (await opts.collaterals["COMP"].totalSupply()).mul(15).div(100); // 15% of total supply
    collateralTokens.push({
      collateralToken: opts.collaterals["COMP"].address,
      borrowCollateralFactor: collateralConfig.borrowCF,
      liquidateCollateralFactor: collateralConfig.liquidateCF,
      liquidationFactor: collateralConfig.liquidationFactor,
      supplyCap: supplyCap,
    });
    curatorProposalDuration = await configController.PROPOSE_CURATOR_LIFETIME();
  });

  /// for integrity. construction is checked in another testset
  describe("initial check", () => {
    it("owner should be set", async () => {
      expect(await configController.owner()).to.equal(owner.address);
    });

    it("curator should be proposed and not set", async () => {
      expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
      const proposal = await configController.proposals(0);
      const decoded = ethers.utils.defaultAbiCoder.decode(["address"], proposal.call);

      const blockTime = (await ethers.provider.getBlock("latest")).timestamp;
      expect(decoded[0]).to.equal(curator.address);
      expect(proposal.proposer).to.equal(owner.address);
      expect(proposal.proposalType).to.equal(0);
      expect(proposal.expirationTime).to.equal(BigNumber.from(blockTime).add(curatorProposalDuration));
      expect(proposal.maturityTime).to.equal(0);
      expect(proposal.timelock).to.equal(0);
      expect(proposal.comet).to.equal(ethers.constants.AddressZero);
    });

    it("guardian is set", async () => {
      expect(await configController.guardian()).to.equal(guardian.address);
    });

    it("no comets registered", async () => {
      expect(await configController.cometsLength()).to.equal(0);
    });
  });

  describe("Curator Role Proposal", () => {
    describe("Initial flow", () => {
      it("1. should revert on curator other than initial", async () => {
        await expect(configController.connect(other).acceptProposal(0)).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("2. initial curator can accept", async () => {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        await expect(configController.connect(curator).acceptProposal(0)).to.not.be.reverted;
        expect(await configController.curator()).to.equal(curator.address);

        await snapshot.restore();
      });

      it("3. initial proposal (set during creation) can expire", async () => {
        await ethers.provider.send("evm_increaseTime", [BigNumber.from(curatorProposalDuration).add(1).toNumber()]); 
        await ethers.provider.send("evm_mine", []);

        await expect(configController.connect(curator).acceptProposal(0)).to.be.revertedWithCustomError(
          configController,
          "ProposalExpired"
        );
      });
    });

    describe("reverts and checks", () => {
      
      it("should revert if non-owner tries to remove curator", async () => {
        await expect(configController.connect(dao).removeCurator()).to.be.revertedWithCustomError(configController, "Unauthorized");
      });

      it("should revert for curator (if non-owner tries to remove curator) - can't remove self", async () => {
        await expect(configController.connect(curator).removeCurator()).to.be.revertedWithCustomError(configController, "Unauthorized");
      });
    });

    describe("happy cases", () => {
      it("should allow owner to remove curator", async () => {
        expect(await configController.removeCurator())
          .to.emit(configController, "CuratorCanceled")
          .withArgs(curator.address);
        expect(await configController.curator()).to.equal(ethers.constants.AddressZero);
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
      await expect(configController.connect(other).grantOwnership(treasury)).to.be.revertedWithCustomError(
        configController,
        "Unauthorized"
      );
    });

    it("should revert for curator (if not owner)", async () => {
      await configController.connect(owner).createProposal(ethers.utils.defaultAbiCoder.encode(["address"], [curator.address]), ethers.constants.AddressZero, 0);
      const proposalId = await configController.proposalCounter();
      await configController.connect(curator).acceptProposal(proposalId);
      
      expect(await configController.curator()).to.equal(curator.address);

      await expect(configController.connect(curator).grantOwnership(treasury)).to.be.revertedWithCustomError(
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
});
