import { ethers } from 'ethers';
import { event, expect, exp, factor, defaultAssets, makeProtocol, mulPrice, portfolio, totalsAndReserves, wait, bumpTotalsCollateral, setTotalsBasic, hre } from './helper/helpers';

describe('absorb', function () {
  it('reverts if total borrows underflows', async () => {
    const { comet, users: [absorber, underwater] } = await makeProtocol({
      base: 'USDC', targetPercent: 0.5,
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
      }
    });

    const _f0 = await comet.setBasePrincipal(underwater.address, -100);
    await expect(comet.absorb(absorber.address, [underwater.address])).to.be.revertedWith('code 0x11 (Arithmetic operation underflowed or overflowed outside of an unchecked block)');
  });

  it('absorbs 1 account and pays out the absorber', async () => {
    const protocol = await makeProtocol({
      base: 'USDC', targetPercent: 0.5,
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
        WBTC: {
          initial: 1e7,
          decimals: 8,
          initialPrice: 1,
        },
        WETH: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
        },
      }
    });
    const { comet, priceFeeds, users: [absorber, underwater], seedReserves } = protocol;

    await setTotalsBasic(comet, {
      totalSupplyBase: 0n,
      totalBorrowBase: 100n,
    });


    await comet.setBasePrincipal(underwater.address, -100);

    const r0 = await comet.getReserves();

    const pA0 = await portfolio(protocol, absorber.address);
    const pU0 = await portfolio(protocol, underwater.address);

    const a0 = await wait(comet.absorb(absorber.address, [underwater.address]));

    const t1 = await comet.totalsBasic();
    const r1 = await comet.getReserves();

    const pA1 = await portfolio(protocol, absorber.address);
    const pU1 = await portfolio(protocol, underwater.address);

    expect(r0).to.equal(BigInt(seedReserves) + 100n);

    expect(t1.totalSupplyBase).to.be.equal(0);
    expect(t1.totalBorrowBase).to.be.equal(0);
    expect(r1).to.be.equal(seedReserves);

    expect(pA0.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pA0.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU0.internal).to.be.deep.equal({ COMP: 0n, USDC: -100n, WBTC: 0n, WETH: 0n });
    expect(pU0.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });

    expect(pA1.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pA1.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU1.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU1.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });

    const [_, usdcPrice] = await priceFeeds['USDC'].latestRoundData();
    const baseScale = await comet.baseScale();
    expect(event(a0, 0)).to.be.deep.equal({
      AbsorbDebt: {
        absorber: absorber.address,
        borrower: underwater.address,
        basePaidOut: 100n,
        usdValue: mulPrice(100n, usdcPrice, baseScale),
      }
    });
  });

  it('absorbs 2 accounts and pays out the absorber', async () => {
    const params = {
      supplyInterestRateBase: 0,
      supplyInterestRateSlopeLow: 0,
      supplyInterestRateSlopeHigh: 0,
      borrowInterestRateBase: 0,
      borrowInterestRateSlopeLow: 0,
      borrowInterestRateSlopeHigh: 0,
    };
    const protocol = await makeProtocol({
      base: 'USDC', targetPercent: 0.5,
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
        WBTC: {
          initial: 1e7,
          decimals: 8,
          initialPrice: 1,
        },
        WETH: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
        },
      }
    });
    const { comet, priceFeeds, users: [absorber, underwater1, underwater2], seedReserves } = protocol;

    await setTotalsBasic(comet, { totalBorrowBase: 2000n, totalSupplyBase: 0n });

    const r0 = await comet.getReserves();

    await comet.setBasePrincipal(underwater1.address, -100);
    await comet.setBasePrincipal(underwater2.address, -700);

    const pA0 = await portfolio(protocol, absorber.address);
    const pU1_0 = await portfolio(protocol, underwater1.address);
    const pU2_0 = await portfolio(protocol, underwater2.address);

    const a0 = await wait(comet.absorb(absorber.address, [underwater1.address, underwater2.address]));

    const r1 = await comet.getReserves();

    const pA1 = await portfolio(protocol, absorber.address);
    const pU1_1 = await portfolio(protocol, underwater1.address);
    const pU2_1 = await portfolio(protocol, underwater2.address);

    expect(r0).to.be.equal(BigInt(seedReserves) + 2000n);

    expect(r1).to.be.equal(BigInt(seedReserves) + 1200n);

    expect(pA0.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pA0.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU1_0.internal).to.be.deep.equal({ COMP: 0n, USDC: -100n, WBTC: 0n, WETH: 0n });
    expect(pU1_0.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU2_0.internal).to.be.deep.equal({ COMP: 0n, USDC: -700n, WBTC: 0n, WETH: 0n });
    expect(pU2_0.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });

    expect(pA1.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pA1.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU1_1.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU1_1.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU2_1.internal).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });
    expect(pU2_1.external).to.be.deep.equal({ COMP: 0n, USDC: 0n, WBTC: 0n, WETH: 0n });

    const [_, usdcPrice] = await priceFeeds['USDC'].latestRoundData();
    const baseScale = await comet.baseScale();
    expect(event(a0, 0)).to.be.deep.equal({
      AbsorbDebt: {
        absorber: absorber.address,
        borrower: underwater1.address,
        basePaidOut: 100n,
        usdValue: mulPrice(100n, usdcPrice, baseScale),
      }
    });
    expect(event(a0, 1)).to.be.deep.equal({
      AbsorbDebt: {
        absorber: absorber.address,
        borrower: underwater2.address,
        basePaidOut: 700n,
        usdValue: mulPrice(700n, usdcPrice, baseScale),
      }
    });
  });

  it('absorbs 3 accounts with collateral and pays out the absorber', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },

        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          minBorrowCF: exp(0.5, 18), maxBorrowCF: exp(0.5, 18),
          minLiquidateCF: exp(0.5, 18), maxLiquidateCF: exp(0.5, 18),
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          borrowCF: exp(0.5, 18), liquidateCF: exp(0.5, 18),
          liquidationFactor: exp(0.1, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          minBorrowCF: exp(0.5, 18), maxBorrowCF: exp(0.5, 18),
          minLiquidateCF: exp(0.5, 18), maxLiquidateCF: exp(0.5, 18),
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          borrowCF: exp(0.5, 18), liquidateCF: exp(0.5, 18),
          liquidationFactor: exp(0.1, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 8, initialPrice: 1,
          minBorrowCF: exp(0.5, 18), maxBorrowCF: exp(0.5, 18),
          minLiquidateCF: exp(0.5, 18), maxLiquidateCF: exp(0.5, 18),
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          borrowCF: exp(0.5, 18), liquidateCF: exp(0.5, 18),
          liquidationFactor: exp(0.1, 18)
        },
      }
    });

    const { comet, tokens, users: [absorber, u1, u2, u3] } = protocol;
    const { COMP, WETH, WBTC } = tokens;

    await setTotalsBasic(comet, {
      totalBorrowBase: exp(3e15, 6),
      totalSupplyBase: exp(4e15, 6),
    });
    await bumpTotalsCollateral(comet, COMP, exp(1e-6, 18) + exp(10, 18) + exp(10, 18));
    await bumpTotalsCollateral(comet, WETH, exp(1, 18) + exp(50, 18));
    await bumpTotalsCollateral(comet, WBTC, exp(50, 8));

    await comet.setBasePrincipal(u1.address, -exp(1_000, 6));
    await comet.setCollateralBalance(u1.address, COMP.address, exp(5, 8));

    await comet.setBasePrincipal(u2.address, -exp(100_000, 6));
    await comet.setCollateralBalance(u2.address, COMP.address, exp(1, 10));
    await comet.setCollateralBalance(u2.address, WETH.address, exp(2, 12));

    await comet.setBasePrincipal(u3.address, -exp(100, 18));
    await comet.setCollateralBalance(u3.address, COMP.address, exp(10, 18));
    await comet.setCollateralBalance(u3.address, WETH.address, exp(50, 18));
    await comet.setCollateralBalance(u3.address, WBTC.address, exp(50, 8));

    expect(await comet.isLiquidatable(u1.address)).to.equal(true);
    expect(await comet.isLiquidatable(u2.address)).to.equal(true);
    expect(await comet.isLiquidatable(u3.address)).to.equal(true);

    const tx = await comet.absorb(absorber.address, [u1.address, u2.address, u3.address]);
    const rcpt = await tx.wait();

    for (const borrower of [u1, u2, u3]) {
      const { principal } = await comet.userBasic(borrower.address);
      expect(principal).to.equal(0);
      expect(await comet.isLiquidatable(borrower.address)).to.equal(false);
    }

    const absorbDebtEvents = rcpt.events?.filter(e => e.event === 'AbsorbDebt') || [];
    expect(absorbDebtEvents.length).to.equal(3);

    for (const tok of [COMP, WETH, WBTC]) {
      const bal = await tok.balanceOf(comet.address);
      expect(bal).to.be.gt(0);
    }
  });

  it('absorbs an account with more than enough collateral to still cover debt', async () => {
    const BORROW_CF = exp(0.5, 18);
    const LIQ_CF = exp(2 / 3, 18);

    const COMP_BAL = 100_000n;
    const WETH_BAL = 100_000n;
    const WBTC_BAL = 1_000n;

    const TOTAL_LIQ = (COMP_BAL + WETH_BAL + WBTC_BAL) * 2n / 3n;

    const FINAL_DEBT = 0n;
    const START_DEBT = -TOTAL_LIQ;


    const protocol = await makeProtocol({
      base: 'USDC',
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF, maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF, liquidateCF: LIQ_CF,
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          liquidationFactor: exp(0.1, 18),
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF, maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF, liquidateCF: LIQ_CF,
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          liquidationFactor: exp(0.1, 18),
        },
        WBTC: {
          initial: 1e7, decimals: 8, initialPrice: 1,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF, maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF, liquidateCF: LIQ_CF,
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          liquidationFactor: exp(0.1, 18),
        },
      }
    });

    const { comet, tokens, users: [absorber, borrower] } = protocol;
    const { COMP, WETH, WBTC } = tokens;

    await setTotalsBasic(comet, { totalBorrowBase: -START_DEBT });
    await bumpTotalsCollateral(comet, COMP, COMP_BAL);
    await bumpTotalsCollateral(comet, WETH, WETH_BAL);
    await bumpTotalsCollateral(comet, WBTC, WBTC_BAL);

    await comet.setBasePrincipal(borrower.address, START_DEBT);
    await comet.setCollateralBalance(borrower.address, COMP.address, COMP_BAL);
    await comet.setCollateralBalance(borrower.address, WETH.address, WETH_BAL);
    await comet.setCollateralBalance(borrower.address, WBTC.address, WBTC_BAL);

    expect(await comet.isLiquidatable(borrower.address)).to.equal(true);


    const reservesBefore = await comet.getReserves();
    const tx = await comet.absorb(absorber.address, [borrower.address]);
    const rcpt = await tx.wait();

    const absDebtEvt = rcpt.events?.find(e => e.event === 'AbsorbDebt')!;
    const basePaidOut = absDebtEvt.args.basePaidOut as ethers.BigNumber;


    expect(await comet.getReserves()).to.equal(reservesBefore.sub(basePaidOut));

    const user = await comet.userBasic(borrower.address);
    expect(user.principal).to.equal(FINAL_DEBT);

    for (const t of [COMP, WETH, WBTC])
      expect(await t.balanceOf(borrower.address)).to.equal(0);

    const absColl = rcpt.events?.filter(e => e.event === 'AbsorbCollateral') || [];
    expect(absColl.length).to.equal(3);

    const [evComp, evWeth, evWbtc] = absColl.map(e => e.args);
    expect(evComp.collateralAbsorbed).to.equal(COMP_BAL);
    expect(evWeth.collateralAbsorbed).to.equal(WETH_BAL);
    expect(evWbtc.collateralAbsorbed).to.equal(WBTC_BAL);

    expect(basePaidOut).to.equal(ethers.BigNumber.from(-START_DEBT));
  });

  it('reverts if an account is not underwater', async () => {
    const { comet, users: [alice, bob] } = await makeProtocol({
      base: 'USDC', targetPercent: 0.5,
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
      }
    });

    await expect(comet.absorb(alice.address, [bob.address])).to.be.revertedWith("custom error 'NotLiquidatable()'");
  });

  it.skip('reverts if collateral asset value overflows base balance', async () => { });

  it('reverts if absorb is paused', async () => {
    const protocol = await makeProtocol({
      base: 'USDC', targetPercent: 0.5,
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
        WBTC: {
          initial: 1e7,
          decimals: 8,
          initialPrice: 1,
        },
        WETH: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
        },
      }
    });
    const { comet, configController, users: [alice, bob] } = protocol;

    const cometAsB = comet.connect(bob);

    // Pause transfer

    const configSigner = await hre.ethers.getImpersonatedSigner(configController.address);

    await hre.network.provider.request({
      method: 'hardhat_setBalance',
      params: [configSigner.address, '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'],
    });

    await wait(comet.connect(configSigner).pause(false, false, false, true, false));
    expect(await comet.isAbsorbPaused()).to.be.true;

    await expect(cometAsB.absorb(bob.address, [alice.address])).to.be.revertedWith("custom error 'Paused()'");
  });

  it('updates assetsIn for liquidated account', async () => {
    const BORROW_CF = exp(0.5, 18);
    const LIQ_CF = exp(2 / 3, 18);

    const protocol = await makeProtocol({
      base: 'USDC',
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },

        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF, maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF, liquidateCF: LIQ_CF,
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          liquidationFactor: exp(0.1, 18),
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF, maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF, liquidateCF: LIQ_CF,
          minLiquidationFactor: exp(0.1, 18), maxLiquidationFactor: exp(1, 18),
          liquidationFactor: exp(0.1, 18),
        },
      }
    });

    const { comet, users: [absorber, underwater], tokens } = protocol;
    const { COMP, WETH } = tokens;

    const COMP_BAL = 200_000n;
    const WETH_BAL = 200_000n;

    await bumpTotalsCollateral(comet, COMP, COMP_BAL);
    await bumpTotalsCollateral(comet, WETH, WETH_BAL);

    await comet.setCollateralBalance(underwater.address, COMP.address, COMP_BAL);
    await comet.setCollateralBalance(underwater.address, WETH.address, WETH_BAL);

    const borrowAmount = exp(1_000_000, 6);
    await comet.setBasePrincipal(underwater.address, -borrowAmount);
    await setTotalsBasic(comet, { totalBorrowBase: borrowAmount });

    expect(await comet.isLiquidatable(underwater.address)).to.equal(true);

    await comet.absorb(absorber.address, [underwater.address]);
    expect(await comet.getAssetList(underwater.address)).to.be.empty;
  });

  it('updates assetsIn for liquidated account in 24 assets', async () => {
    /* factors that satisfy SandboxController limits */
    const BORROW_CF = exp(0.5, 18);   // 0.50
    const LIQ_CF    = exp(0.6, 18);   // 0.60 (min 0.60 ≤ x ≤ 0.70)
  
    /* build ASSET3 … ASSET23 configs */
    const extraAssets = Array.from({ length: 21 }, (_, i) => `ASSET${i + 3}`)
      .reduce<Record<string, any>>((map, sym) => {
        map[sym] = {
          initial:      1e7,
          decimals:     18,
          initialPrice: 1,
          minBorrowCF:        BORROW_CF,
          maxBorrowCF:        BORROW_CF,
          minLiquidateCF:     LIQ_CF,
          maxLiquidateCF:     LIQ_CF,
          borrowCF:           BORROW_CF,
          liquidateCF:        LIQ_CF,
        };
        return map;
      }, {});
  
    /* deploy protocol */
    const protocol = await makeProtocol({
      base: 'USDC',
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
  
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 175,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF,  maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF,     liquidateCF: LIQ_CF,
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 3_000,
          minBorrowCF: BORROW_CF, maxBorrowCF: BORROW_CF,
          minLiquidateCF: LIQ_CF,  maxLiquidateCF: LIQ_CF,
          borrowCF: BORROW_CF,     liquidateCF: LIQ_CF,
        },
  
        ...extraAssets,
      },
    });
  
    /* handles */
    const {
      comet,
      tokens: { COMP, WETH, ...rest },
      users:  [absorber, borrower],
    } = protocol;
  
    /* put **1 wei** of every collateral token into protocol & borrower */
    const ONE_WEI = 1n;
  
    await bumpTotalsCollateral(comet, COMP, ONE_WEI);
    await bumpTotalsCollateral(comet, WETH, ONE_WEI);
    await comet.setCollateralBalance(borrower.address, COMP.address, ONE_WEI);
    await comet.setCollateralBalance(borrower.address, WETH.address, ONE_WEI);
  
    for (const sym of Object.keys(extraAssets)) {
      const tok = rest[sym];
      await bumpTotalsCollateral(comet, tok, ONE_WEI);
      await comet.setCollateralBalance(borrower.address, tok.address, ONE_WEI);
    }
  
    /* borrower asset list must contain 23 addresses */
    expect((await comet.getAssetList(borrower.address)).length).to.equal(23);
  
    /* make borrower vastly underwater with a 4 000 USDC loan */
    const borrow = exp(4_000, 6);
    await comet.setBasePrincipal(borrower.address, -borrow);
    await setTotalsBasic(comet, { totalBorrowBase: borrow });
  
    expect(await comet.isLiquidatable(borrower.address)).to.equal(true);
  
    /* absorb & verify assetsIn cleared */
    await comet.absorb(absorber.address, [borrower.address]);
    expect(await comet.getAssetList(borrower.address)).to.be.empty;
  });
  
  
});