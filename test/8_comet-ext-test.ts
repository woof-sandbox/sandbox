import { 
  ethers, 
  expect, 
  makeProtocol, 
  exp, 
  setTotalsBasic 
} from './helper/helpers';
import type { 
  CometHarnessInterface, 
  ConfigController, 
  SimplePriceFeed 
  } from '../build/types';
import type { 
  FaucetToken, 
  NonStandardFaucetFeeToken 
} from '../build/types';

describe('8. CometExtension', () => {
  let comet: CometHarnessInterface & {
    factorScale(): Promise<bigint>;
    priceScale(): Promise<bigint>;
    collateralBalanceOf(addr: string, asset: string): Promise<bigint>;
  };
  let user:            Awaited<ReturnType<typeof ethers.getSigners>>[number];
  let tokens:          Record<string, FaucetToken | NonStandardFaucetFeeToken>;

  beforeEach(async () => {
    ({ comet, users: [user], tokens} = await makeProtocol());

    const [signer] = await ethers.getSigners(); 
    const extAbi = [
      'function factorScale() view returns (uint64)',
      'function priceScale()  view returns (uint64)',
      'function getConfiguration() view returns(' +
      'tuple(' +
      'address configController,' +
      'address baseToken,' +
      'address baseTokenPriceFeed,' +
      'address extensionDelegate,' +
      'uint64 supplyKink,' +
      'uint64 supplyPerYearInterestRateSlopeLow,' +
      'uint64 supplyPerYearInterestRateSlopeHigh,' +
      'uint64 supplyPerYearInterestRateBase,' +
      'uint64 borrowKink,' +
      'uint64 borrowPerYearInterestRateSlopeLow,' +
      'uint64 borrowPerYearInterestRateSlopeHigh,' +
      'uint64 borrowPerYearInterestRateBase,' +
      'uint64 storeFrontPriceFactor,' +
      'uint64 trackingIndexScale,' +
      'uint64 baseTrackingSupplySpeed,' +
      'uint64 baseTrackingBorrowSpeed,' +
      'uint104 baseMinForRewards,' +
      'uint104 baseBorrowMin,' +
      'uint104 targetPercent,' +
      'uint104 seedReserves,' +
      'uint104 unlockTimestamp,' +
      'tuple(address collateralToken, address priceFeed, uint256 borrowCollateralFactor, uint256 liquidateCollateralFactor, uint256 liquidationFactor, uint256 supplyCap, uint256 scale)[] assetConfigs' +
      '))'
    ];
    comet = new ethers.Contract(comet.address, [...comet.interface.fragments, ...extAbi], signer) as typeof comet;

    await setTotalsBasic(comet, { baseSupplyIndex: 2e15, baseBorrowIndex: 3e15 });
  });

  it('returns factor scale', async () => {
    expect(await comet.factorScale()).to.equal(exp(1, 18));
  });

  it('returns collateralBalance (in units of the collateral asset)', async () => {
    const { WETH } = tokens;
    await comet.setCollateralBalance(user.address, WETH.address, exp(5, 18));
    expect(
      await comet.collateralBalanceOf(user.address, WETH.address)
    ).to.equal(exp(5, 18));
  });
});
