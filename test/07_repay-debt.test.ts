// import { ethers, expect } from "./helper/helpers";

describe.skip("7. repay debt", function () {
  // placeholder for supply tests extension
  it("supplies max base borrow balance (including accrued) from sender if the asset is base", async () => {
    /*
    // Make borrow from Alice
    await USDC.allocateTo(bob.address, 200e6);
    await comet.connect(bob).supply(USDC.address, exp(100, 6));

    await COMP.allocateTo(alice.address, exp(100, 18));
    await comet.connect(alice).supply(COMP.address, exp(100, 18));
    await comet.connect(alice).withdraw(USDC.address, exp(50, 6));

    const baseAsB = USDC.connect(bob);
    const cometAsB = comet.connect(bob);

    const cometExtention = (await ethers.getContractAt("CometExtension", comet.address)) as CometExtension;
    await cometExtention.connect(alice).approveAll(bob.address, true);

    // Fast forward to accrue some interest
    await fastForward(86400);
    await ethers.provider.send("evm_mine", []);

    const a0 = await portfolio(protocol, alice.address);
    const b0 = await portfolio(protocol, bob.address);
    await wait(baseAsB.approve(comet.address, 100e6));
    const aliceAccruedBorrowBalance = (await comet.callStatic.borrowBalanceOf(alice.address)).toBigInt();
    const s0 = await wait(cometAsB.repayAllFrom(bob.address, alice.address));
    const a1 = await portfolio(protocol, alice.address);
    const b1 = await portfolio(protocol, bob.address);

    expect(s0.receipt["events"].length).to.be.equal(2);
    expect(event(s0, 0)).to.be.deep.equal({
      Transfer: {
        from: bob.address,
        to: comet.address,
        amount: aliceAccruedBorrowBalance,
      },
    });
    expect(event(s0, 1)).to.be.deep.equal({
      Supply: {
        from: bob.address,
        dst: alice.address,
        amount: aliceAccruedBorrowBalance,
      },
    });

    expect(-aliceAccruedBorrowBalance).to.not.equal(exp(-50, 6));
    expect(a0.internal).to.be.deep.equal({ USDC: -aliceAccruedBorrowBalance, COMP: exp(100, 18), WETH: 0n, WBTC: 0n });
    expect(a0.external).to.be.deep.equal({ USDC: exp(50, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.internal).to.be.deep.equal({ USDC: 100007122n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.external).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.internal).to.be.deep.equal({ USDC: 0n, COMP: exp(100, 18), WETH: 0n, WBTC: 0n });
    expect(a1.external).to.be.deep.equal({ USDC: exp(50, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.internal).to.be.deep.equal({ USDC: 100007122n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.external).to.be.deep.equal({
      USDC: exp(100, 6) - aliceAccruedBorrowBalance,
      COMP: 0n,
      WETH: 0n,
      WBTC: 0n,
    });
    expect(Number(s0.receipt.gasUsed)).to.be.lessThan(120000);
    */
  });

  it("supply max base should revert if user has no borrow position", async () => {
    /*
    await USDC.allocateTo(bob.address, 100e6);
    const baseAsB = USDC.connect(bob);
    const cometAsB = comet.connect(bob);

    const a0 = await portfolio(protocol, alice.address);
    const b0 = await portfolio(protocol, bob.address);
    await wait(baseAsB.approve(comet.address, 100e6));
    await expect(cometAsB.repayAllFrom(bob.address, alice.address)).to.be.revertedWithCustomError(comet, "ZeroAmount");
    const a1 = await portfolio(protocol, alice.address);
    const b1 = await portfolio(protocol, bob.address);

    expect(a0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.external).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.external).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    */
  });
});
