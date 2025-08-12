import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeMockERC20, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  ERC4626RateProviderTest,
  ERC4626RateProviderTest__factory,
  FaucetToken,
  SimplePriceFeed,
  SimplePriceFeed__factory,
  PriceFeedWith4626Support,
  PriceFeedWith4626Support__factory,
} from "../../build/types";

describe("PriceFeedWith4626Support", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let PriceFeedWith4626SupportFactory: PriceFeedWith4626Support__factory;
  let SimplePriceFeedFactory: SimplePriceFeed__factory;
  let ERC4626RateProviderTestFactory: ERC4626RateProviderTest__factory;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  const DECIMALS = 8n;
  const DESCRIPTION = "ERC4626 Asset Price Feed";
  const UPDATE_TIME_LIMIT = time.duration.minutes(5);
  const FALLBACK_UPDATE_TIME_LIMIT = time.duration.minutes(10);

  let underlyingToken: FaucetToken;
  let priceFeed: PriceFeedWith4626Support;
  let rateProvider: ERC4626RateProviderTest;
  let underlyingPriceFeed: SimplePriceFeed;
  let fallbackPriceFeed: SimplePriceFeed;

  // Rate provider with 18 decimals
  const rateProviderRate = exp(11, 17); // 1.1 assets per share
  const rateProviderDecimals = 18n;

  // Underlying price feed (USD/underlying) - 8 decimals
  const underlyingPrice = exp(2000, 8); // $20.00
  const underlyingPriceDecimals = 8n;

  // Fallback price feed (USD/underlying) - 6 decimals
  const fallbackPrice = exp(1950, 6); // $19.50
  const fallbackPriceDecimals = 6n;

  before(async function () {
    [dao, attacker] = await ethers.getSigners();

    PriceFeedWith4626SupportFactory = (await ethers.getContractFactory("PriceFeedWith4626Support")) as PriceFeedWith4626Support__factory;
    SimplePriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
    ERC4626RateProviderTestFactory = (await ethers.getContractFactory("ERC4626RateProviderTest")) as ERC4626RateProviderTest__factory;

    underlyingToken = await makeMockERC20({
      name: "Underlying Token",
      symbol: "UNDERLYING",
      decimals: 18,
    });

    // Create rate provider
    rateProvider = await ERC4626RateProviderTestFactory.deploy(underlyingToken.address, "Rate Provider", "RP", rateProviderDecimals);
    await rateProvider.deployed();
    await rateProvider.setRate(rateProviderRate);

    // Create price feeds
    underlyingPriceFeed = await SimplePriceFeedFactory.deploy(underlyingPrice, underlyingPriceDecimals, underlyingToken.address);
    await underlyingPriceFeed.deployed();

    fallbackPriceFeed = await SimplePriceFeedFactory.deploy(fallbackPrice, fallbackPriceDecimals, underlyingToken.address);
    await fallbackPriceFeed.deployed();

    // Create main price feed
    priceFeed = await PriceFeedWith4626SupportFactory.deploy(
      dao.address,
      rateProvider.address,
      underlyingPriceFeed.address,
      fallbackPriceFeed.address,
      underlyingToken.address,
      UPDATE_TIME_LIMIT,
      FALLBACK_UPDATE_TIME_LIMIT,
      DECIMALS,
      DESCRIPTION
    );
    await priceFeed.deployed();

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", function () {
    it("sets all values properly", async function () {
      expect(await priceFeed.dao()).to.eq(dao.address);
      expect(await priceFeed.rateProvider()).to.eq(rateProvider.address);
      expect(await priceFeed.underlyingPriceFeed()).to.eq(underlyingPriceFeed.address);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(fallbackPriceFeed.address);
      expect(await priceFeed.underlyingToken()).to.eq(underlyingToken.address);
      expect(await priceFeed.updateTimeLimit()).to.eq(UPDATE_TIME_LIMIT);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
      expect(await priceFeed.decimals()).to.eq(DECIMALS);
      expect(await priceFeed.description()).to.eq(DESCRIPTION);
      expect(await priceFeed.version()).to.eq(1);
      expect(await priceFeed.priceFeedScale()).to.eq(10n ** DECIMALS);

      // Check combined scales
      const expectedCombinedScale = 10n ** (rateProviderDecimals + underlyingPriceDecimals);
      const expectedFallbackCombinedScale = 10n ** (rateProviderDecimals + fallbackPriceDecimals);
      expect(await priceFeed.combinedScale()).to.eq(expectedCombinedScale);
      expect(await priceFeed.fallbackCombinedScale()).to.eq(expectedFallbackCombinedScale);
    });

    it("reverts if dao is zero address", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          ZERO_ADDRESS,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if rate provider is zero address", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          ZERO_ADDRESS,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          ZERO_ADDRESS,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if underlying token is zero address", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          ZERO_ADDRESS,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("allows fallback price feed to be zero address", async function () {
      const priceFeedWithoutFallback = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider.address,
        underlyingPriceFeed.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        0,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallback.deployed();

      expect(await priceFeedWithoutFallback.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
      expect(await priceFeedWithoutFallback.fallbackUpdateTimeLimit()).to.eq(0);
      expect(await priceFeedWithoutFallback.fallbackUnderlyingDecimals()).to.eq(0);
      expect(await priceFeedWithoutFallback.fallbackCombinedScale()).to.eq(0);
    });

    it("reverts if update time limit is zero", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          0,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallback update time limit is zero when fallback is set", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          0,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("allows fallback update time limit to be zero when fallback is not set", async function () {
      const priceFeedWithoutFallback = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider.address,
        underlyingPriceFeed.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        0,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallback.deployed();

      expect(await priceFeedWithoutFallback.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          0,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if decimals is greater than 18", async function () {
      await expect(
        PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          19,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("works with different decimal configurations", async function () {
      const priceFeed6Decimals = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider.address,
        underlyingPriceFeed.address,
        fallbackPriceFeed.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        6,
        DESCRIPTION
      );
      await priceFeed6Decimals.deployed();

      expect(await priceFeed6Decimals.decimals()).to.eq(6);
      expect(await priceFeed6Decimals.priceFeedScale()).to.eq(10n ** 6n);
    });

    it("emits PriceFeedSet events during construction", async function () {
      expect(
        await PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      )
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(underlyingPriceFeed.address, UPDATE_TIME_LIMIT, true)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(fallbackPriceFeed.address, FALLBACK_UPDATE_TIME_LIMIT, false);
    });

    it("works with different rate provider decimals", async function () {
      const rateProvider6 = await ERC4626RateProviderTestFactory.deploy(underlyingToken.address, "Rate Provider 6", "RP6", 6);
      await rateProvider6.deployed();

      const priceFeedWithDifferentRate = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider6.address,
        underlyingPriceFeed.address,
        fallbackPriceFeed.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithDifferentRate.deployed();

      // Should calculate combined scale with 6 + 8 = 14 decimals
      const expectedCombinedScale = 10n ** (6n + underlyingPriceDecimals);
      expect(await priceFeedWithDifferentRate.combinedScale()).to.eq(expectedCombinedScale);
    });
  });

  describe("setPriceFeeds", function () {
    it("updates underlying price feed", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeedFactory.deploy(exp(2100, 8), 8n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      await priceFeed.setPriceFeeds(
        newUnderlyingPriceFeed.address,
        fallbackPriceFeed.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      expect(await priceFeed.underlyingPriceFeed()).to.eq(newUnderlyingPriceFeed.address);
    });

    it("updates fallback price feed", async function () {
      const newFallbackPriceFeed = await SimplePriceFeedFactory.deploy(exp(2000, 6), 6n, underlyingToken.address);
      await newFallbackPriceFeed.deployed();

      await priceFeed.setPriceFeeds(
        underlyingPriceFeed.address,
        newFallbackPriceFeed.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      expect(await priceFeed.fallbackPriceFeed()).to.eq(newFallbackPriceFeed.address);
    });

    it("updates update time limits", async function () {
      const newUpdateTimeLimit = time.duration.minutes(10);
      const newFallbackUpdateTimeLimit = time.duration.minutes(15);

      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, newUpdateTimeLimit, newFallbackUpdateTimeLimit);

      expect(await priceFeed.updateTimeLimit()).to.eq(newUpdateTimeLimit);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(newFallbackUpdateTimeLimit);
    });

    it("allows setting fallback to zero address", async function () {
      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, 0);

      expect(await priceFeed.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(0);
      expect(await priceFeed.fallbackUnderlyingDecimals()).to.eq(0);
      expect(await priceFeed.fallbackCombinedScale()).to.eq(0);
    });

    it("recalculates combined scales with different decimals", async function () {
      const priceFeed18 = await SimplePriceFeedFactory.deploy(exp(2000, 18), 18n, underlyingToken.address);
      await priceFeed18.deployed();

      const fallbackPriceFeed12 = await SimplePriceFeedFactory.deploy(exp(1950, 12), 12n, underlyingToken.address);
      await fallbackPriceFeed12.deployed();

      await priceFeed.setPriceFeeds(priceFeed18.address, fallbackPriceFeed12.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      // Should recalculate scales: 18 + 18 = 36 for primary, 18 + 12 = 30 for fallback
      expect(await priceFeed.combinedScale()).to.eq(10n ** (rateProviderDecimals + 18n));
      expect(await priceFeed.fallbackCombinedScale()).to.eq(10n ** (rateProviderDecimals + 12n));
    });

    it("emits PriceFeedSet events", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeedFactory.deploy(exp(2100, 8), 8n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      const newFallbackPriceFeed = await SimplePriceFeedFactory.deploy(exp(2050, 6), 6n, underlyingToken.address);
      await newFallbackPriceFeed.deployed();

      const tx = priceFeed.setPriceFeeds(
        newUnderlyingPriceFeed.address,
        newFallbackPriceFeed.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      await expect(tx)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(newUnderlyingPriceFeed.address, UPDATE_TIME_LIMIT, true)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(newFallbackPriceFeed.address, FALLBACK_UPDATE_TIME_LIMIT, false);
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        priceFeed.setPriceFeeds(ZERO_ADDRESS, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if update time limit is zero", async function () {
      await expect(
        priceFeed.setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, 0, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallback update time limit is zero when fallback is set", async function () {
      await expect(
        priceFeed.setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, 0)
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if caller is not authorized", async function () {
      await expect(
        priceFeed
          .connect(attacker)
          .setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "Unauthorized");
    });

    it("dao can call setPriceFeeds", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeedFactory.deploy(exp(2100, 8), 8n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      await expect(
        priceFeed
          .connect(dao)
          .setPriceFeeds(newUnderlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.not.be.reverted;
    });
  });

  describe("latestRoundData", function () {
    it("returns calculated price using primary price feed when valid", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, underlyingPrice, currentTime, currentTime, 1);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Expected calculation: (rate * price * priceFeedScale) / combinedScale
      const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
      const expectedAnswer = (rate * underlyingPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + underlyingPriceDecimals);

      expect(roundId).to.eq(1);
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(1);
    });

    it("uses fallback price feed when primary has zero price", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPrice, currentTime, currentTime, 2);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
      const expectedAnswer = (rate * fallbackPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + fallbackPriceDecimals);

      expect(roundId).to.eq(2);
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(2);
    });

    it("uses fallback price feed when primary has negative price", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, -1000, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPrice, currentTime, currentTime, 2);

      const [roundId, answer] = await priceFeed.latestRoundData();

      const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
      const expectedAnswer = (rate * fallbackPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + fallbackPriceDecimals);

      expect(roundId).to.eq(2);
      expect(answer).to.eq(expectedAnswer);
    });

    it("uses fallback price feed when primary is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT + 1;

      await underlyingPriceFeed.setRoundData(1, underlyingPrice, staleTime, staleTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPrice, currentTime, currentTime, 2);

      const [roundId, answer] = await priceFeed.latestRoundData();

      const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
      const expectedAnswer = (rate * fallbackPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + fallbackPriceDecimals);

      expect(roundId).to.eq(2);
      expect(answer).to.eq(expectedAnswer);
    });

    it("reverts when primary is invalid and no fallback is set", async function () {
      const priceFeedWithoutFallback = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider.address,
        underlyingPriceFeed.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        0,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallback.deployed();

      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);

      await expect(priceFeedWithoutFallback.latestRoundData()).to.be.revertedWithCustomError(priceFeedWithoutFallback, "PriceNotAvailable");
    });

    it("reverts when fallback price feed has zero price", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, 0, currentTime, currentTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback price feed has negative price", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, -1000, currentTime, currentTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback price feed is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - FALLBACK_UPDATE_TIME_LIMIT + 1;

      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPrice, staleTime, staleTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    describe("different rate provider scenarios", function () {
      it("handles different conversion rates", async function () {
        const testRates = [
          exp(1, 18), // 1.0 rate
          exp(15, 17), // 1.5 rate
          exp(5, 17), // 0.5 rate
          exp(2, 18), // 2.0 rate
        ];

        for (const testRate of testRates) {
          await rateProvider.setRate(testRate);

          const currentTime = await time.latest();
          await underlyingPriceFeed.setRoundData(1, underlyingPrice, currentTime, currentTime, 1);

          const [, answer] = await priceFeed.latestRoundData();

          const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
          const expectedAnswer = (rate * underlyingPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + underlyingPriceDecimals);

          expect(answer).to.eq(expectedAnswer);
        }
      });

      it("handles high conversion rates without overflow", async function () {
        const highRate = exp(1000, 18); // 1000x rate
        await rateProvider.setRate(highRate);

        const currentTime = await time.latest();
        await underlyingPriceFeed.setRoundData(1, underlyingPrice, currentTime, currentTime, 1);

        const [, answer] = await priceFeed.latestRoundData();

        const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
        const expectedAnswer = (rate * underlyingPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + underlyingPriceDecimals);

        expect(answer).to.eq(expectedAnswer);
      });

      it("handles very small conversion rates", async function () {
        const smallRate = exp(1, 15); // 0.001 rate
        await rateProvider.setRate(smallRate);

        const currentTime = await time.latest();
        await underlyingPriceFeed.setRoundData(1, underlyingPrice, currentTime, currentTime, 1);

        const [, answer] = await priceFeed.latestRoundData();

        const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
        const expectedAnswer = (rate * underlyingPrice * 10n ** DECIMALS) / 10n ** (rateProviderDecimals + underlyingPriceDecimals);

        expect(answer).to.eq(expectedAnswer);
      });
    });

    describe("different decimal configurations", function () {
      it("handles 6 decimal output", async function () {
        const priceFeed6 = await PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          6,
          DESCRIPTION
        );
        await priceFeed6.deployed();

        const currentTime = await time.latest();
        await underlyingPriceFeed.setRoundData(1, underlyingPrice, currentTime, currentTime, 1);

        const [, answer] = await priceFeed6.latestRoundData();

        await rateProvider.setRate(exp(1.1, 18));
        const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
        const expectedAnswer = (rate * underlyingPrice * 10n ** 6n) / 10n ** (rateProviderDecimals + underlyingPriceDecimals);

        expect(answer).to.eq(expectedAnswer);
      });

      it("handles 18 decimal output", async function () {
        const priceFeed18 = await PriceFeedWith4626SupportFactory.deploy(
          dao.address,
          rateProvider.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          18,
          DESCRIPTION
        );
        await priceFeed18.deployed();

        const currentTime = await time.latest();
        await underlyingPriceFeed.setRoundData(1, underlyingPrice, currentTime, currentTime, 1);

        const [, answer] = await priceFeed18.latestRoundData();

        await rateProvider.setRate(exp(1.1, 18));
        const rate = (await rateProvider.convertToAssets(10n ** rateProviderDecimals)).toBigInt();
        const expectedAnswer = (rate * underlyingPrice * 10n ** 18n) / 10n ** (rateProviderDecimals + underlyingPriceDecimals);

        expect(answer).to.eq(expectedAnswer);
      });
    });

    describe("edge cases", function () {
      it("handles round data propagation correctly", async function () {
        const currentTime = await time.latest();
        const testRoundId = 123;
        const testStartedAt = currentTime - 100;
        const testAnsweredInRound = 456;

        await underlyingPriceFeed.setRoundData(testRoundId, underlyingPrice, testStartedAt, currentTime, testAnsweredInRound);

        const [roundId, , startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

        expect(roundId).to.eq(testRoundId);
        expect(startedAt).to.eq(testStartedAt);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(testAnsweredInRound);
      });

      it("handles fallback round data propagation correctly", async function () {
        const currentTime = await time.latest();
        const fallbackRoundId = 789;
        const fallbackStartedAt = currentTime - 50;
        const fallbackAnsweredInRound = 999;

        await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
        await fallbackPriceFeed.setRoundData(fallbackRoundId, fallbackPrice, fallbackStartedAt, currentTime, fallbackAnsweredInRound);

        const [roundId, , startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

        expect(roundId).to.eq(fallbackRoundId);
        expect(startedAt).to.eq(fallbackStartedAt);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(fallbackAnsweredInRound);
      });
    });
  });

  describe("signed256 function", function () {
    it("converts valid uint256 to int256", async function () {
      // We can test this indirectly by ensuring no revert with valid decimals
      const validDecimalPriceFeed = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider.address,
        underlyingPriceFeed.address,
        fallbackPriceFeed.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        18,
        DESCRIPTION
      );
      await validDecimalPriceFeed.deployed();

      expect(await validDecimalPriceFeed.priceFeedScale()).to.eq(10n ** 18n);
    });

    it("should handle maximum valid decimals", async function () {
      const maxDecimalPriceFeed = await PriceFeedWith4626SupportFactory.deploy(
        dao.address,
        rateProvider.address,
        underlyingPriceFeed.address,
        fallbackPriceFeed.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        18,
        DESCRIPTION
      );
      await maxDecimalPriceFeed.deployed();

      expect(await maxDecimalPriceFeed.priceFeedScale()).to.eq(10n ** 18n);
    });
  });
});
