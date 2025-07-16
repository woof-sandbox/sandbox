import { ethers, expect, exp, fastForward, getBlock, makeProtocol } from "./helper/helpers";

describe("23. baseTrackingAccrued", function () {
  it("supply updates baseTrackingAccrued to 6 decimal value", async () => {
    const start = (await getBlock()).timestamp + 100;

    const {
      comet,
      tokens: { USDC },
      users: [alice],
      configController,
      owner,
    } = await makeProtocol({
      base: "USDC",
    });

    // Set config for rewards accrual
    // supplySpeed=1 Comp/s
    await configController.connect(owner).setIncentiveConfigOnMarket(comet.address, 1e15, 1, 1e15, 1e15);

    // allocate and approve transfers
    await USDC.allocateTo(alice.address, 2e6);
    await USDC.connect(alice).approve(comet.address, 2e6);

    await ethers.provider.send("evm_setAutomine", [false]);

    // supply once
    await comet.connect(alice).supply(USDC.address, 1e6);
    const firstSupplyTime = start + 100;
    await ethers.provider.send("evm_mine", [firstSupplyTime]);

    const userBasic1 = await comet.userBasic(alice.address);
    expect(userBasic1.principal).to.be.closeTo(1e6, 1);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);

    // supply again
    await comet.connect(alice).supply(USDC.address, 1e6);
    await ethers.provider.send("evm_mine", [firstSupplyTime + 1]);
    await ethers.provider.send("evm_setAutomine", [true]);

    const userBasic2 = await comet.userBasic(alice.address);
    expect(userBasic2.principal).to.be.closeTo(2e6, 2);

    // 1 second elapsed = 1 unit of rewards accrued (for 1 unit of base)
    expect(userBasic2.baseTrackingAccrued).to.be.closeTo(1_000_000, 1);
  });

  it("updates with precision up to 6 decimal places", async () => {
    const {
      comet,
      tokens: { USDC },
      users: [alice],
      configController,
      owner,
    } = await makeProtocol({
      base: "USDC",
    });

    // Set config for rewards accrual
    await configController.connect(owner).setIncentiveConfigOnMarket(comet.address, 1e15, 1, 1e10, 1e10);

    // allocate and approve transfers
    await USDC.allocateTo(alice.address, 2e6);
    await USDC.connect(alice).approve(comet.address, 2e6);

    // supply once
    await comet.connect(alice).supply(USDC.address, 1e6);

    const userBasic1 = await comet.userBasic(alice.address);
    expect(userBasic1.principal).to.be.closeTo(1_000_000, 1);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);

    // supply again
    await comet.connect(alice).supply(USDC.address, 1e6);

    const userBasic2 = await comet.userBasic(alice.address);
    expect(userBasic2.principal).to.be.closeTo(2_000_000, 2);

    // 1 second elapsed = .000001 unit of rewards accrued (for 1 unit of base)
    // as we have supply amount - 1, we multiply by 10 to get results
    expect(userBasic2.baseTrackingAccrued).to.eq(9);
  });

  it("rounds down to zero for values below 6 decimal places", async () => {
    const {
      comet,
      tokens: { USDC },
      users: [alice],
      configController,
      owner,
    } = await makeProtocol({
      base: "USDC",
    });

    // Set config for rewards accrual
    // supplySpeed=0.0000001 (1e-7) Comp/s
    await configController.connect(owner).setIncentiveConfigOnMarket(comet.address, 1e15, 1, 1e7, 1e7);

    // allocate and approve transfers
    await USDC.allocateTo(alice.address, 2e6);
    await USDC.connect(alice).approve(comet.address, 2e6);

    // supply once
    await comet.connect(alice).supply(USDC.address, 1e6);

    const userBasic1 = await comet.userBasic(alice.address);
    expect(userBasic1.principal).to.be.closeTo(1_000_000, 1);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);

    // supply again
    await comet.connect(alice).supply(USDC.address, 1e6);

    const userBasic2 = await comet.userBasic(alice.address);
    expect(userBasic2.principal).to.be.closeTo(2_000_000, 2);
    expect(userBasic2.baseTrackingAccrued).to.eq(0); // 1 second elapsed = .0000001 unit of rewards accrued; rounds down to 0
  });

  it("accrues at a greater number of decimals, but preserves 6", async () => {
    const {
      comet,
      tokens: { USDC },
      users: [alice],
      configController,
      owner,
    } = await makeProtocol({
      base: "USDC",
    });

    // Set config for rewards accrual
    // supplySpeed=0.0000001 (1e-7) Comp/s
    await configController.connect(owner).setIncentiveConfigOnMarket(comet.address, 1e15, 1, 1e7, 1e7);

    // allocate and approve transfers
    await USDC.allocateTo(alice.address, 2e6);
    await USDC.connect(alice).approve(comet.address, 2e6);

    // supply once
    await comet.connect(alice).supply(USDC.address, 1e6);

    const userBasic1 = await comet.userBasic(alice.address);
    expect(userBasic1.principal).to.be.closeTo(1_000_000, 1);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);

    // allow 200 seconds to pass
    await fastForward(200);

    // supply again
    await comet.connect(alice).supply(USDC.address, 1e6);

    const userBasic2 = await comet.userBasic(alice.address);
    expect(userBasic2.principal).to.be.closeTo(2_000_000, 2);
    expect(userBasic2.baseTrackingAccrued).to.eq(1); // 200 seconds elapsed = .000001 unit of rewards accrued
  });

  it("accrues correctly when base token has more than 6 decimals", async () => {
    const {
      comet,
      tokens: { WETH },
      users: [alice],
      configController,
      owner,
    } = await makeProtocol({
      base: "WETH",
    });

    // Set config for rewards accrual
    // supplySpeed=1 COMP/s
    await configController.connect(owner).setIncentiveConfigOnMarket(comet.address, 1e15, 1, 1e15, 1e15);

    // allocate and approve transfers
    await WETH.allocateTo(alice.address, exp(2, 18));

    // supply once
    await comet.connect(alice).supply(WETH.address, exp(1, 18));

    const userBasic1 = await comet.userBasic(alice.address);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);

    // supply again
    await comet.connect(alice).supply(WETH.address, exp(1, 18));

    const userBasic2 = await comet.userBasic(alice.address);

    // 1 second elapsed = 1 unit of rewards accrued (for 1 unit of base)
    // we add slippage to 1 as supply amount might be supply amount - 1
    expect(userBasic2.baseTrackingAccrued).to.be.closeTo(1_000_000, 1);
  });

  it("increases baseTrackingAccrued on borrow", async () => {
    const start = (await getBlock()).timestamp + 100;

    const {
      comet,
      tokens: { WETH, USDC },
      users: [alice],
      configController,
      owner,
    } = await makeProtocol({
      base: "USDC",
    });

    // Set config for rewards accrual
    // borrowSpeed=1 Comp/s per unit of borrowed base
    await configController.connect(owner).setIncentiveConfigOnMarket(comet.address, 1e15, exp(0.5, 6), 1e15, 1e15);

    // allocate and approve transfers
    await WETH.allocateTo(alice.address, exp(1, 18));
    await WETH.connect(alice).approve(comet.address, exp(1, 18));

    await USDC.allocateTo(comet.address, 2e6); // for two withdrawls of 1e6

    // supply WETH as collateral
    await comet.connect(alice).supply(WETH.address, exp(1, 18));

    const userBasic1 = await comet.userBasic(alice.address);
    expect(userBasic1.principal).to.eq(0);
    expect(userBasic1.baseTrackingAccrued).to.eq(0);

    await ethers.provider.send("evm_setAutomine", [false]);

    // withdraw base token
    await comet.connect(alice).withdraw(USDC.address, 1e6);
    const firstWithdrawTime = start + 100;
    await ethers.provider.send("evm_mine", [firstWithdrawTime]);

    const userBasic2 = await comet.userBasic(alice.address);
    expect(userBasic2.principal).to.eq(-1e6);
    expect(userBasic2.baseTrackingAccrued).to.eq(0);

    // withdraw again
    await comet.connect(alice).withdraw(USDC.address, 1e6);
    await ethers.provider.send("evm_mine", [firstWithdrawTime + 1]);
    await ethers.provider.send("evm_setAutomine", [true]);

    const userBasic3 = await comet.userBasic(alice.address);
    expect(userBasic3.principal).to.eq(-2e6);

    // 1 second elapsed = 1 unit of rewards accrued
    expect(userBasic3.baseTrackingAccrued).to.eq(1e6);
  });
});
