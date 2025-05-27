import { ethers, expect, makeProtocol, exp, setTotalsBasic } from './helper/helpers';
import type { CometHarnessInterface } from '../build/types';
import type { FaucetToken, NonStandardFaucetFeeToken } from '../build/types';

describe('CometExtension', () => {
  let comet: CometHarnessInterface & {
    factorScale(): Promise<bigint>;
    priceScale(): Promise<bigint>;
    collateralBalanceOf(addr: string, asset: string): Promise<bigint>;
  };
  let user:            Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let tokens:          Record<string, FaucetToken | NonStandardFaucetFeeToken>;

  beforeEach(async () => {
    ({ comet, users: [user], tokens } = await makeProtocol());

    const [signer] = await ethers.getSigners(); 
    const extAbi = [
      'function factorScale() view returns (uint64)',
      'function priceScale()  view returns (uint64)',
    ];
    comet = new ethers.Contract(comet.address, [...comet.interface.fragments, ...extAbi], signer) as typeof comet;

    await setTotalsBasic(comet, { baseSupplyIndex: 2e15, baseBorrowIndex: 3e15 });
  });

  it('returns factor scale', async () => {
    expect(await comet.factorScale()).to.equal(exp(1, 18));
  });

  it('returns price scale', async () => {
    expect(await comet.priceScale()).to.equal(exp(1, 8));
  });

  it('returns collateralBalance (in units of the collateral asset)', async () => {
    const { WETH } = tokens;
    await comet.setCollateralBalance(user.address, WETH.address, exp(5, 18));
    expect(
      await comet.collateralBalanceOf(user.address, WETH.address)
    ).to.equal(exp(5, 18));
  });
});
