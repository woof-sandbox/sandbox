import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometExtension, CometHarness, FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
import { divBaseWei, ethers, exp, fastForward, makeProtocol, SnapshotRestorer, takeSnapshot } from "./helper/helpers";
import { expect } from "chai";

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

  const BASE_MIN_FOR_REWARDS = exp(1000, 6); // 1000 USDC
  const BASE_TRACKING_SUPPLY_SPEED = 10_000;
  const BASE_TRACKING_BORROW_SPEED = 10_000;

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

    await comet.connect(owner).setDaoBaseMinForRewards(BASE_MIN_FOR_REWARDS);
    await comet.connect(dao).setDaoSpeeds(BASE_TRACKING_SUPPLY_SPEED, BASE_TRACKING_BORROW_SPEED);

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
      await comet.connect(dao).setDaoSpeeds(newDaoBaseTrackingSupplySpeed, newDaoBaseTrackingBorrowSpeed);

      // Get updated base tracking speed
      ({ daoBaseTrackingSupplySpeed, daoBaseTrackingBorrowSpeed } = await cometExtension.getConfiguration());

      // check that new speeds are set
      expect(daoBaseTrackingSupplySpeed).to.equal(newDaoBaseTrackingSupplySpeed);
      expect(daoBaseTrackingBorrowSpeed).to.equal(newDaoBaseTrackingBorrowSpeed);
    });

    it("should emit an event when dao base speeds are set", async function () {
      const newSpeed = exp(1, 6);

      await expect(comet.connect(dao).setDaoSpeeds(newSpeed, newSpeed)).to.emit(comet, "DaoSpeedsChanged").withArgs(newSpeed, newSpeed);
    });

    it("should revert if non-dao tries to set dao base speeds", async function () {
      const newSpeed = exp(1, 6);

      await expect(comet.connect(alice).setDaoSpeeds(newSpeed, newSpeed)).to.be.revertedWithCustomError(comet, "Unauthorized");
    });
  });

  describe("accrue dao tracking indexes", function () {
    it("total supply base >= daoBaseMinForRewards, then increase daoTrackingSupplyIndex", async function () {
      // Supply base tokens to achive assertion condition
      const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
      await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

      const { totalSupplyBase } = await cometExtension.totalsBasic();
      expect(totalSupplyBase).to.be.greaterThanOrEqual(Number(daoBaseMinForRewards));

      let { daoTrackingSupplyIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue dao tracking supply index
      const skipTime = 1000;
      await fastForward(skipTime);
      await comet.accrueAccount(alice.address);

      ({ daoTrackingSupplyIndex } = await cometExtension.totalsBasic());

      // calculate expected dao tracking supply index
      const expectedDaoTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_SUPPLY_SPEED * skipTime, totalSupplyBase, comet);

      expect(daoTrackingSupplyIndex).to.eq(expectedDaoTrackingSupplyIndex);
    });

    it("total borrow base >= daoBaseMinForRewards, then increase daoTrackingBorrowIndex", async function () {
      // Supply base tokens to achieve assertion condition
      const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
      await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

      // Borrow base tokens to achieve assertion condition
      await collateral.allocateTo(bob.address, exp(1000, 18));
      await comet.connect(bob).supply(collateral.address, exp(1000, 18));
      await comet.connect(bob).withdraw(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

      const { totalBorrowBase } = await cometExtension.totalsBasic();
      expect(totalBorrowBase).to.be.greaterThanOrEqual(Number(daoBaseMinForRewards));

      let { daoTrackingBorrowIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue dao tracking borrow index
      const skipTime = 1000;
      await fastForward(skipTime);
      await comet.accrueAccount(alice.address);

      ({ daoTrackingBorrowIndex } = await cometExtension.totalsBasic());

      // calculate expected dao tracking borrow index
      const expectedDaoTrackingBorrowIndex = await divBaseWei(BASE_TRACKING_BORROW_SPEED * skipTime, totalBorrowBase, comet);

      expect(daoTrackingBorrowIndex).to.eq(expectedDaoTrackingBorrowIndex);
    });

    it("should not increase daoTrackingSupplyIndex if total supply base < daoBaseMinForRewards", async function () {
      // Supply base tokens to achieve assertion condition
      const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, daoBaseMinForRewards.sub(1));
      await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.sub(1));

      const { totalSupplyBase } = await cometExtension.totalsBasic();
      expect(totalSupplyBase).to.be.lessThan(Number(daoBaseMinForRewards));

      let { daoTrackingSupplyIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue dao tracking supply index
      await fastForward(1000);
      await comet.accrueAccount(alice.address);

      ({ daoTrackingSupplyIndex } = await cometExtension.totalsBasic());

      // dao tracking supply index should not change
      expect(daoTrackingSupplyIndex).to.eq(0);
    });

    it("should not increase daoTrackingBorrowIndex if total borrow base < daoBaseMinForRewards", async function () {
      // Supply base tokens to achieve assertion condition
      const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
      await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

      // Borrow base tokens to achieve assertion condition
      await collateral.allocateTo(bob.address, exp(1000, 18));
      await comet.connect(bob).supply(collateral.address, exp(1000, 18));
      await comet.connect(bob).withdraw(baseToken.address, daoBaseMinForRewards.sub(1));

      const { totalBorrowBase } = await cometExtension.totalsBasic();
      expect(totalBorrowBase).to.be.lessThan(Number(daoBaseMinForRewards));

      let { daoTrackingBorrowIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue dao tracking borrow index
      await fastForward(1000);
      await comet.accrueAccount(alice.address);

      ({ daoTrackingBorrowIndex } = await cometExtension.totalsBasic());

      // dao tracking borrow index should not change
      expect(daoTrackingBorrowIndex).to.eq(0);
    });
  });

  describe("update user dao tracking indexes", function () {
    describe("principal >= 0 (supplying)", function () {
      it("when rewards disabled daoBaseTrackingAccrued should not increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, daoBaseMinForRewards.sub(1));
        await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.sub(1));

        const { daoBaseTrackingAccrued } = await comet.userBasic(alice.address);

        expect(daoBaseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        await fastForward(1000);

        const { daoBaseTrackingAccrued: daoBaseTrackingAccruedAfter } = await comet.userBasic(alice.address);

        expect(daoBaseTrackingAccruedAfter).to.eq(0);
      });

      it("when rewards enabled daoBaseTrackingAccrued should increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        const { daoBaseTrackingAccrued } = await comet.userBasic(alice.address);
        const { totalSupplyBase } = await cometExtension.totalsBasic();

        expect(daoBaseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(alice.address);

        const { daoBaseTrackingAccrued: daoBaseTrackingAccruedAfter, principal } = await comet.userBasic(alice.address);

        const expectedDaoTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_SUPPLY_SPEED * skipTime, totalSupplyBase, comet);
        const delta = expectedDaoTrackingSupplyIndex;
        const baseScale = await comet.baseScale();
        const accrualDescaleFactor = baseScale.div(exp(1, 6));
        const expectedDaoBaseTrackingAccrued = principal
          .mul(delta)
          .div(await comet.trackingIndexScale())
          .div(accrualDescaleFactor);

        expect(daoBaseTrackingAccruedAfter).to.eq(expectedDaoBaseTrackingAccrued);
      });

      it("users daoBaseTrackingIndex becomes current daoTrackingSupplyIndex", async () => {
        // Supply base tokens to achieve assertion condition
        const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        const { daoBaseTrackingAccrued } = await comet.userBasic(alice.address);
        const { totalSupplyBase } = await cometExtension.totalsBasic();

        expect(daoBaseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(alice.address);

        const { daoBaseTrackingIndex } = await comet.userBasic(alice.address);

        const expectedDaoTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_SUPPLY_SPEED * skipTime, totalSupplyBase, comet);

        expect(daoBaseTrackingIndex).to.eq(expectedDaoTrackingSupplyIndex);
      });
    });

    describe("principal < 0 (borrowing)", function () {
      it("when rewards disabled daoBaseTrackingAccrued should not increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        // Borrow base tokens to achieve assertion condition
        await collateral.allocateTo(bob.address, exp(1000, 18));
        await comet.connect(bob).supply(collateral.address, exp(1000, 18));
        await comet.connect(bob).withdraw(baseToken.address, daoBaseMinForRewards.sub(1));

        const { daoBaseTrackingAccrued } = await comet.userBasic(alice.address);

        expect(daoBaseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        await fastForward(1000);

        const { daoBaseTrackingAccrued: daoBaseTrackingAccruedAfter } = await comet.userBasic(alice.address);

        expect(daoBaseTrackingAccruedAfter).to.eq(0);
      });

      it("when rewards enabled daoBaseTrackingAccrued should increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        // Borrow base tokens to achieve assertion condition
        await collateral.allocateTo(bob.address, exp(1000, 18));
        await comet.connect(bob).supply(collateral.address, exp(1000, 18));
        await comet.connect(bob).withdraw(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        const { daoBaseTrackingAccrued } = await comet.userBasic(bob.address);
        const { totalBorrowBase } = await cometExtension.totalsBasic();

        expect(daoBaseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(bob.address);

        const { daoBaseTrackingAccrued: daoBaseTrackingAccruedAfter, principal } = await comet.userBasic(bob.address);

        const expectedDaoTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_BORROW_SPEED * skipTime, totalBorrowBase, comet);
        const delta = expectedDaoTrackingSupplyIndex;
        const baseScale = await comet.baseScale();
        const accrualDescaleFactor = baseScale.div(exp(1, 6));
        const expectedDaoBaseTrackingAccrued = -principal
          .mul(delta)
          .div(await comet.trackingIndexScale())
          .div(accrualDescaleFactor);

        expect(daoBaseTrackingAccruedAfter).to.eq(expectedDaoBaseTrackingAccrued);
      });

      it("users daoBaseTrackingIndex becomes current daoTrackingBorrowIndex", async () => {
        // Supply base tokens to achieve assertion condition
        const { daoBaseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, daoBaseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        // Borrow base tokens to achieve assertion condition
        await collateral.allocateTo(bob.address, exp(1000, 18));
        await comet.connect(bob).supply(collateral.address, exp(1000, 18));
        await comet.connect(bob).withdraw(baseToken.address, daoBaseMinForRewards.add(exp(10, 6)));

        const { daoBaseTrackingAccrued } = await comet.userBasic(bob.address);
        const { totalBorrowBase } = await cometExtension.totalsBasic();

        expect(daoBaseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(bob.address);

        const { daoBaseTrackingIndex } = await comet.userBasic(bob.address);

        const expectedDaoTrackingBorrowIndex = await divBaseWei(BASE_TRACKING_BORROW_SPEED * skipTime, totalBorrowBase, comet);

        expect(daoBaseTrackingIndex).to.eq(expectedDaoTrackingBorrowIndex);
      });
    });
  });
});
