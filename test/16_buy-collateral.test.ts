import {
  EvilToken,
  EvilToken__factory,
  NonStandardFaucetFeeToken__factory,
  FaucetToken,
  NonStandardFaucetFeeToken,
  SandboxComet,
  CometHarness,
} from "../build/types";
import { ethers, event, expect, exp, getBlock, makeProtocol, portfolio, ReentryAttack, wait, hre } from "./helper/helpers";
// TODO: Fix this.
describe.skip("16. buyCollateral", function () {
  async function mintUserCollateral(comet: SandboxComet, token: FaucetToken, user: string, amount: bigint) {
    await token.allocateTo(user, amount);
    await token.connect(await ethers.getSigner(user)).approve(comet.address, amount);
    await comet.connect(await ethers.getSigner(user)).supply(token.address, amount);
  }

  async function seedBorrow(comet: SandboxComet, base: FaucetToken, coll: FaucetToken, borrower: string, amountBaseWei: bigint = 1000000n) {
    await coll.allocateTo(borrower, exp(2, await coll.decimals()));
    const signer = await ethers.getSigner(borrower);
    await coll.connect(signer).approve(comet.address, exp(2, await coll.decimals()));
    await comet.connect(signer).supply(coll.address, exp(2, await coll.decimals()));
    await comet.connect(signer).withdraw(base.address, amountBaseWei);
  }

  it("allows buying collateral when reserves < target reserves", async () => {
    const protocol = await makeProtocol({
      base: "USDC",
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },

        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,

          minBorrowCF: exp(2, 18),
          maxBorrowCF: exp(3, 18),
          borrowCF: exp(2, 18),

          minLiquidateCF: exp(2, 18),
          maxLiquidateCF: exp(3, 18),
          liquidateCF: exp(21, 17),

          minLiquidationFactor: exp(0.8, 18),
          maxLiquidationFactor: exp(0.9, 18),
          liquidationFactor: exp(0.8, 18),

          supplyCap: exp(1e9, 18),
        },
      },
    });

    const {
      comet,
      tokens,
      owner,
      users: [alice, bob],
      seedReserves,
    } = protocol;
    const { USDC, COMP } = tokens;

    await COMP.allocateTo(owner.address, exp(60, 18));
    await COMP.connect(owner).transfer(comet.address, exp(60, 18));

    await USDC.allocateTo(owner.address, 200e6);
    await USDC.connect(owner).approve(comet.address, 200e6);
    await comet.connect(owner).supply(USDC.address, 200e6);

    await COMP.allocateTo(bob.address, exp(40, 18));
    await COMP.connect(bob).approve(comet.address, exp(40, 18));
    await comet.connect(bob).supply(COMP.address, exp(40, 18));

    await comet.connect(bob).withdraw(USDC.address, 20e6);
    await USDC.allocateTo(alice.address, 100e6);

    const r0 = await comet.getReserves();
    const p0 = await portfolio(protocol, alice.address);

    await USDC.connect(alice).approve(comet.address, 50e6);
    const txn = await wait(comet.connect(alice).buyCollateral(COMP.address, exp(50, 18), 50e6, alice.address));

    const r1 = await comet.getReserves();
    const p1 = await portfolio(protocol, alice.address);

    expect(r0).to.equal(BigInt(seedReserves) + BigInt(1));
    expect(BigInt(r0.toString()) - BigInt(seedReserves)).to.be.lt(BigInt((await comet.targetReserves()).toString()));

    expect(p0.internal).to.deep.equal({ USDC: 0n, COMP: 0n });
    expect(p0.external).to.deep.equal({ USDC: exp(100, 6), COMP: 0n });

    expect(p1.internal).to.deep.equal({ USDC: 0n, COMP: 0n });
    expect(p1.external).to.deep.equal({
      USDC: exp(50, 6),
      COMP: 55555555555555555555n,
    });

    expect(BigInt(r1.toString()) - BigInt(seedReserves)).to.equal(exp(50, 6) + 1n);

    expect(event(txn, 0)).to.deep.equal({
      Transfer: { from: alice.address, to: comet.address, amount: exp(50, 6) },
    });
    expect(event(txn, 1)).to.deep.equal({
      Transfer: {
        from: comet.address,
        to: alice.address,
        amount: 55555555555555555555n,
      },
    });
    expect(event(txn, 3)).to.deep.equal({
      BuyCollateral: {
        buyer: alice.address,
        asset: COMP.address,
        baseAmount: exp(50, 6),
        collateralAmount: 55555555555555555555n,
      },
    });
  });

  it("reverts if trying to buy collateral which belongs to users", async () => {
    const protocol = await makeProtocol({
      base: "USDC",
      assets: {
        USDC: { initial: 0, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 20e18,
          decimals: 18,
          initialPrice: 1,
          liquidationFactor: exp(1, 18),
        },
      },
    });

    const {
      comet,
      tokens,
      users: [alice, bob],
    } = protocol;
    const { USDC, COMP } = tokens;

    await COMP.allocateTo(comet.address, exp(30, 18));
    await USDC.allocateTo(comet.address, 3_000_000n);

    const bigCollateral = exp(4_000_000, 18);
    await COMP.allocateTo(bob.address, bigCollateral);
    await COMP.connect(bob).approve(comet.address, bigCollateral);
    await comet.connect(bob).supply(COMP.address, bigCollateral);

    await seedBorrow(comet, USDC as FaucetToken, COMP as FaucetToken, bob.address, 2_000_000n);

    await USDC.allocateTo(alice.address, 100e6);
    await USDC.connect(alice).approve(comet.address, 50e6);

    await expect(comet.connect(alice).buyCollateral(COMP.address, exp(50, 18), 50e6, alice.address)).to.be.revertedWith(
      "custom error 'InsufficientReserves()'"
    );
  });

  it("reverts if slippage is too high", async () => {
    const protocol = await makeProtocol({
      base: "USDC",
      assets: {
        USDC: {
          initial: 1e6,
          decimals: 6,
          initialPrice: 1,
        },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
        },
      },
    });
    const {
      comet,
      tokens,
      users: [alice],
    } = protocol;
    const { USDC, COMP } = tokens;
    const cometAsA = comet.connect(alice);
    const baseAsA = USDC.connect(alice);

    // Reserves are at 0 wei

    // Set up token balances and accounting
    await USDC.allocateTo(alice.address, 100e6);
    await COMP.allocateTo(comet.address, exp(50, 18));
    const someone = protocol.users[2];

    await mintUserCollateral(comet, COMP as FaucetToken, someone.address, exp(10, 18));
    //await wait(comet.setCollateralBalance(comet.address, COMP.address, exp(50, 18)));

    // Alice tries to buy 100e18 wei COMP for 50e6 wei USDC
    await wait(baseAsA.approve(comet.address, exp(50, 6)));
    await expect(cometAsA.buyCollateral(COMP.address, exp(100, 18), 50e6, alice.address)).to.be.revertedWith(
      "custom error 'TooMuchSlippage()'"
    );
  });

  it("reverts if not enough collateral to buy", async () => {
    const protocol = await makeProtocol({
      base: "USDC",
      assets: {
        USDC: {
          initial: 1e6,
          decimals: 6,
          initialPrice: 1,
        },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
        },
      },
    });
    const {
      comet,
      tokens,
      users: [alice],
    } = protocol;
    const { USDC, COMP } = tokens;
    const cometAsA = comet.connect(alice);
    const baseAsA = USDC.connect(alice);

    // Reserves are at 0 wei

    // Set up token balances and accounting
    await USDC.allocateTo(alice.address, 200e6);
    await COMP.allocateTo(comet.address, exp(50, 18));
    const someone = protocol.users[2];

    await mintUserCollateral(comet, COMP as FaucetToken, someone.address, exp(50, 18));
    // await wait(comet.setCollateralBalance(comet.address, COMP.address, exp(50, 18)));

    // Alice tries to buy 200e18 wei COMP for 200e6 wei USDC
    await wait(baseAsA.approve(comet.address, exp(200, 6)));
    await expect(cometAsA.buyCollateral(COMP.address, exp(200, 18), 200e6, alice.address)).to.be.revertedWith(
      "custom error 'InsufficientReserves()'"
    );
  });

  it("reverts if buy is paused", async () => {
    const protocol = await makeProtocol({
      base: "USDC",
      assets: {
        USDC: {
          initial: 1e6,
          decimals: 6,
          initialPrice: 1,
        },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
        },
      },
    });
    const {
      comet,
      tokens,
      users: [alice],
      configController,
    } = protocol;
    const { COMP } = tokens;
    const cometAsA = comet.connect(alice);

    const configSigner = await ethers.getImpersonatedSigner(configController.address);

    await hre.network.provider.send("hardhat_setBalance", [configController.address, ethers.utils.hexValue(ethers.utils.parseEther("1"))]);

    await wait(comet.connect(configSigner).pause(false, false, false, false, true));
    expect(await comet.isBuyPaused()).to.be.true;

    await expect(cometAsA.buyCollateral(COMP.address, exp(50, 18), 50e6, alice.address)).to.be.revertedWith("custom error 'Paused()'");
  });

  it("buys the correct amount in a fee-like situation", async () => {
    const protocol = await makeProtocol({
      base: "USDT",
      assets: {
        USDT: {
          initial: 1e6,
          decimals: 6,
          initialPrice: 1,
          factory: (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory,
        },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
          liquidationFactor: exp(0.8, 18),
          factory: (await ethers.getContractFactory("NonStandardFaucetFeeToken")) as NonStandardFaucetFeeToken__factory,
        },
      },
    });

    const {
      comet,
      tokens,
      users: [alice],
      seedReserves,
    } = protocol;
    const { USDT, COMP } = tokens;

    // Set both COMP and USDT with 1% fees
    // So we can test internal accounting works correctly in both ways: 1. correctly deducting fees from payment during buyCollateral 2. correctly deducting fees from collateral token to buyer
    await (COMP as NonStandardFaucetFeeToken).setParams(100, 10000);
    await (USDT as NonStandardFaucetFeeToken).setParams(100, 10000);

    const cometAsA = comet.connect(alice);
    const baseAsA = USDT.connect(alice);

    await USDT.allocateTo(alice.address, 100e6);
    await COMP.allocateTo(comet.address, exp(60, 18));

    const r0 = await comet.getReserves();
    const p0 = await portfolio(protocol, alice.address);
    await wait(baseAsA.approve(comet.address, exp(50, 6)));

    // Some math writeup for better understanding in each expects number:
    // assetPriceDiscount = 1 - (storeFrontPriceFactor * (1 - liquidationFactor)) * assetPrice
    // assetPriceDiscount = 1 - (0.5 * (1 - 0.8)) * 1 = 0.9
    // collateralAmount = basePrice * baseAmount / assetPriceDiscount
    // collateralAmount = 1 * 50 * (1 - Token Fee) / 0.9 = 1 * 50 * 0.99 / 0.9 = 55
    // actualReceiveCollateral = 55 * (1 - Token Fee) = 55 * 0.99 = 54.45
    const txn = await wait(cometAsA.buyCollateral(COMP.address, exp(50, 18), 50e6, alice.address));
    const p1 = await portfolio(protocol, alice.address);
    const r1 = await comet.getReserves();

    expect(r0).to.be.equal(seedReserves);
    expect(r0).to.be.lt(await comet.targetPercent());
    expect(p0.internal).to.be.deep.equal({ USDT: 0n, COMP: 0n });
    expect(p0.external).to.be.deep.equal({ USDT: exp(100, 6), COMP: 0n });
    expect(p1.internal).to.be.deep.equal({ USDT: 0n, COMP: 0n });
    expect(p1.external).to.be.deep.equal({
      USDT: exp(50, 6),
      COMP: exp(54.45, 18),
    });
    expect(r1).to.be.equal(exp(49.5, 6) + BigInt(seedReserves));
    expect(event(txn, 0)).to.be.deep.equal({
      Transfer: {
        from: alice.address,
        to: comet.address,
        amount: exp(49.5, 6),
      },
    });
    expect(event(txn, 1)).to.be.deep.equal({
      Transfer: {
        from: comet.address,
        to: alice.address,
        amount: exp(54.45, 18),
      },
    });
    expect(event(txn, 2)).to.be.deep.equal({
      BuyCollateral: {
        buyer: alice.address,
        asset: COMP.address,
        baseAmount: exp(49.5, 6),
        collateralAmount: exp(55, 18),
      },
    });
  });

  /// TODO: FIX of ts compiler error. Check if this is correct.
  // Define the extended interface for the comet contract with additional methods
  interface ExtendedCometHarness extends CometHarness {
    approve(address, bool): Promise<void>;
  }
  /// TODO: FIX of ts compiler error. Check if this is correct.
  const extAbi = ["approve(address,bool)"];

  // TODO: Fix this
  describe.skip("reentrancy", function () {
    // todo: check test to have correct target percent
    it.skip("is blocked during reentrant supply", async () => {
      const wethArgs = {
        initial: 1e4,
        decimals: 18,
        initialPrice: 3000,
      };
      const baseTokenArgs = {
        decimals: 6,
        initial: 1e6,
        initialPrice: 1,
      };

      // 1. normal scenario, USDC base
      const normalProtocol = await makeProtocol({
        base: "USDC",
        assets: {
          USDC: baseTokenArgs,
          WETH: wethArgs,
        },
      });
      const {
        comet: normalComet,
        tokens: normalTokens,
        users: [normalAlice, normalBob, evilAlice, evilBob], // addresses are constant
      } = normalProtocol;
      const { USDC: normalUSDC, WETH: normalWETH } = normalTokens;

      // 2. malicious scenario, EVIL token is base
      const evilProtocol = await makeProtocol({
        base: "EVIL",
        assets: {
          EVIL: {
            ...baseTokenArgs,
            factory: (await ethers.getContractFactory("EvilToken")) as EvilToken__factory,
          },
          WETH: wethArgs,
        },
        //       targetPercent: 0.01,
      });
      const evilTokens = evilProtocol.tokens;
      /// TODO: FIX of ts compiler error. Check if this is correct.
      const evilComet = new ethers.Contract(evilProtocol.comet.address, [
        ...evilProtocol.comet.interface.fragments,
        ...extAbi,
      ]) as ExtendedCometHarness;
      const { WETH: evilWETH, EVIL } = <{ WETH: FaucetToken; EVIL: EvilToken }>evilTokens;
      // add attack to EVIL token
      const attack = Object.assign({}, await EVIL.getAttack(), {
        attackType: ReentryAttack.SupplyFrom,
        source: evilAlice.address,
        destination: evilBob.address,
        asset: EVIL.address,
        amount: 3000e6,
        maxCalls: 1,
      });
      await EVIL.setAttack(attack);

      // allocate tokens
      await normalWETH.allocateTo(normalComet.address, exp(100, 18));
      await normalUSDC.allocateTo(normalAlice.address, exp(5000, 6));
      // allocate tokens (evil)
      await evilWETH.allocateTo(evilComet.address, exp(100, 18));
      await EVIL.allocateTo(evilAlice.address, exp(5000, 6));

      // ensure both Comets have the same lastAccrualTime
      const start = (await getBlock()).timestamp;

      let tb0 = await normalComet.totalsBasic();
      tb0 = Object.assign({}, tb0, {
        lastAccrualTime: start,
      });
      await normalComet.setTotalsBasic(tb0);

      let tb1 = await evilComet.totalsBasic();
      tb1 = Object.assign({}, tb1, {
        lastAccrualTime: start,
      });
      await evilComet.setTotalsBasic(tb1);

      // approve Comet to move funds
      await normalUSDC.connect(normalAlice).approve(normalComet.address, exp(5000, 6));
      await EVIL.connect(evilAlice).approve(EVIL.address, exp(5000, 6));
      await EVIL.connect(evilAlice).approve(evilComet.address, exp(5000, 6));
      // perform the supplies for each protocol in the same block, so that the
      // same amount of time elapses for each when calculating interest
      await ethers.provider.send("evm_setAutomine", [false]);

      // call supply
      await normalComet.connect(normalAlice).supplyFrom(normalAlice.address, normalBob.address, normalUSDC.address, 1e6);

      // call buyCollateral
      await normalComet.connect(normalAlice).buyCollateral(normalWETH.address, exp(0.5, 18), exp(3000, 6), normalAlice.address);

      // authorize EVIL, since callback will originate from EVIL token address
      await evilComet.connect(evilAlice).approve(EVIL.address, true);
      // call buyCollateral; supplyFrom is called in in callback
      await evilComet.connect(evilAlice).buyCollateral(evilWETH.address, exp(0, 18), exp(3000, 6), evilAlice.address);

      await evilComet.accrueAccount(evilAlice.address);

      // !important; reenable automine
      await ethers.provider.send("evm_mine", [start + 1000]);
      await ethers.provider.send("evm_setAutomine", [true]);

      const normalTotalsBasic = await normalComet.totalsBasic();
      const normalTotalsCollateral = await normalComet.totalsCollateral(normalWETH.address);
      const evilTotalsBasic = await evilComet.totalsBasic();
      const evilTotalsCollateral = await evilComet.totalsCollateral(evilWETH.address);

      expect(normalTotalsBasic.baseSupplyIndex).to.equal(evilTotalsBasic.baseSupplyIndex);
      expect(normalTotalsBasic.baseBorrowIndex).to.equal(evilTotalsBasic.baseBorrowIndex);
      expect(normalTotalsBasic.totalSupplyBase).to.equal(1e6);
      // EvilToken attack should be blocked
      expect(evilTotalsBasic.totalSupplyBase).to.equal(0);
      expect(normalTotalsBasic.totalBorrowBase).to.equal(evilTotalsBasic.totalBorrowBase);

      expect(normalTotalsCollateral).to.eq(evilTotalsCollateral);

      const normalAlicePortfolio = await portfolio(normalProtocol, normalAlice.address);
      const evilAlicePortfolio = await portfolio(evilProtocol, evilAlice.address);

      expect(normalAlicePortfolio.internal.USDC).to.deep.equal(evilAlicePortfolio.internal.EVIL);
      expect(normalAlicePortfolio.internal.WETH).to.deep.equal(evilAlicePortfolio.internal.WETH);

      const normalBobPortfolio = await portfolio(normalProtocol, normalBob.address);
      const evilBobPortfolio = await portfolio(evilProtocol, evilBob.address);

      expect(normalBobPortfolio.internal.USDC).to.equal(1e6);
      // EvilToken attack should be blocked, so totalSupplyBase should be 0
      expect(evilBobPortfolio.internal.EVIL).to.equal(0);
    });

    // todo: check test to have correct target percent
    it.skip("reentrant buyCollateral is reverted", async () => {
      const wethArgs = {
        initial: 1e4,
        decimals: 18,
        initialPrice: 3000,
      };
      const baseTokenArgs = {
        decimals: 6,
        initial: 1e6,
        initialPrice: 1,
      };

      // malicious scenario, EVIL token is base
      const evilProtocol = await makeProtocol({
        base: "EVIL",
        assets: {
          EVIL: {
            ...baseTokenArgs,
            factory: (await ethers.getContractFactory("EvilToken")) as EvilToken__factory,
          },
          WETH: wethArgs,
        },
        //        targetPercent: 0.01,
      });
      const {
        tokens: evilTokens,
        users: [evilAlice, evilBob],
      } = evilProtocol;
      /// TODO: FIX of ts compiler error. Check if this is correct.
      const evilComet = new ethers.Contract(evilProtocol.comet.address, [
        ...evilProtocol.comet.interface.fragments,
        ...extAbi,
      ]) as ExtendedCometHarness;

      const { WETH: evilWETH, EVIL } = <{ WETH: FaucetToken; EVIL: EvilToken }>evilTokens;

      // add attack to EVIL token
      const attack = Object.assign({}, await EVIL.getAttack(), {
        attackType: ReentryAttack.BuyCollateral,
        source: evilAlice.address,
        destination: evilBob.address,
        asset: evilWETH.address,
        amount: 3000e6,
        maxCalls: 1,
      });
      await EVIL.setAttack(attack);

      // allocate tokens (evil)
      await evilWETH.allocateTo(evilComet.address, exp(100, 18));
      await EVIL.allocateTo(evilAlice.address, exp(5000, 6));

      // approve Comet to move funds
      await EVIL.connect(evilAlice).approve(EVIL.address, exp(5000, 6));
      await EVIL.connect(evilAlice).approve(evilComet.address, exp(5000, 6));

      // authorize EVIL, since callback will originate from EVIL token address
      await evilComet.connect(evilAlice).approve(EVIL.address, true);

      // call buyCollateral; supplyFrom is called in callback
      await expect(
        evilComet.connect(evilAlice).buyCollateral(evilWETH.address, exp(0, 18), exp(3000, 6), evilAlice.address)
      ).to.be.revertedWith("custom error 'ReentrantCallBlocked()'");
    });
  });
});
