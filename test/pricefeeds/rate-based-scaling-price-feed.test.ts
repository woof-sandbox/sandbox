import { ethers, exp, expect, makeMockERC20, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  FaucetToken,
  RateBasedScalingPriceFeed,
  RateBasedScalingPriceFeed__factory,
  BalancerRateProviderTest,
  BalancerRateProviderTest__factory,
} from "../../build/types";

describe("Rate Based Scaling Price Feed", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let RateBasedScalingPriceFeedFactory: RateBasedScalingPriceFeed__factory;
  let BalancerRateProviderTestFactory: BalancerRateProviderTest__factory;

  const DECIMALS = 8n;
  const UNDERLYING_DECIMALS = 18n;
  const DESCRIPTION = "Rate Based Scaling Price Feed";

  let underlyingToken: FaucetToken;
  let priceFeed: RateBasedScalingPriceFeed;
  let rateProvider: BalancerRateProviderTest;

  // Rate provider rate (18 decimals)
  const rateProviderRate = exp(11, 17); // 1.1 rate
  const rateProviderDecimals = 18n;

  before(async function () {
    RateBasedScalingPriceFeedFactory = (await ethers.getContractFactory("RateBasedScalingPriceFeed")) as RateBasedScalingPriceFeed__factory;
    BalancerRateProviderTestFactory = (await ethers.getContractFactory("BalancerRateProviderTest")) as BalancerRateProviderTest__factory;

    underlyingToken = await makeMockERC20({
      name: "Test Token",
      symbol: "TEST",
      decimals: 18,
    });

    rateProvider = await BalancerRateProviderTestFactory.deploy(rateProviderRate);
    await rateProvider.deployed();

    priceFeed = await RateBasedScalingPriceFeedFactory.deploy(
      rateProvider.address,
      underlyingToken.address,
      UNDERLYING_DECIMALS,
      DECIMALS,
      DESCRIPTION
    );
    await priceFeed.deployed();

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", function () {
    it("sets all values properly", async function () {
      expect(await priceFeed.underlyingPriceFeed()).to.eq(rateProvider.address);
      expect(await priceFeed.decimals()).to.eq(DECIMALS);
      expect(await priceFeed.description()).to.eq(DESCRIPTION);
      expect(await priceFeed.underlyingToken()).to.eq(underlyingToken.address);
      expect(await priceFeed.version()).to.eq(1);
    });

    it("calculates rescale factor properly for downscaling (18 to 8 decimals)", async function () {
      // rescaleFactor should be 10^(18-8) = 10^10 for downscaling
      // We can test this indirectly through latestRoundData
      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = rateProviderRate / 10n ** (rateProviderDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("calculates rescale factor properly for upscaling (6 to 8 decimals)", async function () {
      const smallDecimalRate = exp(11, 5); // 1.1 with 6 decimals
      const smallDecimalRateProvider = await BalancerRateProviderTestFactory.deploy(smallDecimalRate);
      await smallDecimalRateProvider.deployed();

      const upscalingPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
        smallDecimalRateProvider.address,
        underlyingToken.address,
        6, // underlying decimals
        DECIMALS, // target decimals
        DESCRIPTION
      );
      await upscalingPriceFeed.deployed();

      const [, answer, , ,] = await upscalingPriceFeed.latestRoundData();
      const expectedAnswer = smallDecimalRate * 10n ** (DECIMALS - 6n);

      expect(answer).to.eq(expectedAnswer);
    });

    it("handles same decimals (no scaling)", async function () {
      const sameDecimalRate = exp(11, 7); // 1.1 with 8 decimals
      const sameDecimalRateProvider = await BalancerRateProviderTestFactory.deploy(sameDecimalRate);
      await sameDecimalRateProvider.deployed();

      const noScalingPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
        sameDecimalRateProvider.address,
        underlyingToken.address,
        DECIMALS, // same as target decimals
        DECIMALS,
        DESCRIPTION
      );
      await noScalingPriceFeed.deployed();

      const [, answer, , ,] = await noScalingPriceFeed.latestRoundData();

      expect(answer).to.eq(sameDecimalRate); // No scaling should occur
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        RateBasedScalingPriceFeedFactory.deploy(ZERO_ADDRESS, underlyingToken.address, UNDERLYING_DECIMALS, DECIMALS, DESCRIPTION)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if underlying token is zero address", async function () {
      await expect(
        RateBasedScalingPriceFeedFactory.deploy(rateProvider.address, ZERO_ADDRESS, UNDERLYING_DECIMALS, DECIMALS, DESCRIPTION)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        RateBasedScalingPriceFeedFactory.deploy(rateProvider.address, underlyingToken.address, UNDERLYING_DECIMALS, 0, DESCRIPTION)
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if decimals is greater than 18", async function () {
      await expect(
        RateBasedScalingPriceFeedFactory.deploy(rateProvider.address, underlyingToken.address, UNDERLYING_DECIMALS, 19, DESCRIPTION)
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if underlying decimals is zero", async function () {
      await expect(
        RateBasedScalingPriceFeedFactory.deploy(rateProvider.address, underlyingToken.address, 0, DECIMALS, DESCRIPTION)
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if underlying decimals is greater than 18", async function () {
      await expect(
        RateBasedScalingPriceFeedFactory.deploy(rateProvider.address, underlyingToken.address, 19, DECIMALS, DESCRIPTION)
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    describe("different decimal configurations", function () {
      it("works with 6 decimals output", async function () {
        const sixDecimalPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
          rateProvider.address,
          underlyingToken.address,
          UNDERLYING_DECIMALS,
          6,
          DESCRIPTION
        );
        await sixDecimalPriceFeed.deployed();

        const [, answer, , ,] = await sixDecimalPriceFeed.latestRoundData();
        const expectedAnswer = rateProviderRate / 10n ** (rateProviderDecimals - 6n);

        expect(answer).to.eq(expectedAnswer);
        expect(await sixDecimalPriceFeed.decimals()).to.eq(6);
      });

      it("works with 18 decimals output (no scaling)", async function () {
        const eighteenDecimalPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
          rateProvider.address,
          underlyingToken.address,
          UNDERLYING_DECIMALS,
          18,
          DESCRIPTION
        );
        await eighteenDecimalPriceFeed.deployed();

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        expect(answer).to.eq(rateProviderRate);
        expect(await eighteenDecimalPriceFeed.decimals()).to.eq(18);
      });

      it("works with upscaling from 6 to 18 decimals", async function () {
        const lowDecimalRate = exp(15, 5); // 1.5 with 6 decimals
        const lowDecimalRateProvider = await BalancerRateProviderTestFactory.deploy(lowDecimalRate);
        await lowDecimalRateProvider.deployed();

        const upscalingPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
          lowDecimalRateProvider.address,
          underlyingToken.address,
          6,
          18,
          DESCRIPTION
        );
        await upscalingPriceFeed.deployed();

        const [, answer, , ,] = await upscalingPriceFeed.latestRoundData();
        const expectedAnswer = lowDecimalRate * 10n ** 12n; // 18 - 6 = 12

        expect(answer).to.eq(expectedAnswer);
      });
    });
  });

  describe("latestRoundData", function () {
    it("returns scaled rate from rate provider when rate is valid", async function () {
      const timeNow = await time.latest();
      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(1);
      expect(answer).to.eq(rateProviderRate / 10n ** (rateProviderDecimals - DECIMALS));
      expect(startedAt).to.eq(timeNow);
      expect(updatedAt).to.eq(timeNow);
      expect(answeredInRound).to.eq(1);
    });

    it("returns current block timestamp for startedAt and updatedAt", async function () {
      const currentBlockTimestamp = await time.latest();

      // Mine a new block
      await time.increase(1);

      const [, , startedAt, updatedAt] = await priceFeed.latestRoundData();
      const newBlockTimestamp = await time.latest();

      expect(startedAt).to.eq(newBlockTimestamp);
      expect(updatedAt).to.eq(newBlockTimestamp);
      expect(startedAt).to.be.gt(currentBlockTimestamp);
    });

    it("scales rate correctly for different rate values", async function () {
      const newRate = exp(25, 17); // 2.5 rate
      await rateProvider.setRate(newRate);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = newRate / 10n ** (rateProviderDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("handles very high rates without overflow", async function () {
      const highRate = exp(1000, 18); // 1000 rate
      await rateProvider.setRate(highRate);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = highRate / 10n ** (rateProviderDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("handles very small rates correctly", async function () {
      const smallRate = exp(1, 9); // 0.000000001 rate
      await rateProvider.setRate(smallRate);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = smallRate / 10n ** (rateProviderDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("reverts when rate provider returns zero rate", async function () {
      await rateProvider.setRate(0);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("always returns same round data (1, 1)", async function () {
      const [roundId1, , , , answeredInRound1] = await priceFeed.latestRoundData();

      // Change rate and check again
      await rateProvider.setRate(exp(2, 18));
      const [roundId2, , , , answeredInRound2] = await priceFeed.latestRoundData();

      expect(roundId1).to.eq(1);
      expect(answeredInRound1).to.eq(1);
      expect(roundId2).to.eq(1);
      expect(answeredInRound2).to.eq(1);
    });

    describe("18 decimal price feed tests", function () {
      let eighteenDecimalPriceFeed: RateBasedScalingPriceFeed;

      beforeEach(async function () {
        eighteenDecimalPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
          rateProvider.address,
          underlyingToken.address,
          UNDERLYING_DECIMALS,
          18,
          DESCRIPTION
        );
        await eighteenDecimalPriceFeed.deployed();
      });

      it("returns unscaled rate when decimals match underlying decimals", async function () {
        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        // Should return the exact rate from provider without scaling
        expect(answer).to.eq(rateProviderRate);
      });

      it("handles different rates without scaling for 18 decimals", async function () {
        const testRates = [
          exp(1, 18), // 1.0 rate
          exp(12, 17), // 1.2 rate
          exp(95, 16), // 0.95 rate
          exp(2, 18), // 2.0 rate
        ];

        for (const testRate of testRates) {
          await rateProvider.setRate(testRate);

          const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

          // Should return exact rate without any scaling
          expect(answer).to.eq(testRate);
        }
      });

      it("handles very high rates with 18 decimals", async function () {
        const highRate = exp(1000000000, 18); // 1 billion rate
        await rateProvider.setRate(highRate);

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        expect(answer).to.eq(highRate);
      });

      it("handles very small rates with 18 decimals", async function () {
        const smallRate = 1; // 1 wei
        await rateProvider.setRate(smallRate);

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        expect(answer).to.eq(smallRate);
      });

      it("reverts when rate is zero with 18 decimals", async function () {
        await rateProvider.setRate(0);

        await expect(eighteenDecimalPriceFeed.latestRoundData()).to.be.revertedWithCustomError(
          eighteenDecimalPriceFeed,
          "PriceNotAvailable"
        );
      });
    });

    describe("8 decimal price feed tests", function () {
      it("correctly scales down from 18 to 8 decimals", async function () {
        const [, answer, , ,] = await priceFeed.latestRoundData();

        // Should scale down by 10^(18-8) = 10^10
        const expectedAnswer = rateProviderRate / 10n ** 10n;
        expect(answer).to.eq(expectedAnswer);
      });

      it("handles different rates with 8 decimal scaling", async function () {
        const testRate = exp(123456789, 18); // Complex rate
        await rateProvider.setRate(testRate);

        const [, answer, , ,] = await priceFeed.latestRoundData();
        const expectedAnswer = testRate / 10n ** 10n;

        expect(answer).to.eq(expectedAnswer);
      });

      it("handles rate that results in zero after scaling", async function () {
        const verySmallRate = 1; // 1 wei
        await rateProvider.setRate(verySmallRate);

        const [, answer, , ,] = await priceFeed.latestRoundData();

        expect(answer).to.eq(0); // Should be 0 after scaling down by 10^10
      });
    });
  });

  describe("signed256 function", function () {
    it("converts valid uint256 to int256", async function () {
      // We can test this indirectly by ensuring no revert with valid rates
      const validRate = exp(1, 18);
      await rateProvider.setRate(validRate);

      await expect(priceFeed.latestRoundData()).to.not.be.reverted;
    });

    it("reverts when uint256 exceeds int256.max", async function () {
      // Set a rate that exceeds int256.max
      const overflowRate = ethers.constants.MaxInt256.add(1); // 2^255 > int256.max
      await rateProvider.setRate(overflowRate);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "InvalidInt256");
    });

    it("handles maximum valid int256 value", async function () {
      const maxInt256 = ethers.constants.MaxInt256; // Maximum valid int256 value
      await rateProvider.setRate(maxInt256);

      await expect(priceFeed.latestRoundData()).to.not.be.reverted;
    });
  });

  describe("scalePrice function", function () {
    it("upscales price correctly", async function () {
      const lowDecimalRate = exp(15, 5); // 1.5 with 6 decimals
      const lowDecimalRateProvider = await BalancerRateProviderTestFactory.deploy(lowDecimalRate);
      await lowDecimalRateProvider.deployed();

      const upscalingPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
        lowDecimalRateProvider.address,
        underlyingToken.address,
        6, // underlying decimals
        DECIMALS, // target decimals (8)
        DESCRIPTION
      );
      await upscalingPriceFeed.deployed();

      const [, answer, , ,] = await upscalingPriceFeed.latestRoundData();
      const expectedAnswer = lowDecimalRate * 10n ** (DECIMALS - 6n); // multiply by 10^2 = 100

      expect(answer).to.eq(expectedAnswer);
    });

    it("downscales price correctly", async function () {
      // This is the default case (18 to 8 decimals)
      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = rateProviderRate / 10n ** (rateProviderDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("handles no scaling when decimals are equal", async function () {
      const sameDecimalRate = exp(2, 8);
      const sameDecimalRateProvider = await BalancerRateProviderTestFactory.deploy(sameDecimalRate);
      await sameDecimalRateProvider.deployed();

      const noScalingPriceFeed = await RateBasedScalingPriceFeedFactory.deploy(
        sameDecimalRateProvider.address,
        underlyingToken.address,
        DECIMALS, // same as target
        DECIMALS,
        DESCRIPTION
      );
      await noScalingPriceFeed.deployed();

      const [, answer, , ,] = await noScalingPriceFeed.latestRoundData();

      expect(answer).to.eq(sameDecimalRate); // No scaling
    });
  });
});
