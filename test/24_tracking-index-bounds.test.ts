import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { CometHarness, ConfigController } from "../build/types";
import {
  expect,
  exp,
  SnapshotRestorer,
  fastForward,
  makeProtocol,
  setTotalsBasic,
  toYears,
  takeSnapshot,
  // divBaseWei,
} from "./helper/helpers";
import { BigNumber } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe.skip("24. total tracking index bounds", function () {
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
    baseTrackingSupplySpeed: exp(0.01, 6),
    baseTrackingBorrowSpeed: exp(0.01, 6),
    baseMinForRewards: exp(10_000, 6),
  };

  const paramsScale18 = {
    base: "WETH",
    trackingIndexScale: exp(1, 15),
    baseTrackingSupplySpeed: exp(0.001, 15), // 86.4 units/day
    baseTrackingBorrowSpeed: exp(0.001, 15),
    baseMinForRewards: exp(100, 18),
  };

  // const MAX_UINT64 = 2n ** 64n - 1n;

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
        paramsScale6.baseTrackingBorrowSpeed
      );

    await configControllerScale18
      .connect(ownerScale18)
      .setIncentiveConfigOnMarket(
        cometScale18.address,
        paramsScale18.trackingIndexScale,
        paramsScale18.baseMinForRewards,
        paramsScale18.baseTrackingSupplySpeed,
        paramsScale18.baseTrackingBorrowSpeed
      );

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("base scale of 6", function () {
    it("upper bound hit on tracking supply index", async () => {
      const baseScale = (await cometScale6.baseScale()).toBigInt();
      // Formula: MAX_UINT64 / (baseTrackingSupplySpeed * baseScale / baseMinForRewards)
      const secondsUntilOverflow = Number(
        (2n ** 64n * (paramsScale6.baseMinForRewards / baseScale)) / paramsScale6.baseTrackingSupplySpeed
      );

      // Assert there are at least 5.85 years until tracking index can overflow
      const expectedYearsUntilOverflow = 5.85;
      expect(toYears(secondsUntilOverflow)).to.be.approximately(expectedYearsUntilOverflow, 0.01);

      await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(paramsScale6.baseMinForRewards), // 10k USDC base units
      });

      // First accrue is successful without overflow
      await cometScale6.accrue();

      await fastForward(secondsUntilOverflow);

      // Second accrue should overflow
      await expect(cometScale6.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("upper bound hit on tracking borrow index", async () => {
      // const baseScale = (await cometScale6.baseScale()).toBigInt();
      // // Formula: MAX_UINT64 / (baseTrackingBorrowSpeed * baseScale / baseMinForRewards)
      // const secondsUntilOverflow = Number(await divBaseWei(MAX_UINT64, paramsScale6.baseMinForRewards, cometScale6));

      // // Assert there are at least 5.85 years until tracking index can overflow
      // const expectedYearsUntilOverflow = 5.85;
      // expect(toYears(secondsUntilOverflow)).to.be.approximately(expectedYearsUntilOverflow, 0.01);

      // Time to overflow (seconds) = (2^64 - 1 - currentTrackingIndex) * totalSupplyBase / (baseTrackingSupplySpeed * 10^decimals)
      // const overflowSeconds = Number(
      //   ((2n ** 64n - 1n) * BigInt(paramsScale6.baseMinForRewards.toString())) / BigInt(paramsScale6.baseTrackingBorrowSpeed * 10n ** 6n)
      // );
      const overflowSeconds = time.duration.years(1);

      await setTotalsBasic(cometScale6, {
        totalBorrowBase: BigNumber.from(paramsScale6.baseMinForRewards), // 10k USDC base units
      });

      await fastForward(overflowSeconds);

      // First accrue is successful without overflow
      await cometScale6.accrue();

      await fastForward(overflowSeconds);

      // Second accrue should overflow
      await expect(cometScale6.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("lower bound hit on tracking supply index", async () => {
      const t0 = await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(exp(1, 15)).mul(await cometScale6.baseScale()), // 1e15 base units
      });

      await cometScale6.accrue();
      const t1 = await cometScale6.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.trackingSupplyIndex).to.not.be.equal(t0.trackingSupplyIndex);

      const t2 = await setTotalsBasic(cometScale6, {
        totalSupplyBase: BigNumber.from(exp(1, 15))
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
        totalBorrowBase: BigNumber.from(exp(1, 15)).mul(await cometScale6.baseScale()), // 1e15 base units
      });

      await cometScale6.accrue();
      const t1 = await cometScale6.totalsBasic();

      // Tracking index should properly accrue
      expect(t1.trackingBorrowIndex).to.not.be.equal(t0.trackingBorrowIndex);

      const t2 = await setTotalsBasic(cometScale6, {
        totalBorrowBase: BigNumber.from(exp(1, 15))
          .mul(await cometScale6.baseScale())
          .mul(3), // 3e15 base units
      });

      await cometScale6.accrue();
      const t3 = await cometScale6.totalsBasic();

      // Lower bound has hit and tracking index no longer accrues
      expect(t3.trackingBorrowIndex).to.be.equal(t2.trackingBorrowIndex);
    });
  });

  describe("base scale of 18", function () {
    it("upper bound hit on tracking supply index", async () => {
      const baseScale = (await cometScale18.baseScale()).toBigInt();
      // Formula: MAX_UINT64 / (baseTrackingSupplySpeed * baseScale / baseMinForRewards)
      const secondsUntilOverflow = Number(
        (2n ** 64n * (paramsScale18.baseMinForRewards / baseScale)) / paramsScale18.baseTrackingSupplySpeed
      );

      // Assert there are at least 58.5 years until tracking index can overflow
      const expectedYearsUntilOverflow = 58.5;
      expect(toYears(secondsUntilOverflow)).to.be.approximately(expectedYearsUntilOverflow, 0.01);

      await setTotalsBasic(cometScale18, {
        totalSupplyBase: BigNumber.from(paramsScale18.baseMinForRewards), // 100 WETH base units
      });

      await fastForward(secondsUntilOverflow - 2);

      // First accrue is successful without overflow
      await cometScale18.accrue();

      // Second accrue should overflow
      await expect(cometScale18.accrue()).to.be.revertedWith(
        "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
      );
    });

    it("upper bound hit on tracking borrow index", async () => {
      const baseScale = (await cometScale18.baseScale()).toBigInt();
      // Formula: MAX_UINT64 / (baseTrackingBorrowSpeed * baseScale / baseMinForRewards)
      const secondsUntilOverflow = Number(
        (2n ** 64n * (paramsScale18.baseMinForRewards / baseScale)) / paramsScale18.baseTrackingBorrowSpeed
      );

      // Assert there are at least 58.5 years until tracking index can overflow
      const expectedYearsUntilOverflow = 58.5;
      expect(toYears(secondsUntilOverflow)).to.be.approximately(expectedYearsUntilOverflow, 0.01);

      await setTotalsBasic(cometScale18, {
        totalBorrowBase: BigNumber.from(paramsScale18.baseMinForRewards), // 10k USDC base units
      });

      await fastForward(secondsUntilOverflow - 2);

      // First accrue is successful without overflow
      await cometScale18.accrue();

      // Second accrue should overflow
      await expect(cometScale18.accrue()).to.be.revertedWith(
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
  });
});
