import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  BalancerRateProviderTest,
  BalancerRateProviderTest__factory,
  EzETHExchangeRatePriceFeed,
  EzETHExchangeRatePriceFeed__factory,
  FaucetToken,
} from "../../build/types";
import { SnapshotRestorer, takeSnapshot, ethers, exp, makeToken, expect } from "../helper/helpers";

describe.only("EzETHExchangeRatePriceFeed", function () {
  let snapshot: SnapshotRestorer;

  // Providers
  let balancerRateProviderTest: BalancerRateProviderTest;
  let fallBackBalancerRateProviderTest: BalancerRateProviderTest;

  // Price feeds
  let priceFeed: EzETHExchangeRatePriceFeed;

  let token: FaucetToken;
  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  let factory: EzETHExchangeRatePriceFeed__factory;

  before(async function () {
    [owner, dao, attacker] = await ethers.getSigners();
    token = await makeToken({ name: "EzETH", symbol: "EZETH", decimals: 18 });

    factory = (await ethers.getContractFactory("EzETHExchangeRatePriceFeed")) as EzETHExchangeRatePriceFeed__factory;
    const BalancerRateProvider = (await ethers.getContractFactory("BalancerRateProviderTest")) as BalancerRateProviderTest__factory;

    // Providers
    balancerRateProviderTest = await BalancerRateProvider.deploy(exp(1, 18));
    fallBackBalancerRateProviderTest = await BalancerRateProvider.deploy(exp(2, 18));

    // Price feeds
    priceFeed = await factory.deploy(
      balancerRateProviderTest.address,
      fallBackBalancerRateProviderTest.address,
      18,
      "EzETH",
      token.address,
      owner.address,
      dao.address
    );

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("constructor", function () {
    it("should deploy with the correct parameters", async function () {
      expect(await priceFeed.underlyingPriceFeed()).to.equal(balancerRateProviderTest.address);
      expect(await priceFeed.fallbackPriceFeed()).to.equal(fallBackBalancerRateProviderTest.address);
      expect(await priceFeed.decimals()).to.equal(18);
      expect(await priceFeed.description()).to.equal("EzETH");
      expect(await priceFeed.underlyingToken()).to.equal(token.address);
      expect(await priceFeed.owner()).to.equal(owner.address);
      expect(await priceFeed.dao()).to.equal(dao.address);
    });

    it("should revert if ezETHRateProvider = address(0)", async function () {
      await expect(
        factory.deploy(
          ethers.constants.AddressZero,
          fallBackBalancerRateProviderTest.address,
          18,
          "EzETH",
          token.address,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("should revert if decimals > 18", async function () {
      await expect(
        factory.deploy(
          balancerRateProviderTest.address,
          fallBackBalancerRateProviderTest.address,
          19,
          "EzETH",
          token.address,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });
  });

  describe("setPriceFeed", function () {
    it("allow to set new price feeds", async function () {
      const newUnderlyingPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await priceFeed.connect(owner).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed);

      expect(await priceFeed.underlyingPriceFeed()).to.equal(newUnderlyingPriceFeed);
      expect(await priceFeed.fallbackPriceFeed()).to.equal(newFallbackPriceFeed);
    });

    it("fallbackPriceFeed can be zero address", async function () {
      const newUnderlyingPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.constants.AddressZero;

      await priceFeed.connect(owner).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed);

      expect(await priceFeed.underlyingPriceFeed()).to.equal(newUnderlyingPriceFeed);
      expect(await priceFeed.fallbackPriceFeed()).to.equal(newFallbackPriceFeed);
    });

    it("reverts if underlyingPriceFeed is zero address", async function () {
      const newUnderlyingPriceFeed = ethers.constants.AddressZero;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await expect(priceFeed.connect(owner).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.be.revertedWithCustomError(
        priceFeed,
        "ZeroAddress"
      );
    });

    it("should revert if caller is not authorized", async function () {
      const newUnderlyingPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await expect(priceFeed.connect(attacker).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.be.revertedWithCustomError(
        priceFeed,
        "Unauthorized"
      );
    });

    it("dao can do it, owner can do it", async function () {
      const newUnderlyingPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      expect(await priceFeed.connect(dao).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.not.be.reverted;

      expect(await priceFeed.connect(owner).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.not.be.reverted;
    });
  });

  describe("version getter", function () {
    it("should return the correct version", async function () {
      expect(await priceFeed.version()).to.equal("1");
    });
  });

  describe("latestRoundData", function () {
    it("should return roundId and answeredInRound  with value 1", async function () {
      const data = await priceFeed.latestRoundData();

      expect(data.roundId).to.equal(1);
      expect(data.answeredInRound).to.equal(1);
    });

    it("should return the correct price", async function () {
      const rate = await balancerRateProviderTest.getRate();
      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(rate);
    });

    it("should scale the price if decimals < 18", async function () {
      const newDecimals = 6n;

      const priceFeed = await factory.deploy(
        balancerRateProviderTest.address,
        fallBackBalancerRateProviderTest.address,
        newDecimals,
        "EzETH",
        token.address,
        owner.address,
        dao.address
      );

      const expectedPriceScale = 10n ** (18n - newDecimals);

      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(exp(1, 18) / expectedPriceScale);
    });

    it("should return the correct startedAt and updatedAt", async function () {
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;

      const data = await priceFeed.latestRoundData();

      expect(data.startedAt).to.equal(timestamp);
      expect(data.updatedAt).to.equal(timestamp);
    });

    it("if rate = 0, should get price from fallback provider", async function () {
      await balancerRateProviderTest.setRate(0);
      const rate = await fallBackBalancerRateProviderTest.getRate();
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;

      // check that providers return different rates
      expect(await balancerRateProviderTest.getRate()).to.not.equal(rate);

      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(rate);
      expect(data.answeredInRound).to.equal(1);
      expect(data.roundId).to.equal(1);
      expect(data.startedAt).to.equal(timestamp);
      expect(data.updatedAt).to.equal(timestamp);
    });

    it("if rate > 1e36, should get price from fallback provider", async function () {
      await balancerRateProviderTest.setRate(exp(2, 36));
      const rate = await fallBackBalancerRateProviderTest.getRate();
      const timestamp = (await ethers.provider.getBlock("latest")).timestamp;

      // check that providers return different rates
      expect(await balancerRateProviderTest.getRate()).to.not.equal(rate);

      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(rate);
      expect(data.answeredInRound).to.equal(1);
      expect(data.roundId).to.equal(1);
      expect(data.startedAt).to.equal(timestamp);
      expect(data.updatedAt).to.equal(timestamp);
    });
  });
});
