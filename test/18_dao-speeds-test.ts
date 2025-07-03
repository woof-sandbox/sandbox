import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometExtension, CometHarness, FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
import { ethers, exp, expect, makeProtocol, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

describe("18. DAO speeds", function () {
  let snapshot: SnapshotRestorer;

  let comet: CometHarness;
  let cometExtension: CometExtension;
  let baseToken: FaucetToken | NonStandardFaucetFeeToken;
  let collateral: FaucetToken | NonStandardFaucetFeeToken;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let dao: SignerWithAddress;

  before(async function () {
    const protocol = await makeProtocol({
      base: "USDC",
      assets: {
        USDC: { decimals: 6, initialPrice: 1 },
        COMP: {
          decimals: 18,
          initialPrice: 100,
        },
      },
    });

    comet = protocol.comet;
    baseToken = protocol.baseToken!;
    [owner, alice, bob] = protocol.users!;
    collateral = protocol.tokens!.COMP;
    dao = protocol.dao as SignerWithAddress;

    cometExtension = (await ethers.getContractAt("CometExtension", comet.address)) as CometExtension;

    await baseToken.allocateTo(alice.address, exp(10_000, 6));

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("base tracking speed setting", function () {
    it("dao can set dao base tracking speed", async function () {
      // Get current base tracking speed
      let { daoBaseTrackingSupplySpeed, daoBaseTrackingBorrowSpeed } = await cometExtension.getConfiguration();

      const newDaoBaseTrackingSupplySpeed = exp(1, 6);
      const newDaoBaseTrackingBorrowSpeed = exp(1, 6);

      // check that current speeds are not equal to new speeds
      expect(daoBaseTrackingSupplySpeed).to.not.equal(newDaoBaseTrackingSupplySpeed);
      expect(daoBaseTrackingBorrowSpeed).to.not.equal(newDaoBaseTrackingBorrowSpeed);

      // update dao base tracking speeds
      await comet.connect(dao).setDaoBaseSpeeds(newDaoBaseTrackingSupplySpeed, newDaoBaseTrackingBorrowSpeed);

      // Get updated base tracking speed
      ({ daoBaseTrackingSupplySpeed, daoBaseTrackingBorrowSpeed } = await cometExtension.getConfiguration());

      // check that new speeds are set
      expect(daoBaseTrackingSupplySpeed).to.equal(newDaoBaseTrackingSupplySpeed);
      expect(daoBaseTrackingBorrowSpeed).to.equal(newDaoBaseTrackingBorrowSpeed);
    });

    it("should emit an event when dao base speeds are set", async function () {
      const newSpeed = exp(1, 6);

      await expect(comet.connect(dao).setDaoBaseSpeeds(newSpeed, newSpeed)).to.emit(comet, "DaoSpeedsChanged").withArgs(newSpeed, newSpeed);
    });

    it("should revert if non-dao tries to set dao base speeds", async function () {
      const newSpeed = exp(1, 6);

      await expect(comet.connect(alice).setDaoBaseSpeeds(newSpeed, newSpeed)).to.be.revertedWithCustomError(comet, "Unauthorized");
    });
  });

  describe("accrue dao tracking indexes", function () {
    it("total supply base > baseMinForRewards, then increase daoTrackingSupplyIndex", async function () {
      console.log("test");
      console.log(owner, alice, collateral, bob);
    });
  });
});
