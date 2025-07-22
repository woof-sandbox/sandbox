import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometHarness, ConfigController } from "../build/types";
import {
  expect,
  exp,
  SnapshotRestorer,
  fastForward,
  makeProtocol,
  setTotalsBasic,
  takeSnapshot,
  // divBaseWei,
} from "./helper/helpers";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("24. total tracking index bounds", function () {
  let snapshot: SnapshotRestorer;

  let cometScale6: CometHarness;
  let cometScale18: CometHarness;
  let configControllerScale6: ConfigController;
  let configControllerScale18: ConfigController;
  let ownerScale6: SignerWithAddress;
  let ownerScale18: SignerWithAddress;

  // Config for 6 scale
  const paramsScale6 = {
    trackingIndexScale: exp(1, 15),
    baseTrackingSupplySpeed: exp(0.001, 15),
    baseTrackingBorrowSpeed: exp(0.001, 15),
    baseMinForRewards: exp(10_000, 6),
    minSupplyForReward: 1,
    minBorrowForReward: 1,
  };

  const paramsScale18 = {
    base: "WETH",
    trackingIndexScale: exp(1, 15),
    baseTrackingSupplySpeed: exp(0.001, 15), // 86.4 units/day
    baseTrackingBorrowSpeed: exp(0.001, 15),
    baseMinForRewards: exp(100, 18),
    minSupplyForReward: 1,
    minBorrowForReward: 1,
  };

  before(async () => {
    ({
      comet: cometScale6,
      configController: configControllerScale6,
      owner: ownerScale6,
    } = await makeProtocol({
      base: "USDC",
    }));

    ({
      comet: cometScale18,
      configController: configControllerScale18,
      owner: ownerScale18,
    } = await makeProtocol({
      base: "WETH",
    }));

    // Set config for rewards accrual
    await configControllerScale6
      .connect(ownerScale6)
      .setIncentiveConfigOnMarket(
        cometScale6.address,
        paramsScale6.trackingIndexScale,
        paramsScale6.baseMinForRewards,
        paramsScale6.baseTrackingSupplySpeed,
        paramsScale6.baseTrackingBorrowSpeed,
        paramsScale6.minSupplyForReward,
        paramsScale6.minBorrowForReward
      );

    await configControllerScale18
      .connect(ownerScale18)
      .setIncentiveConfigOnMarket(
        cometScale18.address,
        paramsScale18.trackingIndexScale,
        paramsScale18.baseMinForRewards,
        paramsScale18.baseTrackingSupplySpeed,
        paramsScale18.baseTrackingBorrowSpeed,
        paramsScale18.minSupplyForReward,
        paramsScale18.minBorrowForReward
      );

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("base scale of 6", function () {
    it("should not overflow upper bound hit on tracking supply index after 10 years", async () => {
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

    it("should not overflow upper bound hit on tracking borrow index after 10 years", async () => {
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

    it("lower bound hit on tracking supply index", async () => {
      const t0 = await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(exp(0.001, 15)).mul(await cometScale6.baseScale()), // 1e15 base units
      });

      await cometScale6.accrue();
      const t1 = await cometScale6.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.trackingSupplyIndex).to.not.be.equal(t0.trackingSupplyIndex);

      const t2 = await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(exp(0.001, 15))
          .mul(await cometScale6.baseScale())
          .mul(3), // 3e15 base units
      });

      await cometScale6.accrue();
      const t3 = await cometScale6.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.trackingSupplyIndex).to.be.equal(t2.trackingSupplyIndex);
    });

    it("lower bound hit on tracking borrow index", async () => {
      const t0 = await setTotalsBasic(cometScale6, {
        totalBorrowBase: BigNumber.from(exp(0.001, 15)).mul(await cometScale6.baseScale()), // 1e15 base units
      });

      await cometScale6.accrue();
      const t1 = await cometScale6.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.trackingBorrowIndex).to.not.be.equal(t0.trackingBorrowIndex);

      const t2 = await setTotalsBasic(cometScale6, {
        totalBorrowBase: BigNumber.from(exp(0.001, 15))
          .mul(await cometScale6.baseScale())
          .mul(3), // 3e15 base units
      });

      await cometScale6.accrue();
      const t3 = await cometScale6.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.trackingBorrowIndex).to.be.equal(t2.trackingBorrowIndex);
    });

    it("should make overflow if no accrue made for long inactivity (supply))", async () => {
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

    it("should make overflow if no accrue made for long inactivity (borrow))", async () => {
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
    it("should not overflow upper bound hit on tracking supply index after 10 years", async () => {
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

    it("should not overflow upper bound hit on tracking borrow index after 10 years", async () => {
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

    it("lower bound hit on tracking supply index", async () => {
      const t0 = await setTotalsBasic(cometScale18, {
        totalSupplyBase: BigNumber.from(exp(1, 12)).mul(await cometScale18.baseScale()), // 1e12 base units
      });

      await cometScale18.accrue();
      const t1 = await cometScale18.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.trackingSupplyIndex).to.not.be.equal(t0.trackingSupplyIndex);

      const t2 = await setTotalsBasic(cometScale18, {
        totalSupplyBase: BigNumber.from(exp(1, 13)).mul(await cometScale18.baseScale()), // 1e13 base units
      });

      await cometScale18.accrue();
      const t3 = await cometScale18.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.trackingSupplyIndex).to.be.equal(t2.trackingSupplyIndex);
    });

    it("lower bound hit on tracking borrow index", async () => {
      const t0 = await setTotalsBasic(cometScale18, {
        totalBorrowBase: BigNumber.from(exp(1, 12)).mul(await cometScale18.baseScale()), // 1e12 base units
      });

      await cometScale18.accrue();
      const t1 = await cometScale18.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.trackingBorrowIndex).to.not.be.equal(t0.trackingBorrowIndex);

      const t2 = await setTotalsBasic(cometScale18, {
        totalBorrowBase: BigNumber.from(exp(1, 13)).mul(await cometScale18.baseScale()), // 1e13 base units
      });

      await cometScale18.accrue();
      const t3 = await cometScale18.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.trackingBorrowIndex).to.be.equal(t2.trackingBorrowIndex);
    });

    it("should make overflow if no accrue made for long inactivity (supply))", async () => {
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

    it("should make overflow if no accrue made for long inactivity (borrow))", async () => {
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
