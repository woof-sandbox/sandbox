import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeMockERC20, time, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { FaucetToken, ScalingPriceFeed, ScalingPriceFeed__factory, SimplePriceFeed, SimplePriceFeed__factory } from "../../build/types";

describe("Scaling Price Feed", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let ScalingPriceFeedFactory: ScalingPriceFeed__factory;
  let SimplePriceFeed: SimplePriceFeed__factory;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  const DECIMALS = 8n;
  const DESCRIPTION = "Custom Scaling Price Feed with Description";
  const UPDATE_TIME_LIMIT = time.duration.minutes(2);
  const FALLBACK_UPDATE_TIME_LIMIT = time.duration.minutes(4);

  let underlyingToken: FaucetToken;
  let priceFeed: ScalingPriceFeed;
  let underlyingPriceFeed: SimplePriceFeed;
  let fallbackPriceFeed: SimplePriceFeed;

  // Underlying price feed
  const underlyingPriceFeedPrice = exp(3500, 18);
  const underlyingPriceFeedDecimals = 18n;

  // Fallback price feed
  const fallbackPriceFeedPrice = exp(3000, 8);
  const fallbackPriceFeedDecimals = 8n;

  before(async function () {
    [dao, attacker] = await ethers.getSigners();

    ScalingPriceFeedFactory = (await ethers.getContractFactory("ScalingPriceFeed")) as ScalingPriceFeed__factory;
    SimplePriceFeed = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;

    underlyingToken = await makeMockERC20({
      name: "Token",
      symbol: "TKN",
      decimals: 18,
    });

    underlyingPriceFeed = await SimplePriceFeed.deploy(underlyingPriceFeedPrice, underlyingPriceFeedDecimals, underlyingToken.address);
    await underlyingPriceFeed.deployed();

    fallbackPriceFeed = await SimplePriceFeed.deploy(fallbackPriceFeedPrice, fallbackPriceFeedDecimals, underlyingToken.address);
    await fallbackPriceFeed.deployed();

    priceFeed = await ScalingPriceFeedFactory.deploy(
      dao.address,
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
      expect(await priceFeed.underlyingPriceFeed()).to.eq(underlyingPriceFeed.address);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(fallbackPriceFeed.address);
      expect(await priceFeed.updateTimeLimit()).to.eq(UPDATE_TIME_LIMIT);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
      expect(await priceFeed.decimals()).to.eq(DECIMALS);
      expect(await priceFeed.description()).to.eq(DESCRIPTION);
      expect(await priceFeed.underlyingToken()).to.eq(underlyingToken.address);
      expect(await priceFeed.version()).to.eq(1);
    });

    it("sets rescale factors properly", async function () {
      const rescaleFactor = await priceFeed.rescaleFactor();
      const fallbackRescaleFactor = await priceFeed.fallbackRescaleFactor();

      const expectedRescaleFactor = 10n ** (underlyingPriceFeedDecimals - DECIMALS);
      const expectedFallbackRescaleFactor = 10n ** (fallbackPriceFeedDecimals - DECIMALS);

      expect(rescaleFactor).to.eq(expectedRescaleFactor);
      expect(fallbackRescaleFactor).to.eq(expectedFallbackRescaleFactor);
    });

    it("fallback rescale factor is 0 if fallback price feed is not set", async function () {
      const priceFeedWithoutFallback = await ScalingPriceFeedFactory.deploy(
        dao.address,
        underlyingPriceFeed.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallback.deployed();

      expect(await priceFeedWithoutFallback.fallbackRescaleFactor()).to.eq(0);
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        ScalingPriceFeedFactory.deploy(
          dao.address,
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
        ScalingPriceFeedFactory.deploy(
          dao.address,
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

    it("reverts if update time limit is zero", async function () {
      await expect(
        ScalingPriceFeedFactory.deploy(
          dao.address,
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

    it("reverts if fallback update time limit is zero and fallback price feed is set", async function () {
      await expect(
        ScalingPriceFeedFactory.deploy(
          dao.address,
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

    it("allows to set fallback update time limit to zero if fallback price feed is not set", async function () {
      const priceFeedWithoutFallback = await ScalingPriceFeedFactory.deploy(
        dao.address,
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

    it("allows to set fallback update time limit to zero if fallback price feed is not set", async function () {
      const priceFeedWithoutFallback = await ScalingPriceFeedFactory.deploy(
        dao.address,
        underlyingPriceFeed.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallback.deployed();

      expect(await priceFeedWithoutFallback.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        ScalingPriceFeedFactory.deploy(
          dao.address,
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
        ScalingPriceFeedFactory.deploy(
          dao.address,
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
  });

  describe("setPriceFeeds", function () {
    it("updates price feeds and rescale factors", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeed.deploy(exp(4000, 18), 18n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      const newFallbackPriceFeed = await SimplePriceFeed.deploy(exp(3500, 8), 8n, underlyingToken.address);
      await newFallbackPriceFeed.deployed();

      await priceFeed.setPriceFeeds(
        newUnderlyingPriceFeed.address,
        newFallbackPriceFeed.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      expect(await priceFeed.underlyingPriceFeed()).to.eq(newUnderlyingPriceFeed.address);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(newFallbackPriceFeed.address);

      const expectedRescaleFactor = 10n ** (18n - DECIMALS);
      const expectedFallbackRescaleFactor = 10n ** (8n - DECIMALS);

      expect(await priceFeed.rescaleFactor()).to.eq(expectedRescaleFactor);
      expect(await priceFeed.fallbackRescaleFactor()).to.eq(expectedFallbackRescaleFactor);
    });

    it("updates update time limits", async function () {
      const newUpdateTimeLimit = time.duration.minutes(3);
      const newFallbackUpdateTimeLimit = time.duration.minutes(6);

      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, newUpdateTimeLimit, newFallbackUpdateTimeLimit);

      expect(await priceFeed.updateTimeLimit()).to.eq(newUpdateTimeLimit);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(newFallbackUpdateTimeLimit);
    });

    it('emits event "PriceFeedsUpdated" with new price feeds', async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeed.deploy(exp(4000, 18), 18n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      const newFallbackPriceFeed = await SimplePriceFeed.deploy(exp(3500, 8), 8n, underlyingToken.address);
      await newFallbackPriceFeed.deployed();

      await expect(
        priceFeed.setPriceFeeds(newUnderlyingPriceFeed.address, newFallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      )
        .to.emit(priceFeed, "PriceFeedsUpdated")
        .withArgs(newUnderlyingPriceFeed.address, newFallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);
    });

    it("sets fallback rescale factor to zero if fallback price feed is not set", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeed.deploy(exp(4000, 18), 18n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      const tx = await priceFeed.setPriceFeeds(newUnderlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);
      await expect(tx)
        .to.emit(priceFeed, "PriceFeedsUpdated")
        .withArgs(newUnderlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      expect(await priceFeed.fallbackRescaleFactor()).to.eq(0);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
    });

    it("revert if underlying price feed is zero address", async function () {
      await expect(
        priceFeed.setPriceFeeds(ZERO_ADDRESS, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if caller is not authorized", async function () {
      await expect(
        priceFeed
          .connect(attacker)
          .setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "Unauthorized");
    });

    it("reverts if update time limit is zero", async function () {
      await expect(
        priceFeed.setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, 0, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallback update time limit is zero and fallback price feed is set", async function () {
      await expect(
        priceFeed.setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, 0)
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("allows to set fallback update time limit to zero if fallback price feed is not set", async function () {
      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, 0);

      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("allows to set fallback update time limit to nonzero if fallback price feed is not set", async function () {
      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
    });
  });

  describe("latestRoundData", function () {
    it("returns scaled price from underlying price feed when price is valid and within time limit", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, currentTime, currentTime, 1);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(1);
      expect(answer).to.eq(underlyingPriceFeedPrice / 10n ** (underlyingPriceFeedDecimals - DECIMALS));
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(1);
    });

    it("returns scaled price from fallback price feed when underlying price is zero", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPriceFeedPrice, currentTime, currentTime, 2);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(answer).to.eq(fallbackPriceFeedPrice / 10n ** (fallbackPriceFeedDecimals - DECIMALS));
      expect(roundId).to.eq(2);
      expect(answeredInRound).to.eq(2);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
    });

    it("returns scaled price from fallback price feed when underlying price is negative", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, -1000, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(3, fallbackPriceFeedPrice, currentTime, currentTime, 3);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(answer).to.eq(fallbackPriceFeedPrice / 10n ** (fallbackPriceFeedDecimals - DECIMALS));
      expect(roundId).to.eq(3);
      expect(answeredInRound).to.eq(3);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
    });

    it("returns scaled price from fallback price feed when underlying price is stale", async function () {
      const currentTime = await time.latest();
      await fallbackPriceFeed.setRoundData(4, fallbackPriceFeedPrice, currentTime, currentTime, 4);

      const staleTime = (await time.latest()) - UPDATE_TIME_LIMIT;
      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, staleTime, staleTime, 1);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(answer).to.eq(fallbackPriceFeedPrice / 10n ** (fallbackPriceFeedDecimals - DECIMALS));
      expect(roundId).to.eq(4);
      expect(answeredInRound).to.eq(4);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
    });

    it("reverts with PriceNotAvailable when fallback price feed is not set and underlying price is invalid", async function () {
      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts with PriceNotAvailable when fallback price feed is not set and underlying price is stale", async function () {
      await priceFeed.setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      const staleTime = (await time.latest()) - UPDATE_TIME_LIMIT - 1;
      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, staleTime, staleTime, 1);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts with PriceNotAvailable when both underlying and fallback prices are zero", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, 0, currentTime, currentTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts with PriceNotAvailable when both underlying and fallback prices are negative", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, -1000, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, -2000, currentTime, currentTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts with PriceNotAvailable when underlying price is stale and fallback price is zero", async function () {
      const currentTime = await time.latest();
      await fallbackPriceFeed.setRoundData(2, 0, currentTime, currentTime, 2);

      const staleTime = (await time.latest()) - UPDATE_TIME_LIMIT;
      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, staleTime, staleTime, 1);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts with PriceNotAvailable when underlying price is stale and fallback price is also stale", async function () {
      const underlyingStaleTime = (await time.latest()) - UPDATE_TIME_LIMIT - 1;
      const fallbackStaleTime = (await time.latest()) - FALLBACK_UPDATE_TIME_LIMIT - 1;

      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, underlyingStaleTime, underlyingStaleTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPriceFeedPrice, fallbackStaleTime, fallbackStaleTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("correctly scales up price when underlying decimals are less than target decimals", async function () {
      const lowDecimalsPriceFeed = await SimplePriceFeed.deploy(exp(3500, 6), 6n, underlyingToken.address);
      await lowDecimalsPriceFeed.deployed();

      const scalingPriceFeed = await ScalingPriceFeedFactory.deploy(
        dao.address,
        lowDecimalsPriceFeed.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        DECIMALS,
        DESCRIPTION
      );
      await scalingPriceFeed.deployed();

      const currentTime = await time.latest();
      await lowDecimalsPriceFeed.setRoundData(5, exp(3500, 6), currentTime, currentTime, 5);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await scalingPriceFeed.latestRoundData();

      // Price should be scaled up by 10^(8-6) = 100
      expect(answer).to.eq(exp(3500, 8));
      expect(roundId).to.eq(5);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(5);
    });

    it("correctly scales down price when underlying decimals are greater than target decimals", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(6, underlyingPriceFeedPrice, currentTime, currentTime, 6);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Price should be scaled down by 10^(18-8) = 10^10
      expect(answer).to.eq(underlyingPriceFeedPrice / 10n ** 10n);
      expect(roundId).to.eq(6);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(6);
    });

    it("returns correct round data from underlying price feed", async function () {
      const currentTime = await time.latest();
      const testRoundId = 7;
      const testAnsweredInRound = 7;

      await underlyingPriceFeed.setRoundData(testRoundId, underlyingPriceFeedPrice, currentTime - 10, currentTime, testAnsweredInRound);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(testRoundId);
      expect(startedAt).to.eq(currentTime - 10);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(testAnsweredInRound);
      expect(updatedAt).to.be.lte(await time.latest());
      expect(answer).to.eq(underlyingPriceFeedPrice / 10n ** (underlyingPriceFeedDecimals - DECIMALS));
    });

    it("returns correct round data from fallback price feed when underlying fails", async function () {
      const currentTime = await time.latest();
      const fallbackRoundId = 8;
      const fallbackAnsweredInRound = 8;

      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(fallbackRoundId, fallbackPriceFeedPrice, currentTime - 5, currentTime, fallbackAnsweredInRound);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(fallbackRoundId);
      expect(startedAt).to.eq(currentTime - 5);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(fallbackAnsweredInRound);
      expect(updatedAt).to.be.lte(await time.latest());
      expect(answer).to.eq(fallbackPriceFeedPrice / 10n ** (fallbackPriceFeedDecimals - DECIMALS));
    });

    it("uses fallback when underlying updatedAt is zero (invalid timestamp)", async function () {
      const currentTime = await time.latest();

      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, currentTime, 0, 1);
      await fallbackPriceFeed.setRoundData(9, fallbackPriceFeedPrice, currentTime, currentTime, 9);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(answer).to.eq(fallbackPriceFeedPrice / 10n ** (fallbackPriceFeedDecimals - DECIMALS));
      expect(roundId).to.eq(9);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(9);
    });

    it("handles edge case when fallback price is exactly at staleness threshold", async function () {
      const currentTime = await time.latest();
      const exactThresholdTime = currentTime - FALLBACK_UPDATE_TIME_LIMIT + 2;

      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(10, fallbackPriceFeedPrice, exactThresholdTime, exactThresholdTime, 10);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(answer).to.eq(fallbackPriceFeedPrice / 10n ** (fallbackPriceFeedDecimals - DECIMALS));
      expect(roundId).to.eq(10);
      expect(startedAt).to.eq(exactThresholdTime);
      expect(updatedAt).to.eq(exactThresholdTime);
      expect(answeredInRound).to.eq(10);
    });
  });
});
