import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  BalancerRateProviderTest,
  BalancerRateProviderTest__factory,
  EzETHExchangeRatePriceFeed,
  EzETHExchangeRatePriceFeed__factory,
  FaucetToken,
  NonStandardFaucetFeeToken,
} from "../build/types";
import { SnapshotRestorer, takeSnapshot, ethers, exp, makeConfigController } from "./helper/helpers";

describe("21. Price Feeds Fallback", function () {
  let snapshot: SnapshotRestorer;

  // Providers
  let balancerRateProviderTest: BalancerRateProviderTest;
  let fallBackBalancerRateProviderTest: BalancerRateProviderTest;

  // Price feeds
  let ezETHExchangeRatePriceFeed: EzETHExchangeRatePriceFeed;

  let tokens: { [symbol: string]: FaucetToken | NonStandardFaucetFeeToken };
  let owner: SignerWithAddress;
  let dao: SignerWithAddress;

  before(async function () {
    ({ tokens, owner, dao } = await makeConfigController());
    const EzETHExchangeRatePriceFeed = (await ethers.getContractFactory(
      "EzETHExchangeRatePriceFeed"
    )) as EzETHExchangeRatePriceFeed__factory;
    const BalancerRateProvider = (await ethers.getContractFactory("BalancerRateProviderTest")) as BalancerRateProviderTest__factory;

    // Providers
    balancerRateProviderTest = await BalancerRateProvider.deploy(exp(1, 18));
    fallBackBalancerRateProviderTest = await BalancerRateProvider.deploy(exp(1, 18));

    // Price feeds
    ezETHExchangeRatePriceFeed = await EzETHExchangeRatePriceFeed.deploy(
      balancerRateProviderTest.address,
      fallBackBalancerRateProviderTest.address,
      18,
      "EzETH",
      tokens["COMP"].address,
      owner.address,
      dao.address
    );

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("EzETHExchangeRatePriceFeed", function () {
    it("test", async function () {
      await ezETHExchangeRatePriceFeed.dao();
    });
  });
});
