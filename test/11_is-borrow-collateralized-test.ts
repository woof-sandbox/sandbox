import { expect, exp, makeProtocol } from './helper/helpers';

describe('11. isBorrowCollateralized', function () {
  it('defaults to true', async () => {
    const protocol = await makeProtocol({ base: 'USDC' });
    const {
      comet,
      users: [alice],
    } = protocol;

    expect(await comet.isBorrowCollateralized(alice.address)).to.be.true;
  });

  it('is true when user is owed principal', async () => {
    const {
      comet,
      users: [alice],
    } = await makeProtocol({ base: 'USDC' });
    await comet.setBasePrincipal(alice.address, 1_000_000);

    expect(await comet.isBorrowCollateralized(alice.address)).to.be.true;
  });

  it('is false when user owes principal', async () => {
    const {
      comet,
      users: [alice],
    } = await makeProtocol({ base: 'USDC' });

    await comet.setBasePrincipal(alice.address, -1_000_000);

    expect(await comet.isBorrowCollateralized(alice.address)).to.be.false;
  });

  it('is true when value of collateral is greater than principal owed', async () => {
    const {
      comet,
      tokens,
      users: [alice],
    } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
          borrowCF: exp(0.9, 18),
          liquidateCF: exp(1, 18),
          liquidationFactor: exp(1, 18),
          minBorrowCF: exp(0.8, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(0.9, 18),
          maxLiquidateCF: exp(1, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    await COMP.allocateTo(alice.address, exp(1.2, 18));
    await COMP.connect(alice).approve(comet.address, exp(1.2, 18));
    await comet.connect(alice).supply(COMP.address, exp(1.2, 18));

    await comet.setBasePrincipal(alice.address, -exp(1, 6));

    expect(await comet.isBorrowCollateralized(alice.address)).to.be.true;
  });

  it('takes borrow collateral factor into account when valuing collateral', async () => {
    const {
      comet,
      tokens,
      users: [alice],
    } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
          borrowCF: exp(0.9, 18),
          liquidateCF: exp(1, 18),
          liquidationFactor: exp(1, 18),
          minBorrowCF: exp(0.8, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(0.9, 18),
          maxLiquidateCF: exp(1, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    await COMP.allocateTo(alice.address, exp(1, 18));
    await COMP.connect(alice).approve(comet.address, exp(1, 18));
    await comet.connect(alice).supply(COMP.address, exp(1, 18));

    await comet.setBasePrincipal(alice.address, -exp(1, 6));

    expect(await comet.isBorrowCollateralized(alice.address)).to.be.false;
  });

  it('changes when the underlying asset price changes', async () => {
    const {
      comet,
      tokens,
      users: [alice],
      priceFeeds,
    } = await makeProtocol({
      assets: {
        USDC: { initial: 1e6, decimals: 6, initialPrice: 1 },
        COMP: {
          initial: 1e7,
          decimals: 18,
          initialPrice: 1,
          borrowCF: exp(0.2, 18),
          liquidateCF: exp(1, 18),
          liquidationFactor: exp(1, 18),
          minBorrowCF: exp(0.2, 18),
          maxBorrowCF: exp(1, 18),
          minLiquidateCF: exp(0.9, 18),
          maxLiquidateCF: exp(1, 18),
          supplyCap: exp(1_000_000, 18),
        },
      },
    });
    const { COMP } = tokens;

    await COMP.allocateTo(alice.address, exp(5, 18));
    await COMP.connect(alice).approve(comet.address, exp(5, 18));
    await comet.connect(alice).supply(COMP.address, exp(5, 18));

    await comet.setBasePrincipal(alice.address, -exp(1, 6));
    expect(await comet.isBorrowCollateralized(alice.address)).to.be.true;

    await priceFeeds.COMP.setRoundData(0, exp(0.5, 8), 0, 0, 0);
    expect(await comet.isBorrowCollateralized(alice.address)).to.be.false;
  });
});
