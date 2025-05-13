import { EvilToken, EvilToken__factory, FaucetToken } from '../build/types';
import { baseBalanceOf, ethers, event, expect, exp, makeProtocol, portfolio, ReentryAttack, wait, fastForward, hre } from './helper/helpers';

describe('withdrawTo', function () {
  it('withdraws base from sender if the asset is base', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { USDC } = tokens;

    const _i0 = await USDC.allocateTo(comet.address, 100e6);
    const _i1 = await comet.setBasePrincipal(bob.address, 100e6);
    const cometAsB = comet.connect(bob);

    const p0 = await portfolio(protocol, alice.address);
    const q0 = await portfolio(protocol, bob.address);
    const s0 = await wait(cometAsB.withdrawTo(alice.address, USDC.address, 100e6));
    const alice1 = await portfolio(protocol, alice.address);
    const bob1 = await portfolio(protocol, bob.address);

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, BigInt(100e6));
    expectWithdraw(events, bob.address, alice.address, BigInt(100e6));
    expectBurn(events, bob.address, BigInt(100e6));

    expect(p0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q0.internal).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(alice1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(alice1.external).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(bob1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(bob1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(Number(s0.receipt.gasUsed)).to.be.lessThan(180000);
  });

  it('does not emit Transfer for 0 burn', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { USDC, WETH } = tokens;

    await USDC.allocateTo(comet.address, 110e6);
    await comet.setCollateralBalance(bob.address, WETH.address, exp(1, 18));
    const cometAsB = comet.connect(bob);

    const s0 = await wait(cometAsB.withdrawTo(alice.address, USDC.address, exp(1, 6)));

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, exp(1, 6));
    expectWithdraw(events, bob.address, alice.address, exp(1, 6));
    // Ensure no burn Transfer for 0 amount
    expectNoBurn(events, bob.address);
  });

  it('withdraws max base balance (including accrued) from sender if the asset is base', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 110e6);
    await comet.setBasePrincipal(bob.address, 100e6);
    const cometAsB = comet.connect(bob);

    // Fast forward to accrue some interest
    await fastForward(86400);
    await ethers.provider.send('evm_mine', []);

    const a0 = await portfolio(protocol, alice.address);
    const b0 = await portfolio(protocol, bob.address);
    const bobAccruedBalance = (await comet.callStatic.balanceOf(bob.address)).toBigInt();
    const s0 = await wait(cometAsB.withdrawTo(alice.address, USDC.address, ethers.constants.MaxUint256));
    const a1 = await portfolio(protocol, alice.address);
    const b1 = await portfolio(protocol, bob.address);

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, bobAccruedBalance);
    expectWithdraw(events, bob.address, alice.address, bobAccruedBalance);
    expectBurn(events, bob.address, bobAccruedBalance);

    expect(a0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.internal).to.be.deep.equal({ USDC: bobAccruedBalance, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.external).to.be.deep.equal({ USDC: bobAccruedBalance, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(Number(s0.receipt.gasUsed)).to.be.lessThan(180000);
  });

  it('withdraw max base should withdraw 0 if user has a borrow position', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { USDC, WETH } = tokens;

    await comet.setBasePrincipal(bob.address, -100e6);
    await comet.setCollateralBalance(bob.address, WETH.address, exp(1, 18));
    const cometAsB = comet.connect(bob);

    const a0 = await portfolio(protocol, alice.address);
    const b0 = await portfolio(protocol, bob.address);
    const s0 = await wait(cometAsB.withdrawTo(alice.address, USDC.address, ethers.constants.MaxUint256));
    const a1 = await portfolio(protocol, alice.address);
    const b1 = await portfolio(protocol, bob.address);

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, 0n);
    expectWithdraw(events, bob.address, alice.address, 0n);

    expect(a0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b0.internal).to.be.deep.equal({ USDC: exp(-100, 6), COMP: 0n, WETH: exp(1, 18), WBTC: 0n });
    expect(b0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(a1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(b1.internal).to.be.deep.equal({ USDC: exp(-100, 6), COMP: 0n, WETH: exp(1, 18), WBTC: 0n });
    expect(b1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(Number(s0.receipt.gasUsed)).to.be.lessThan(152000);
  });

  // This demonstrates a weird quirk of the present value/principal value rounding down math.
  it('withdraws 0 but Comet Transfer event amount is 1', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice] } = protocol;
    const { USDC } = tokens;

    await comet.setBasePrincipal(alice.address, 99999992291226);

    const s0 = await wait(comet.connect(alice).withdraw(USDC.address, 0));

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, 0n);
    expectWithdraw(events, alice.address, alice.address, 0n);
    // Weird quirk of round down behavior where `withdrawAmount` is 1 even though
    // `amount` is 0. So no base leaves Comet (which is expected)
    expectBurn(events, alice.address, 1n);
  });

  it('withdraws collateral from sender if the asset is collateral', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { COMP } = tokens;

    const _i0 = await COMP.allocateTo(comet.address, 8e8);
    const t0 = Object.assign({}, await comet.totalsCollateral(COMP.address), {
      totalSupplyAsset: 8e8,
    });
    const _b0 = await wait(comet.setTotalsCollateral(COMP.address, t0));

    const _i1 = await comet.setCollateralBalance(bob.address, COMP.address, 8e8);
    const cometAsB = comet.connect(bob);

    const p0 = await portfolio(protocol, alice.address);
    const q0 = await portfolio(protocol, bob.address);
    const s0 = await wait(cometAsB.withdrawTo(alice.address, COMP.address, 8e8));
    const t1 = await comet.totalsCollateral(COMP.address);
    const p1 = await portfolio(protocol, alice.address);
    const q1 = await portfolio(protocol, bob.address);

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, BigInt(8e8));
    expectWithdraw(events, bob.address, alice.address, BigInt(8e8));

    expect(p0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q0.internal).to.be.deep.equal({ USDC: 0n, COMP: exp(8, 8), WETH: 0n, WBTC: 0n });
    expect(q0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p1.external).to.be.deep.equal({ USDC: 0n, COMP: exp(8, 8), WETH: 0n, WBTC: 0n });
    expect(q1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(t1.totalSupplyAsset).to.be.equal(0n);
    expect(Number(s0.receipt.gasUsed)).to.be.lessThan(100000);
  });

  it('calculates base principal correctly', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 100e6);
    await comet.setBasePrincipal(bob.address, 100e6); // 100e6 in present value
    const cometAsB = comet.connect(bob);

    const alice0 = await portfolio(protocol, alice.address);
    const bob0 = await portfolio(protocol, bob.address);

    const s0 = await wait(cometAsB.withdrawTo(alice.address, USDC.address, 100e6));
    const alice1 = await portfolio(protocol, alice.address);
    const bob1 = await portfolio(protocol, bob.address);

    const events = getEvents(s0);
    expectTransfer(events, comet.address, alice.address, BigInt(100e6));
    expectWithdraw(events, bob.address, alice.address, BigInt(100e6));
    expectBurn(events, bob.address, BigInt(100e6));

    expect(alice0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(alice0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(bob0.internal).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(bob0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(alice1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(alice1.external).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(bob1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(bob1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
  });

  it('reverts if withdrawing base exceeds the total supply', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { USDC } = tokens;

    const _i0 = await USDC.allocateTo(comet.address, exp(100e6, 18));
    const _i1 = await comet.setBasePrincipal(bob.address, exp(100e6, 18));
    const cometAsB = comet.connect(bob);

    await expect(cometAsB.withdrawTo(alice.address, USDC.address, exp(100e6, 18))).to.be.reverted;
  });

  it('reverts if withdrawing collateral exceeds the total supply', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { COMP } = tokens;

    const _i0 = await COMP.allocateTo(comet.address, 8e8);
    const _i1 = await comet.setCollateralBalance(bob.address, COMP.address, 8e8);
    const cometAsB = comet.connect(bob);

    await expect(cometAsB.withdrawTo(alice.address, COMP.address, 8e8)).to.be.reverted;
  });

  it('reverts if the asset is neither collateral nor base', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, users: [alice, bob], unsupportedToken: USUP } = protocol;

    const _i0 = await USUP.allocateTo(comet.address, 1);
    const cometAsB = comet.connect(bob);

    await expect(cometAsB.withdrawTo(alice.address, USUP.address, 1)).to.be.reverted;
  });

  it('reverts if withdraw is paused', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, configController, users: [alice, bob] } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 1);
    const cometAsB = comet.connect(bob);

    // Pause withdraw
    const configSigner = await ethers.getImpersonatedSigner(configController.address);
    await hre.network.provider.send("hardhat_setBalance", [
      configController.address,
      ethers.utils.hexValue(ethers.utils.parseEther("5")),
    ]);

    await wait(comet.connect(configSigner).pause(false, false, true, false, false));
    expect(await comet.isWithdrawPaused()).to.be.true;

    await expect(cometAsB.withdrawTo(alice.address, USDC.address, 1)).to.be.revertedWith("custom error 'Paused()'");
  });

  it('reverts if withdraw max for a collateral asset', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob] } = protocol;
    const { COMP } = tokens;

    await COMP.allocateTo(bob.address, 100e6);
    const cometAsB = comet.connect(bob);

    await expect(cometAsB.withdrawTo(alice.address, COMP.address, ethers.constants.MaxUint256)).to.be.revertedWith("custom error 'InvalidUInt128()'");
  });

  it('borrows to withdraw if necessary/possible', async () => {
    const { comet, tokens, users: [alice, bob] } = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { WETH, USDC } = tokens;

    await USDC.allocateTo(comet.address, 1e6);
    await comet.setCollateralBalance(alice.address, WETH.address, exp(1, 18));

    await comet.connect(alice).withdrawTo(bob.address, USDC.address, 1e6);

    expect(await baseBalanceOf(comet, alice.address)).to.eq(BigInt(-1e6));
    expect(await USDC.balanceOf(bob.address)).to.eq(1e6);
  });
});

describe('withdraw', function () {
  it('withdraws to sender by default', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [bob] } = protocol;
    const { USDC } = tokens;

    const _i0 = await USDC.allocateTo(comet.address, 100e6);
    const _i1 = await comet.setBasePrincipal(bob.address, 100e6);
    const cometAsB = comet.connect(bob);

    const q0 = await portfolio(protocol, bob.address);
    const _s0 = await wait(cometAsB.withdraw(USDC.address, 100e6));
    const q1 = await portfolio(protocol, bob.address);

    const events = getEvents(_s0);
    expectTransfer(events, comet.address, bob.address, BigInt(100e6));
    expectWithdraw(events, bob.address, bob.address, BigInt(100e6));

    expect(q0.internal).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q1.external).to.be.deep.equal({ USDC: exp(100, 6), COMP: 0n, WETH: 0n, WBTC: 0n });
  });

  it('reverts if withdraw is paused', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, configController, users: [bob] } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 100e6);
    const cometAsB = comet.connect(bob);

    // Pause withdraw  
    const configSigner = await ethers.getImpersonatedSigner(configController.address);
    await hre.network.provider.send("hardhat_setBalance", [
      configController.address,
      ethers.utils.hexValue(ethers.utils.parseEther("5")),
    ]);

    await wait(comet.connect(configSigner).pause(false, false, true, false, false));
    expect(await comet.isWithdrawPaused()).to.be.true;

    await expect(cometAsB.withdraw(USDC.address, 100e6)).to.be.revertedWith("custom error 'Paused()'");
  });

  it('reverts if withdraw amount is less than baseBorrowMin', async () => {
    const { comet, tokens, users: [alice] } = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { USDC } = tokens;

    await expect(
      comet.connect(alice).withdraw(USDC.address, exp(.5, 6))
    ).to.be.revertedWith("custom error 'BorrowTooSmall()'");
  });

  it('reverts if base withdraw amount is not collateralzed', async () => {
    const { comet, tokens, users: [alice] } = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { USDC } = tokens;

    await expect(
      comet.connect(alice).withdraw(USDC.address, exp(1, 6))
    ).to.be.revertedWith("custom error 'NotCollateralized()'");
  });

  it('reverts if collateral withdraw amount is not collateralized', async () => {
    const { comet, tokens, users: [alice] } = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { WETH } = tokens;

    const totalsCollateral = Object.assign({}, await comet.totalsCollateral(WETH.address), {
      totalSupplyAsset: exp(1, 18),
    });
    await wait(comet.setTotalsCollateral(WETH.address, totalsCollateral));

    // user has a borrow, but with collateral to cover
    await comet.setBasePrincipal(alice.address, -100e6);
    await comet.setCollateralBalance(alice.address, WETH.address, exp(1, 18));

    // reverts if withdraw would leave borrow uncollateralized
    await expect(
      comet.connect(alice).withdraw(WETH.address, exp(1, 18))
    ).to.be.revertedWith("custom error 'NotCollateralized()'");
  });

  describe.skip('reentrancy', function () {
    it('blocks malicious reentrant transferFrom', async () => {
      const { comet, tokens, users: [alice, bob] } = await makeProtocol({
        assets: {
          USDC: {
            decimals: 6
          },
          EVIL: {
            decimals: 6,
            initialPrice: 2,
            factory: await ethers.getContractFactory('EvilToken') as EvilToken__factory,
          }
        }
      });
      const { USDC, EVIL } = <{ USDC: FaucetToken, EVIL: EvilToken }>tokens;

      await USDC.allocateTo(comet.address, 100e6);

      const attack = Object.assign({}, await EVIL.getAttack(), {
        attackType: ReentryAttack.TransferFrom,
        destination: bob.address,
        asset: USDC.address,
        amount: 1e6
      });
      await EVIL.setAttack(attack);

      const totalsCollateral = Object.assign({}, await comet.totalsCollateral(EVIL.address), {
        totalSupplyAsset: 100e6,
      });
      await comet.setTotalsCollateral(EVIL.address, totalsCollateral);

      await comet.setCollateralBalance(alice.address, EVIL.address, exp(1, 6));

      // In callback, EVIL token calls transferFrom(alice.address, bob.address, 1e6)
      await expect(
        comet.connect(alice).withdraw(EVIL.address, 1e6)
      ).to.be.revertedWithCustomError(comet, 'ReentrantCallBlocked');

      // no USDC transferred
      expect(await USDC.balanceOf(comet.address)).to.eq(100e6);
      expect(await baseBalanceOf(comet, alice.address)).to.eq(0n);
      expect(await USDC.balanceOf(alice.address)).to.eq(0);
      expect(await baseBalanceOf(comet, bob.address)).to.eq(0n);
      expect(await USDC.balanceOf(bob.address)).to.eq(0);
    });

    it('blocks malicious reentrant withdrawFrom', async () => {
      const { comet, tokens, users: [alice, bob] } = await makeProtocol({
        assets: {
          USDC: {
            decimals: 6
          },
          EVIL: {
            decimals: 6,
            initialPrice: 2,
            factory: await ethers.getContractFactory('EvilToken') as EvilToken__factory,
          }
        }
      });
      const { USDC, EVIL } = <{ USDC: FaucetToken, EVIL: EvilToken }>tokens;

      await USDC.allocateTo(comet.address, 100e6);

      const attack = Object.assign({}, await EVIL.getAttack(), {
        attackType: ReentryAttack.WithdrawFrom,
        destination: bob.address,
        asset: USDC.address,
        amount: 1e6
      });
      await EVIL.setAttack(attack);

      const totalsCollateral = Object.assign({}, await comet.totalsCollateral(EVIL.address), {
        totalSupplyAsset: 100e6,
      });
      await comet.setTotalsCollateral(EVIL.address, totalsCollateral);

      await comet.setCollateralBalance(alice.address, EVIL.address, exp(1, 6));

      // in callback, EvilToken attempts to withdraw USDC to bob's address
      await expect(
        comet.connect(alice).withdraw(EVIL.address, 1e6)
      ).to.be.revertedWithCustomError(comet, 'ReentrantCallBlocked');

      // no USDC transferred
      expect(await USDC.balanceOf(comet.address)).to.eq(100e6);
      expect(await baseBalanceOf(comet, alice.address)).to.eq(0n);
      expect(await USDC.balanceOf(alice.address)).to.eq(0);
      expect(await baseBalanceOf(comet, bob.address)).to.eq(0n);
      expect(await USDC.balanceOf(bob.address)).to.eq(0);
    });
  });

});

describe('withdrawFrom', function () {
  it.skip('withdraws from src if specified and sender has permission', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob, charlie] } = protocol;
    const { COMP } = tokens;

    const _i0 = await COMP.allocateTo(comet.address, 7);
    const t0 = Object.assign({}, await comet.totalsCollateral(COMP.address), {
      totalSupplyAsset: 7,
    });
    const _b0 = await wait(comet.setTotalsCollateral(COMP.address, t0));

    const _i1 = await comet.setCollateralBalance(bob.address, COMP.address, 7);

    const cometAsB = comet.connect(bob);
    const cometAsC = comet.connect(charlie);
    const p0 = await portfolio(protocol, alice.address);
    const q0 = await portfolio(protocol, bob.address);
    const _s0 = await wait(cometAsC.withdrawFrom(bob.address, alice.address, COMP.address, 7));
    const p1 = await portfolio(protocol, alice.address);
    const q1 = await portfolio(protocol, bob.address);

    expect(p0.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q0.internal).to.be.deep.equal({ USDC: 0n, COMP: 7n, WETH: 0n, WBTC: 0n });
    expect(q0.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(p1.external).to.be.deep.equal({ USDC: 0n, COMP: 7n, WETH: 0n, WBTC: 0n });
    expect(q1.internal).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
    expect(q1.external).to.be.deep.equal({ USDC: 0n, COMP: 0n, WETH: 0n, WBTC: 0n });
  });

  it('reverts if src is specified and sender does not have permission', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, users: [alice, bob, charlie] } = protocol;
    const { COMP } = tokens;

    const cometAsC = comet.connect(charlie);

    await expect(cometAsC.withdrawFrom(bob.address, alice.address, COMP.address, 7))
      .to.be.revertedWith("custom error 'Unauthorized()'");
  });

  it('reverts if withdraw is paused', async () => {
    const protocol = await makeProtocol({
      base: 'USDC',
      storeFrontPriceFactor: exp(0.5, 18),
      targetPercent: 0.5,
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WETH: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        },
        WBTC: {
          initial: 1e7, decimals: 18, initialPrice: 1,
          liquidationFactor: exp(0.8, 18)
        }
      }
    });
    const { comet, tokens, configController, users: [alice, bob, charlie] } = protocol;
    const { COMP } = tokens;

    await COMP.allocateTo(comet.address, 7);
    const cometAsB = comet.connect(bob);
    const cometAsC = comet.connect(charlie);

    // Pause withdraw
    const configSigner = await ethers.getImpersonatedSigner(configController.address);
    await hre.network.provider.send("hardhat_setBalance", [
      configController.address,
      ethers.utils.hexValue(ethers.utils.parseEther("5")),
    ]);
    await wait(comet.connect(configSigner).pause(false, false, true, false, false));
    expect(await comet.isWithdrawPaused()).to.be.true;

    await expect(cometAsC.withdrawFrom(bob.address, alice.address, COMP.address, 7)).to.be.revertedWith("custom error 'Paused()'");
  });
});

// Helper utilities for flexible event matching (avoids depending on exact log ordering)
function getEvents(tx: any) {
  return (tx.receipt?.events || []).map((ev: any) => ({ name: ev.event, args: ev.args }));
}

function amountOf(ev: any): bigint | undefined {
  if (!ev || !ev.args) return undefined;
  // FaucetToken & Comet use `amount`, standard ERC20 uses `value`
  return ev.args.amount !== undefined
    ? BigInt(ev.args.amount)
    : ev.args.value !== undefined
      ? BigInt(ev.args.value)
      : undefined;
}

function expectTransfer(events: any[], from: string, to: string, amount: bigint) {
  const ev = events.find((e: any) => e.name === 'Transfer' && e.args.from === from && e.args.to === to && amountOf(e) === amount);
  expect(ev, 'expected Transfer event not found').to.not.be.undefined;
}

function expectNoBurn(events: any[], src: string) {
  const ev = events.find((e: any) => e.name === 'Transfer' && e.args.from === src && e.args.to === ethers.constants.AddressZero);
  expect(ev, 'unexpected burn Transfer event').to.be.undefined;
}

function expectBurn(events: any[], src: string, amount: bigint) {
  const ev = events.find((e: any) => e.name === 'Transfer' && e.args.from === src && e.args.to === ethers.constants.AddressZero && amountOf(e) === amount);
  expect(ev, 'expected burn Transfer event').to.not.be.undefined;
}

function expectWithdraw(events: any[], src: string, to: string, amount: bigint) {
  const ev = events.find(
    (e: any) =>
      e.name === 'Withdraw' &&
      e.args.src === src &&
      e.args.to === to &&
      BigInt(e.args.amount) === amount        // ← use e, not ev
  );
  expect(ev, 'expected Withdraw event not found').to.not.be.undefined;
}
