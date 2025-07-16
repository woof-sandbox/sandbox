import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometExtension, CometHarness, ConfigController, FaucetToken, NonStandardFaucetFeeToken } from "../build/types";
import { ethers, expect, exp, fastForward, makeProtocol, SnapshotRestorer, takeSnapshot, divBaseWei } from "./helper/helpers";

describe("22. accrue", function () {
  let snapshot: SnapshotRestorer;

  let comet: CometHarness;
  let unusedAccount: SignerWithAddress;
  let owner: SignerWithAddress;
  let configController: ConfigController;
  let cometExtension: CometExtension;
  let baseToken: FaucetToken | NonStandardFaucetFeeToken;
  let collateral: FaucetToken | NonStandardFaucetFeeToken;

  let alice: SignerWithAddress;
  let bob: SignerWithAddress;

  const BASE_MIN_FOR_REWARDS = exp(1000, 6); // 1000 USDC
  const BASE_TRACKING_SUPPLY_SPEED = 10_000;
  const BASE_TRACKING_BORROW_SPEED = 10_000;
  const DAO_TRACKING_INDEX_SCALE = 1;

  before(async () => {
    ({
      comet,
      users: [alice, bob, unusedAccount],
      configController,
      owner,
      baseToken,
      tokens: { COMP: collateral },
    } = await makeProtocol({
      base: "USDC",

      assets: {
        USDC: { decimals: 6, initialPrice: 1 },
        COMP: {
          decimals: 18,
          initialPrice: 100,
        },
      },
    }));

    cometExtension = (await ethers.getContractAt("CometExtension", comet.address, owner)) as CometExtension;

    await configController
      .connect(owner)
      .setIncentiveConfigOnMarket(
        comet.address,
        DAO_TRACKING_INDEX_SCALE,
        BASE_MIN_FOR_REWARDS,
        BASE_TRACKING_SUPPLY_SPEED,
        BASE_TRACKING_BORROW_SPEED
      );

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("accrue tracking indexes", function () {
    it("total supply base >= baseMinForRewards, then increase trackingSupplyIndex", async function () {
      // Supply base tokens to achive assertion condition
      const { baseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
      await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

      const { totalSupplyBase } = await cometExtension.totalsBasic();
      expect(totalSupplyBase).to.be.greaterThanOrEqual(Number(baseMinForRewards));

      let { trackingSupplyIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue tracking supply index
      const skipTime = 1000;
      await fastForward(skipTime);
      await comet.accrueAccount(alice.address);

      ({ trackingSupplyIndex } = await cometExtension.totalsBasic());

      // calculate expected tracking supply index
      const expectedTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_SUPPLY_SPEED * skipTime, totalSupplyBase, comet);

      expect(trackingSupplyIndex).to.eq(expectedTrackingSupplyIndex);
    });

    it("total borrow base >= baseMinForRewards, then increase trackingBorrowIndex", async function () {
      // Supply base tokens to achieve assertion condition
      const { baseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
      await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

      // Borrow base tokens to achieve assertion condition
      await collateral.allocateTo(bob.address, exp(1000, 18));
      await comet.connect(bob).supply(collateral.address, exp(1000, 18));
      await comet.connect(bob).withdraw(baseToken.address, baseMinForRewards.add(exp(10, 6)));

      const { totalBorrowBase } = await cometExtension.totalsBasic();
      expect(totalBorrowBase).to.be.greaterThanOrEqual(Number(baseMinForRewards));

      let { trackingBorrowIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue tracking borrow index
      const skipTime = 1000;
      await fastForward(skipTime);
      await comet.accrueAccount(alice.address);

      ({ trackingBorrowIndex } = await cometExtension.totalsBasic());

      // calculate expected tracking borrow index
      const expectedTrackingBorrowIndex = await divBaseWei(BASE_TRACKING_BORROW_SPEED * skipTime, totalBorrowBase, comet);

      expect(trackingBorrowIndex).to.eq(expectedTrackingBorrowIndex);
    });

    it("should not increase trackingSupplyIndex if total supply base < baseMinForRewards", async function () {
      // Supply base tokens to achieve assertion condition
      const { baseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, baseMinForRewards.sub(1));
      await comet.connect(alice).supply(baseToken.address, baseMinForRewards.sub(1));

      const { totalSupplyBase } = await cometExtension.totalsBasic();
      expect(totalSupplyBase).to.be.lessThan(Number(baseMinForRewards));

      let { trackingSupplyIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue tracking supply index
      await fastForward(1000);
      await comet.accrueAccount(alice.address);

      ({ trackingSupplyIndex } = await cometExtension.totalsBasic());

      // tracking supply index should not change
      expect(trackingSupplyIndex).to.eq(0);
    });

    it("should not increase trackingBorrowIndex if total borrow base < baseMinForRewards", async function () {
      // Supply base tokens to achieve assertion condition
      const { baseMinForRewards } = await cometExtension.getConfiguration();

      await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
      await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

      // Borrow base tokens to achieve assertion condition
      await collateral.allocateTo(bob.address, exp(1000, 18));
      await comet.connect(bob).supply(collateral.address, exp(1000, 18));
      await comet.connect(bob).withdraw(baseToken.address, baseMinForRewards.sub(1));

      const { totalBorrowBase } = await cometExtension.totalsBasic();
      expect(totalBorrowBase).to.be.lessThan(Number(baseMinForRewards));

      let { trackingBorrowIndex } = await cometExtension.totalsBasic();

      // skip 1000 seconds to accrue tracking borrow index
      await fastForward(1000);
      await comet.accrueAccount(alice.address);

      ({ trackingBorrowIndex } = await cometExtension.totalsBasic());

      // tracking borrow index should not change
      expect(trackingBorrowIndex).to.eq(0);
    });
  });

  describe("update user tracking indexes", function () {
    describe("principal >= 0 (supplying)", function () {
      it("when totalSupplyBase < baseMinForRewards, user's trackingAccrued should not increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { baseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, baseMinForRewards.sub(1));
        await comet.connect(alice).supply(baseToken.address, baseMinForRewards.sub(1));

        const { baseTrackingAccrued } = await comet.userBasic(alice.address);

        expect(baseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        await fastForward(1000);

        const { baseTrackingAccrued: baseTrackingAccruedAfter } = await comet.userBasic(alice.address);

        expect(baseTrackingAccruedAfter).to.eq(0);
      });

      it("when totalSupplyBase >= baseMinForRewards, user's baseTrackingAccrued should increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { baseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        const { baseTrackingAccrued } = await comet.userBasic(alice.address);
        const { totalSupplyBase } = await cometExtension.totalsBasic();

        expect(baseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(alice.address);

        const { baseTrackingAccrued: baseTrackingAccruedAfter, principal } = await comet.userBasic(alice.address);

        const expectedBaseTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_SUPPLY_SPEED * skipTime, totalSupplyBase, comet);
        const delta = expectedBaseTrackingSupplyIndex;
        const baseScale = await comet.baseScale();
        const accrualDescaleFactor = baseScale.div(exp(1, 6));
        const expectedBaseTrackingAccrued = principal
          .mul(delta)
          .div(await comet.trackingIndexScale())
          .div(accrualDescaleFactor);

        expect(baseTrackingAccruedAfter).to.eq(expectedBaseTrackingAccrued);
      });

      it("users baseTrackingIndex becomes current baseTrackingSupplyIndex", async () => {
        // Supply base tokens to achieve assertion condition
        const { baseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        const { baseTrackingAccrued } = await comet.userBasic(alice.address);
        const { totalSupplyBase } = await cometExtension.totalsBasic();

        expect(baseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(alice.address);

        const { baseTrackingIndex } = await comet.userBasic(alice.address);

        const expectedBaseTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_SUPPLY_SPEED * skipTime, totalSupplyBase, comet);

        expect(baseTrackingIndex).to.eq(expectedBaseTrackingSupplyIndex);
      });
    });

    describe("principal < 0 (borrowing)", function () {
      it("when rewards disabled baseTrackingAccrued should not increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { baseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        // Borrow base tokens to achieve assertion condition
        await collateral.allocateTo(bob.address, exp(1000, 18));
        await comet.connect(bob).supply(collateral.address, exp(1000, 18));
        await comet.connect(bob).withdraw(baseToken.address, baseMinForRewards.sub(1));

        const { baseTrackingAccrued } = await comet.userBasic(alice.address);

        expect(baseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        await fastForward(1000);

        const { baseTrackingAccrued: baseTrackingAccruedAfter } = await comet.userBasic(alice.address);

        expect(baseTrackingAccruedAfter).to.eq(0);
      });

      it("when rewards enabled baseTrackingAccrued should increased", async () => {
        // Supply base tokens to achieve assertion condition
        const { baseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        // Borrow base tokens to achieve assertion condition
        await collateral.allocateTo(bob.address, exp(1000, 18));
        await comet.connect(bob).supply(collateral.address, exp(1000, 18));
        await comet.connect(bob).withdraw(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        const { baseTrackingAccrued } = await comet.userBasic(bob.address);
        const { totalBorrowBase } = await cometExtension.totalsBasic();

        expect(baseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(bob.address);

        const { baseTrackingAccrued: baseTrackingAccruedAfter, principal } = await comet.userBasic(bob.address);

        const expectedBaseTrackingSupplyIndex = await divBaseWei(BASE_TRACKING_BORROW_SPEED * skipTime, totalBorrowBase, comet);
        const delta = expectedBaseTrackingSupplyIndex;
        const baseScale = await comet.baseScale();
        const accrualDescaleFactor = baseScale.div(exp(1, 6));
        const expectedBaseTrackingAccrued = -principal
          .mul(delta)
          .div(await comet.trackingIndexScale())
          .div(accrualDescaleFactor);

        expect(baseTrackingAccruedAfter).to.eq(expectedBaseTrackingAccrued);
      });

      it("users baseTrackingIndex becomes current baseTrackingBorrowIndex", async () => {
        // Supply base tokens to achieve assertion condition
        const { baseMinForRewards } = await cometExtension.getConfiguration();

        await baseToken.allocateTo(alice.address, baseMinForRewards.add(exp(10, 6)));
        await comet.connect(alice).supply(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        // Borrow base tokens to achieve assertion condition
        await collateral.allocateTo(bob.address, exp(1000, 18));
        await comet.connect(bob).supply(collateral.address, exp(1000, 18));
        await comet.connect(bob).withdraw(baseToken.address, baseMinForRewards.add(exp(10, 6)));

        const { baseTrackingAccrued } = await comet.userBasic(bob.address);
        const { totalBorrowBase } = await cometExtension.totalsBasic();

        expect(baseTrackingAccrued).to.eq(0);

        // Skip 1000 seconds
        const skipTime = 1000;
        await fastForward(skipTime);
        await comet.accrueAccount(bob.address);

        const { baseTrackingIndex } = await comet.userBasic(bob.address);

        const expectedBaseTrackingBorrowIndex = await divBaseWei(BASE_TRACKING_BORROW_SPEED * skipTime, totalBorrowBase, comet);

        expect(baseTrackingIndex).to.eq(expectedBaseTrackingBorrowIndex);
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
