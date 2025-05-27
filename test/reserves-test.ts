import { expect, makeProtocol, setTotalsBasic } from './helper/helpers';

describe('getReserves', function () {
  async function netReserves(comet, seedReserves) {
    const raw = await comet.getReserves();
    return BigInt(raw.toString()) - BigInt(seedReserves);
  }

  it('calculates 0 reserves', async () => {
    const protocol = await makeProtocol({ base: 'USDC' });
    const { comet, tokens, seedReserves } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 100);

    await setTotalsBasic(comet, {
      baseSupplyIndex: 4e15,
      baseBorrowIndex: 3e15,
      totalSupplyBase: 25n,
      totalBorrowBase: 0n,
    });

    expect(await netReserves(comet, seedReserves)).to.equal(0n);
  });

  it('calculates positive reserves', async () => {
    const protocol = await makeProtocol({ base: 'USDC' });
    const { comet, tokens, seedReserves } = protocol;
    const { USDC } = tokens;

    await USDC.allocateTo(comet.address, 100);

    await setTotalsBasic(comet, {
      baseSupplyIndex: 2e15,
      baseBorrowIndex: 5e15,
      totalSupplyBase: 50n,
      totalBorrowBase: 10n,
    });

    expect(await netReserves(comet, seedReserves)).to.equal(50n);
  });

  it('calculates negative reserves', async () => {
    const protocol = await makeProtocol({ base: 'USDC' });
    const { comet, seedReserves } = protocol;

    await setTotalsBasic(comet, {
      baseSupplyIndex: 2e15,
      baseBorrowIndex: 3e15,
      totalSupplyBase: 50n,
      totalBorrowBase: 0n,
    });

    expect(await netReserves(comet, seedReserves)).to.equal(-100n);
  });
});
