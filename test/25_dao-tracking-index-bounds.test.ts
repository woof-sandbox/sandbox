import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometHarness } from "../build/types";
import { expect, exp, SnapshotRestorer, fastForward, makeProtocol, setTotalsBasic, takeSnapshot } from "./helper/helpers";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("25. dao total tracking index bounds", function () {
  let snapshot: SnapshotRestorer;

  let cometScale6: CometHarness;
  let cometScale18: CometHarness;
  let daoScale6: SignerWithAddress;
  let daoScale18: SignerWithAddress;

  // Config for 6 scale
  const paramsScale6 = {
    trackingIndexScale: exp(1, 15),
    baseTrackingSupplySpeed: exp(0.001, 15),
    baseTrackingBorrowSpeed: exp(0.001, 15),
    baseMinForRewards: exp(10_000, 6),
  };

  const paramsScale18 = {
    base: "WETH",
    trackingIndexScale: exp(1, 15),
    baseTrackingSupplySpeed: exp(0.001, 15), // 86.4 units/day
    baseTrackingBorrowSpeed: exp(0.001, 15),
    baseMinForRewards: exp(100, 18),
  };

  before(async () => {
    ({ comet: cometScale6, dao: daoScale6 } = await makeProtocol({
      base: "USDC",
    }));

    ({ comet: cometScale18, dao: daoScale18 } = await makeProtocol({
      base: "WETH",
    }));

    // Set config for rewards accrual
    await cometScale6
      .connect(daoScale6)
      .setDaoIncentiveConfig(
        paramsScale6.trackingIndexScale,
        paramsScale6.baseMinForRewards,
        paramsScale6.baseTrackingSupplySpeed,
        paramsScale6.baseTrackingBorrowSpeed
      );

    await cometScale18
      .connect(daoScale18)
      .setDaoIncentiveConfig(
        paramsScale18.trackingIndexScale,
        paramsScale18.baseMinForRewards,
        paramsScale18.baseTrackingSupplySpeed,
        paramsScale18.baseTrackingBorrowSpeed
      );

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("base scale of 6", function () {
    it("should not overflow upper bound hit on dao tracking supply index after 10 years", async () => {
      // make a huge supply amount
      await setTotalsBasic(cometScale6, {
        totalSupplyBase: exp(10_000_000, 6), // 10 million USDC base units
      });

      // in order to not overflow `baseTrackingSupplySpeed * timeElapsed` as baseTrackingSupplySpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      for (let i = 0; i < 20; i++) {
        await fastForward(overflowSeconds);
        await cometScale6.accrue();
      }

      await fastForward(overflowSeconds);

      // Second accrue should overflow
      await expect(cometScale6.accrue()).to.not.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("should not overflow upper bound hit on dao tracking borrow index after 10 years", async () => {
      // make a huge borrow amount
      await setTotalsBasic(cometScale6, {
        totalBorrowBase: exp(10_000_000, 6), // 10 million USDC base units
      });

      // in order to not overflow `baseTrackingBorrowSpeed * timeElapsed` as baseTrackingBorrowSpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      for (let i = 0; i < 20; i++) {
        await fastForward(overflowSeconds);
        await cometScale6.accrue();
      }

      await fastForward(overflowSeconds);

      // Second accrue should overflow
      await expect(cometScale6.accrue()).to.not.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("lower bound hit on dao tracking supply index", async () => {
      const t0 = await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(exp(0.001, 15)).mul(await cometScale6.baseScale()), // 1e15 base units
      });

      await cometScale6.accrue();
      const t1 = await cometScale6.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.daoTrackingSupplyIndex).to.not.be.equal(t0.daoTrackingSupplyIndex);

      const t2 = await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(exp(0.001, 15))
          .mul(await cometScale6.baseScale())
          .mul(3), // 3e15 base units
      });

      await cometScale6.accrue();
      const t3 = await cometScale6.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.daoTrackingSupplyIndex).to.be.equal(t2.daoTrackingSupplyIndex);
    });

    it("lower bound hit on dao tracking borrow index", async () => {
      const t0 = await setTotalsBasic(cometScale6, {
        totalBorrowBase: BigNumber.from(exp(0.001, 15)).mul(await cometScale6.baseScale()), // 1e15 base units
      });

      await cometScale6.accrue();
      const t1 = await cometScale6.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.daoTrackingBorrowIndex).to.not.be.equal(t0.daoTrackingBorrowIndex);

      const t2 = await setTotalsBasic(cometScale6, {
        totalBorrowBase: BigNumber.from(exp(0.001, 15))
          .mul(await cometScale6.baseScale())
          .mul(3), // 3e15 base units
      });

      await cometScale6.accrue();
      const t3 = await cometScale6.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.daoTrackingBorrowIndex).to.be.equal(t2.daoTrackingBorrowIndex);
    });

    it("should make overflow if no accrue made for long inactivity (dao supply))", async () => {
      // make a huge supply amount
      await setTotalsBasic(cometScale6, {
        totalSupplyBase: exp(10_000_000, 6), // 10 million USDC base units
      });

      // in order to not overflow `baseTrackingSupplySpeed * timeElapsed` as baseTrackingSupplySpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      await fastForward(overflowSeconds);

      // First accrue is successful without overflow
      await cometScale6.accrue();

      // in order to overflow `baseTrackingSupplySpeed * timeElapsed` as baseTrackingSupplySpeed is in uint64 type
      // we assert that 0.7 years need to be passed
      await fastForward(overflowSeconds + time.duration.years(0.1));

      // Second accrue should overflow
      await expect(cometScale6.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("should make overflow if no accrue made for long inactivity (dao borrow))", async () => {
      // make a huge borrow amount
      await setTotalsBasic(cometScale6, {
        totalBorrowBase: exp(10_000_000, 6), // 10 million USDC base units
      });

      // in order to not overflow `baseTrackingBorrowSpeed * timeElapsed` as baseTrackingBorrowSpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      await fastForward(overflowSeconds);

      // First accrue is successful without overflow
      await cometScale6.accrue();

      // in order to overflow `baseTrackingBorrowSpeed * timeElapsed` as baseTrackingBorrowSpeed is in uint64 type
      // we assert that 0.7 years need to be passed
      await fastForward(overflowSeconds + time.duration.years(0.1));

      // Second accrue should overflow
      await expect(cometScale6.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });
  });

  describe("base scale of 18", function () {
    it("should not overflow upper bound hit on dao tracking supply index after 10 years", async () => {
      await setTotalsBasic(cometScale18, {
        totalSupplyBase: exp(15_000, 18), // 15_000 WETH base units
      });

      // in order to not overflow `baseTrackingSupplySpeed * timeElapsed` as baseTrackingSupplySpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      for (let i = 0; i < 20; i++) {
        await fastForward(overflowSeconds);
        await cometScale18.accrue();
      }

      await fastForward(overflowSeconds);

      // Second accrue should overflow
      await expect(cometScale18.accrue()).to.not.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("should not overflow upper bound hit on dao tracking borrow index after 10 years", async () => {
      // make a huge borrow amount
      await setTotalsBasic(cometScale18, {
        totalBorrowBase: exp(15_000, 18), // 15_000 WETH base units
      });

      // in order to not overflow `baseTrackingBorrowSpeed * timeElapsed` as baseTrackingBorrowSpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      for (let i = 0; i < 20; i++) {
        await fastForward(overflowSeconds);
        await cometScale18.accrue();
      }

      await fastForward(overflowSeconds);

      // Second accrue should overflow
      await expect(cometScale18.accrue()).to.not.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("lower bound hit on dao tracking supply index", async () => {
      const t0 = await setTotalsBasic(cometScale18, {
        totalSupplyBase: BigNumber.from(exp(1, 12)).mul(await cometScale18.baseScale()), // 1e12 base units
      });

      await cometScale18.accrue();
      const t1 = await cometScale18.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.daoTrackingSupplyIndex).to.not.be.equal(t0.daoTrackingSupplyIndex);

      const t2 = await setTotalsBasic(cometScale18, {
        totalSupplyBase: BigNumber.from(exp(1, 13)).mul(await cometScale18.baseScale()), // 1e13 base units
      });

      await cometScale18.accrue();
      const t3 = await cometScale18.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.daoTrackingSupplyIndex).to.be.equal(t2.daoTrackingSupplyIndex);
    });

    it("lower bound hit on dao tracking borrow index", async () => {
      const t0 = await setTotalsBasic(cometScale18, {
        totalBorrowBase: BigNumber.from(exp(1, 12)).mul(await cometScale18.baseScale()), // 1e12 base units
      });

      await cometScale18.accrue();
      const t1 = await cometScale18.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.daoTrackingBorrowIndex).to.not.be.equal(t0.daoTrackingBorrowIndex);

      const t2 = await setTotalsBasic(cometScale18, {
        totalBorrowBase: BigNumber.from(exp(1, 13)).mul(await cometScale18.baseScale()), // 1e13 base units
      });

      await cometScale18.accrue();
      const t3 = await cometScale18.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.daoTrackingBorrowIndex).to.be.equal(t2.daoTrackingBorrowIndex);
    });

    it("should make overflow if no accrue made for long inactivity (dao supply))", async () => {
      // make a huge supply amount
      await setTotalsBasic(cometScale18, {
        totalSupplyBase: exp(15_000, 18), // 15_000 WETH base units
      });

      // in order to not overflow `baseTrackingSupplySpeed * timeElapsed` as baseTrackingSupplySpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      await fastForward(overflowSeconds);

      // First accrue is successful without overflow
      await cometScale18.accrue();

      // in order to overflow `baseTrackingSupplySpeed * timeElapsed` as baseTrackingSupplySpeed is in uint64 type
      // we assert that 0.7 years need to be passed
      await fastForward(overflowSeconds + time.duration.years(0.1));

      // Second accrue should overflow
      await expect(cometScale18.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("should make overflow if no accrue made for long inactivity (dao borrow))", async () => {
      // make a huge borrow amount
      await setTotalsBasic(cometScale18, {
        totalBorrowBase: exp(15_000, 18), // 15_000 WETH base units
      });

      // in order to not overflow `baseTrackingBorrowSpeed * timeElapsed` as baseTrackingBorrowSpeed is in uint64 type, thus we'll skip 6 months each skip
      const overflowSeconds = time.duration.years(0.5);

      await fastForward(overflowSeconds);

      // First accrue is successful without overflow
      await cometScale18.accrue();

      // in order to overflow `baseTrackingBorrowSpeed * timeElapsed` as baseTrackingBorrowSpeed is in uint64 type
      // we assert that 0.7 years need to be passed
      await fastForward(overflowSeconds + time.duration.years(0.1));

      // Second accrue should overflow
      await expect(cometScale18.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });
  });
});
