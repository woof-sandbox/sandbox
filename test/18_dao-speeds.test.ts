import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometExtension, CometHarness, FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
import { divBaseWei, ethers, exp, expect, fastForward, makeProtocol, SnapshotRestorer, takeSnapshot } from "./helper/helpers";

describe("18. DAO speeds", function () {
  let snapshot: SnapshotRestorer;

  let comet: CometHarness;
  let cometExtension: CometExtension;
  let baseToken: FaucetToken | NonStandardFaucetFeeToken;
  let collateral: FaucetToken | NonStandardFaucetFeeToken;

  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let unusedAccount: SignerWithAddress;
  let dao: SignerWithAddress;

  const BASE_MIN_FOR_REWARDS = exp(1000, 6); // 1000 USDC
  const BASE_TRACKING_SUPPLY_SPEED = 10_000;
  const BASE_TRACKING_BORROW_SPEED = 10_000;
  const DAO_TRACKING_INDEX_SCALE = 1;

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
    [owner, alice, bob, unusedAccount] = protocol.users!;
    collateral = protocol.tokens!.COMP;
    dao = protocol.dao as SignerWithAddress;

    cometExtension = (await ethers.getContractAt("CometExtension", comet.address, owner)) as CometExtension;

    await comet
      .connect(dao)
      .setDaoIncentiveConfig(DAO_TRACKING_INDEX_SCALE, BASE_MIN_FOR_REWARDS, BASE_TRACKING_SUPPLY_SPEED, BASE_TRACKING_BORROW_SPEED);

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

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
      it("when totalSupplyBase < daoBaseMinForRewards, user's daoBaseTrackingAccrued should not increased", async () => {
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

      it("when totalSupplyBase >= daoBaseMinForRewards, user's daoBaseTrackingAccrued should increased", async () => {
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

  it("reverts on overflows", async () => {
    const t0 = await comet.totalsBasic();

    const t1 = Object.assign({}, t0, {
      baseSupplyIndex: 2n ** 64n - 1n,
      totalSupplyBase: 14000,
      totalBorrowBase: 13000, // needs to have positive utilization for supply rate to be > 0
    });

    await fastForward(998);

    await comet.setTotalsBasic(t1);
    await fastForward(2);

    await expect(comet.accrue()).to.be.revertedWith(
      "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );

    const t2 = Object.assign({}, t0, {
      baseBorrowIndex: 2n ** 64n - 1n,
    });
    await fastForward(998);
    const _s1 = await comet.setTotalsBasic(t2);
    await fastForward(2);
    await expect(comet.accrue()).to.be.revertedWith(
      "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );
  });

  it("supports up to the maximum timestamp then breaks", async () => {
    await fastForward(100);
    await comet.accrue();

    await fastForward(2 ** 40);
    await expect(comet.accrue()).to.be.revertedWith("custom error 'TimestampTooLarge()'");
  });

  it("has no effect when called on an address with no protocol activity", async () => {
    const userBasic0 = await comet.userBasic(unusedAccount.address);
    await comet.accrueAccount(unusedAccount.address);
    const userBasic1 = await comet.userBasic(unusedAccount.address);

    expect(userBasic0).to.deep.equal(userBasic1);
    expect(userBasic1.principal).to.eq(0);
    expect(userBasic1.baseTrackingIndex).to.eq(0);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);
    expect(userBasic1.assetsIn).to.eq(0);
  });
});
