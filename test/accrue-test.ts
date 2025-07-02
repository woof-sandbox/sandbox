import {
  ethers,
  expect,
  exp,
  fastForward,
  getBlock,
  makeProtocol,
  wait,
  setTotalsBasic,
} from "./helper/helpers";

function projectBaseIndex(index, rate, time, factorScale = exp(1, 18)) {
  return index.add(index.mul(rate.mul(time)).div(factorScale));
}

function projectTrackingIndex(index, speed, time, base, baseScale = exp(1, 6)) {
  return index.add(speed.mul(time).mul(baseScale).div(base));
}

describe.skip('accrue', function () {
  it('fails if baseMinForRewards = 0', async () => {
    await expect(
      makeProtocol({
        baseMinForRewards: 0,
      })
    ).to.be.revertedWith("custom error 'BadMinimum()'");
  });

  it("accrue initially succeeds and has the right parameters", async () => {
    await ethers.provider.send("hardhat_reset", []); // ensure clean start...

    const start = (await getBlock()).timestamp + 100;
    const params = {
      baseMinForRewards: 12331,
      baseTrackingSupplySpeed: 668,
      baseTrackingBorrowSpeed: 777,
      start,
    };
    const { comet, dao} = await makeProtocol(params);

    await wait(
      comet
        .connect(dao)
        .setDaoBaseSpeeds(
          params.baseTrackingSupplySpeed,
          params.baseTrackingBorrowSpeed,
        ),
    );

    await wait(comet.setNow(start));
    await setTotalsBasic(comet, { lastAccrualTime: start });
    const t0 = await comet.totalsBasic();

    expect(t0.trackingSupplyIndex).to.eq(0);
    expect(t0.trackingBorrowIndex).to.eq(0);
    expect(t0.baseSupplyIndex).to.eq(exp(1, 15));
    expect(t0.baseBorrowIndex).to.eq(exp(1, 15));
    expect(t0.totalSupplyBase).to.eq(0);
    expect(t0.totalBorrowBase).to.eq(0);
    expect(t0.lastAccrualTime).to.eq(start);

    await wait(comet.accrue());

    expect(await comet.baseMinForRewards()).to.eq(params.baseMinForRewards);
    expect(await comet.baseTrackingSupplySpeed()).to.eq(
      params.baseTrackingSupplySpeed,
    );
    expect(await comet.baseTrackingBorrowSpeed()).to.eq(
      params.baseTrackingBorrowSpeed,
    );
    expect(await comet.daoBaseTrackingSupplySpeed()).to.eq(
      params.baseTrackingSupplySpeed,
    );
    expect(await comet.daoBaseTrackingBorrowSpeed()).to.eq(
      params.baseTrackingBorrowSpeed,
    );
  });

  it("accrues correctly with no time elapsed", async () => {
    const { comet, dao } = await makeProtocol();
    await wait(comet.connect(dao).setDaoBaseSpeeds(1, 1));

    const now = Math.floor(Date.now() / 1000);
    await wait(comet.setNow(now));

    const totals = {
      trackingSupplyIndex: 0,
      trackingBorrowIndex: 0,
      daoTrackingSupplyIndex: 0,
      daoTrackingBorrowIndex: 0,
      baseSupplyIndex: 2e15,
      baseBorrowIndex: 3e15,
      totalSupplyBase: 1000n,
      totalBorrowBase: 1000n,
      lastAccrualTime: 0,
      pauseFlags: 0,
    };
    await wait(comet.setTotalsBasic(totals));

    const t0 = await comet.totalsBasic();
    await wait(comet.accrue());
    const t1 = await comet.totalsBasic();
    await wait(comet.accrue());
    const t2 = await comet.totalsBasic();

    expect(t0.lastAccrualTime).to.eq(0);
    expect(t1.lastAccrualTime).to.eq(now);
    expect(t2.lastAccrualTime).to.eq(now);
    expect(t2.baseSupplyIndex).to.eq(t1.baseSupplyIndex);
    expect(t2.baseBorrowIndex).to.eq(t1.baseBorrowIndex);
    expect(t2.trackingSupplyIndex).to.eq(t1.trackingSupplyIndex);
    expect(t2.trackingBorrowIndex).to.eq(t1.trackingBorrowIndex);
    expect(t2.daoTrackingSupplyIndex).to.eq(t1.daoTrackingSupplyIndex);
    expect(t2.daoTrackingBorrowIndex).to.eq(t1.daoTrackingBorrowIndex);
  });

  it("accrues correctly with time elapsed and less than min rewards", async () => {
    await ethers.provider.send("hardhat_reset", []); // ensure clean start...

    const start = (await getBlock()).timestamp + 100;
    const params = {
      baseMinForRewards: 12000n,
      trackingIndexScale: exp(1, 15),
      start,
    };
    const { comet, dao } = await makeProtocol(params);
    await wait(
      comet.connect(dao).setDaoBaseSpeeds(params.trackingIndexScale, params.trackingIndexScale),
    );

    await setTotalsBasic(comet, { lastAccrualTime: start });
    const t1 = await setTotalsBasic(comet, {
      totalSupplyBase: 11000n,
      totalBorrowBase: 11000n,
    });

    const utilization = await comet.getUtilization();
    const supplyRate = await comet.getSupplyRate(utilization);
    const borrowRate = await comet.getBorrowRate(utilization);

    await ethers.provider.send("evm_setAutomine", [false]);
    await comet.accrue();

    await ethers.provider.send("evm_mine", [start + 1000]);
    await ethers.provider.send("evm_setAutomine", [true]);

    const t2 = await comet.totalsBasic();
    const elapsed = t2.lastAccrualTime - t1.lastAccrualTime;

    expect(elapsed).to.eq(1000);
    expect(t2.baseSupplyIndex).to.eq(projectBaseIndex(t1.baseSupplyIndex, supplyRate, elapsed));
    expect(t2.baseBorrowIndex).to.eq(projectBaseIndex(t1.baseBorrowIndex, borrowRate, elapsed));
    expect(t2.trackingSupplyIndex).to.eq(t1.trackingSupplyIndex);
    expect(t2.trackingBorrowIndex).to.eq(t1.trackingBorrowIndex);
    expect(t2.daoTrackingSupplyIndex).to.eq(t1.daoTrackingSupplyIndex);
    expect(t2.daoTrackingBorrowIndex).to.eq(t1.daoTrackingBorrowIndex);
  });

  it("accrues correctly with time elapsed and more than min rewards", async () => {
    await ethers.provider.send("hardhat_reset", []);

    const start = (await getBlock()).timestamp + 100;
    const params = {
      baseMinForRewards: exp(12000, 6),
      trackingIndexScale: exp(1, 15),
      start,
    };
    const { comet, dao } = await makeProtocol(params);
    const { comet } = await makeProtocol(params);
    await setTotalsBasic(comet, { lastAccrualTime: start }); 

    await wait(
      comet.connect(dao).setDaoBaseSpeeds(params.trackingIndexScale, params.trackingIndexScale),
    );

    await setTotalsBasic(comet, { lastAccrualTime: start });
    const t0 = await comet.totalsBasic();
    const t1 = await setTotalsBasic(comet, {
      totalSupplyBase: exp(14000, 6),
      totalBorrowBase: exp(13000, 6),
    });

    const utilization = await comet.getUtilization();
    const supplyRate = await comet.getSupplyRate(utilization);
    const borrowRate = await comet.getBorrowRate(utilization);

    await ethers.provider.send("evm_setAutomine", [false]);
    await comet.accrue();

    await ethers.provider.send("evm_mine", [start + 1000]);
    await ethers.provider.send("evm_setAutomine", [true]);

    const t2 = await comet.totalsBasic();
    const elapsed = t2.lastAccrualTime - t0.lastAccrualTime;

    const supplySpeed = await comet.baseTrackingSupplySpeed();
    const borrowSpeed = await comet.baseTrackingBorrowSpeed();
    const daoSupplySpeed = await comet.daoBaseTrackingSupplySpeed();
    const daoBorrowSpeed = await comet.daoBaseTrackingBorrowSpeed();

    expect(elapsed).to.eq(1000);
    expect(t2.baseSupplyIndex).to.eq(projectBaseIndex(t1.baseSupplyIndex, supplyRate, elapsed));
    expect(t2.baseBorrowIndex).to.eq(projectBaseIndex(t1.baseBorrowIndex, borrowRate, elapsed));
    expect(t2.trackingSupplyIndex).to.eq(
      projectTrackingIndex(t1.trackingSupplyIndex, supplySpeed, elapsed, t1.totalSupplyBase),
    );
    expect(t2.trackingBorrowIndex).to.eq(
      projectTrackingIndex(t1.trackingBorrowIndex, borrowSpeed, elapsed, t1.totalBorrowBase),
    );
    expect(t2.daoTrackingSupplyIndex).to.eq(
      projectTrackingIndex(t1.daoTrackingSupplyIndex, daoSupplySpeed, elapsed, t1.totalSupplyBase),
    );
    expect(t2.daoTrackingBorrowIndex).to.eq(
      projectTrackingIndex(t1.daoTrackingBorrowIndex, daoBorrowSpeed, elapsed, t1.totalBorrowBase),
    );
  });

  it("overflows if baseMinRewards is set too low and accrues no interest", async () => {
    const { comet, dao } = await makeProtocol({

    const params = {
      baseMinForRewards: 12000,
      trackingIndexScale: exp(1, 15),
    });

    await wait(comet.connect(dao).setDaoBaseSpeeds(1, 1));

    const t0 = await comet.totalsBasic();
    const t1 = Object.assign({}, t0, {
      totalSupplyBase: 14000,
      totalBorrowBase: 13000,
    });
    await fastForward(998);
    await wait(comet.setTotalsBasic(t1));
    await fastForward(2);
    await expect(wait(comet.accrue())).to.be.revertedWith("custom error 'InvalidUInt64()'");
  });

  it("reverts on overflows", async () => {
    const { comet, dao } = await makeProtocol();

    await wait(comet.connect(dao).setDaoBaseSpeeds(1, 1));
    await expect(wait(comet.accrue())).to.be.revertedWith(
      "custom error 'InvalidUInt64()'"
    );
    const t2 = await comet.totalsBasic();

    const utilization = await comet.getUtilization();
    const supplyRate = await comet.getSupplyRate(utilization);
    const borrowRate = await comet.getBorrowRate(utilization);
    const timeElapsed = t2.lastAccrualTime - t0.lastAccrualTime;
    expect(timeElapsed).to.be.equal(0);

    expect(t2.baseSupplyIndex).to.be.equal(
      projectBaseIndex(t1.baseSupplyIndex, supplyRate, timeElapsed)
    );
    expect(t2.baseBorrowIndex).to.be.equal(
      projectBaseIndex(t1.baseBorrowIndex, borrowRate, timeElapsed)
    );
    expect(t2.trackingSupplyIndex).to.be.equal(t1.trackingSupplyIndex);
    expect(t2.trackingBorrowIndex).to.be.equal(t1.trackingBorrowIndex);
  });

  it("reverts on overflows", async () => {
    const { comet } = await makeProtocol();

    const t0 = await comet.totalsBasic();
    const t1 = Object.assign({}, t0, {
      baseSupplyIndex: 2n ** 64n - 1n,
      totalSupplyBase: 14000,
      totalBorrowBase: 13000,
    });
    await fastForward(998);
    await wait(comet.setTotalsBasic(t1));
    await fastForward(2);
    await expect(wait(comet.accrue())).to.be.revertedWith(
      "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );

    const t2 = Object.assign({}, t0, {
      baseBorrowIndex: 2n ** 64n - 1n,
    });
    await fastForward(998);
    await wait(comet.setTotalsBasic(t2));
    await fastForward(2);
    await expect(wait(comet.accrue())).to.be.revertedWith(
      "code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)"
    );
  });

  it("supports up to the maximum timestamp then breaks", async () => {
    const { comet, dao } = await makeProtocol();
  
    await wait(comet.connect(dao).setDaoBaseSpeeds(1, 1));

    await fastForward(100);
    await wait(comet.accrue());

    await fastForward(2 ** 40);
    await expect(wait(comet.accrue())).to.be.revertedWith("custom error 'TimestampTooLarge()'");

  });
});

describe.skip('accrueAccount', function () {
  it('has no effect when called on an address with no protocol activity', async () => {
    const { comet, users: [unusedAccount] } = await makeProtocol();

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
