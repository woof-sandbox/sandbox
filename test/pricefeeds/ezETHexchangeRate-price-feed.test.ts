import {
  BalancerRateProviderTest,
  BalancerRateProviderTest__factory,
  EzETHExchangeRatePriceFeed,
  EzETHExchangeRatePriceFeed__factory,
  FaucetToken,
} from "../../build/types";
import { SnapshotRestorer, takeSnapshot, ethers, exp, makeMockERC20, expect, ZERO_ADDRESS } from "../helper/helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EzETHExchangeRatePriceFeed", function () {
  let snapshot: SnapshotRestorer;

  // Providers
  let balancerRateProviderTest: BalancerRateProviderTest;

  // Price feeds
  let priceFeed: EzETHExchangeRatePriceFeed;

  let token: FaucetToken;

  let factory: EzETHExchangeRatePriceFeed__factory;

  const DECIMALS = 18n;
  const DESCRIPTION = "EzETH Exchange Rate";
  const RATE_PROVIDER_RATE = exp(11, 17); // 1.1 ETH per ezETH

  before(async function () {
    token = await makeMockERC20({ name: "EzETH", symbol: "EZETH", decimals: 18 });

    factory = (await ethers.getContractFactory("EzETHExchangeRatePriceFeed")) as EzETHExchangeRatePriceFeed__factory;
    const BalancerRateProvider = (await ethers.getContractFactory("BalancerRateProviderTest")) as BalancerRateProviderTest__factory;

    // Providers
    balancerRateProviderTest = await BalancerRateProvider.deploy(RATE_PROVIDER_RATE);
    await balancerRateProviderTest.deployed();

    // Price feeds
    priceFeed = await factory.deploy(balancerRateProviderTest.address, DECIMALS, DESCRIPTION, token.address);
    await priceFeed.deployed();

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("constructor", function () {
    it("should deploy with the correct parameters", async function () {
      expect(await priceFeed.underlyingPriceFeed()).to.equal(balancerRateProviderTest.address);
      expect(await priceFeed.decimals()).to.equal(DECIMALS);
      expect(await priceFeed.description()).to.equal(DESCRIPTION);
      expect(await priceFeed.underlyingToken()).to.equal(token.address);
      expect(await priceFeed.version()).to.equal(1);
    });

    it("calculates rescale factor properly for 18 to 18 decimals (no scaling)", async function () {
      // With 18 decimals, rescaleFactor should be 10^(18-18) = 1
      const [, answer, , ,] = await priceFeed.latestRoundData();

      expect(answer).to.eq(RATE_PROVIDER_RATE); // No scaling
    });

    it("calculates rescale factor properly for 18 to 8 decimals", async function () {
      const eightDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 8, DESCRIPTION, token.address);
      await eightDecimalPriceFeed.deployed();

      const [, answer, , ,] = await eightDecimalPriceFeed.latestRoundData();
      const expectedAnswer = RATE_PROVIDER_RATE / 10n ** (18n - 8n);

      expect(answer).to.eq(expectedAnswer);
    });

    it("should revert if ezETHRateProvider is zero address", async function () {
      await expect(factory.deploy(ZERO_ADDRESS, DECIMALS, DESCRIPTION, token.address)).to.be.revertedWithCustomError(
        priceFeed,
        "ZeroAddress"
      );
    });

    it("should revert if underlyingToken is zero address", async function () {
      await expect(factory.deploy(balancerRateProviderTest.address, DECIMALS, DESCRIPTION, ZERO_ADDRESS)).to.be.revertedWithCustomError(
        priceFeed,
        "ZeroAddress"
      );
    });

    it("should revert if decimals is zero", async function () {
      await expect(factory.deploy(balancerRateProviderTest.address, 0, DESCRIPTION, token.address)).to.be.revertedWithCustomError(
        priceFeed,
        "BadDecimals"
      );
    });

    it("should revert if decimals > 18", async function () {
      await expect(factory.deploy(balancerRateProviderTest.address, 19, DESCRIPTION, token.address)).to.be.revertedWithCustomError(
        priceFeed,
        "BadDecimals"
      );
    });

    describe("different decimal configurations", function () {
      it("works with 6 decimals", async function () {
        const sixDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 6, DESCRIPTION, token.address);
        await sixDecimalPriceFeed.deployed();

        const [, answer, , ,] = await sixDecimalPriceFeed.latestRoundData();
        const expectedAnswer = RATE_PROVIDER_RATE / 10n ** (18n - 6n);

        expect(answer).to.eq(expectedAnswer);
        expect(await sixDecimalPriceFeed.decimals()).to.eq(6);
      });

      it("works with 8 decimals", async function () {
        const eightDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 8, DESCRIPTION, token.address);
        await eightDecimalPriceFeed.deployed();

        const [, answer, , ,] = await eightDecimalPriceFeed.latestRoundData();
        const expectedAnswer = RATE_PROVIDER_RATE / 10n ** (18n - 8n);

        expect(answer).to.eq(expectedAnswer);
        expect(await eightDecimalPriceFeed.decimals()).to.eq(8);
      });

      it("works with 12 decimals", async function () {
        const twelveDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 12, DESCRIPTION, token.address);
        await twelveDecimalPriceFeed.deployed();

        const [, answer, , ,] = await twelveDecimalPriceFeed.latestRoundData();
        const expectedAnswer = RATE_PROVIDER_RATE / 10n ** (18n - 12n);

        expect(answer).to.eq(expectedAnswer);
        expect(await twelveDecimalPriceFeed.decimals()).to.eq(12);
      });

      it("works with 1 decimal", async function () {
        const oneDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 1, DESCRIPTION, token.address);
        await oneDecimalPriceFeed.deployed();

        const [, answer, , ,] = await oneDecimalPriceFeed.latestRoundData();
        const expectedAnswer = RATE_PROVIDER_RATE / 10n ** (18n - 1n);

        expect(answer).to.eq(expectedAnswer);
        expect(await oneDecimalPriceFeed.decimals()).to.eq(1);
      });
    });
  });

  describe("latestRoundData", function () {
    it("should return roundId and answeredInRound with value 1", async function () {
      const data = await priceFeed.latestRoundData();

      expect(data.roundId).to.equal(1);
      expect(data.answeredInRound).to.equal(1);
    });

    it("should return the correct price with 18 decimals (no scaling)", async function () {
      const rate = await balancerRateProviderTest.getRate();
      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(rate);
    });

    it("should scale the price if decimals < 18", async function () {
      const newDecimals = 6n;

      const scaledPriceFeed = await factory.deploy(balancerRateProviderTest.address, newDecimals, DESCRIPTION, token.address);
      await scaledPriceFeed.deployed();

      const expectedPriceScale = 10n ** (18n - newDecimals);
      const data = await scaledPriceFeed.latestRoundData();

      expect(data.answer).to.equal(RATE_PROVIDER_RATE / expectedPriceScale);
    });

    it("should return the correct startedAt and updatedAt", async function () {
      const blockTimestamp = await time.latest();

      const data = await priceFeed.latestRoundData();

      expect(data.startedAt).to.equal(blockTimestamp);
      expect(data.updatedAt).to.equal(blockTimestamp);
    });

    it("handles different rate values correctly", async function () {
      const testRates = [
        exp(1, 18), // 1.0 ETH per ezETH
        exp(12, 17), // 1.2 ETH per ezETH
        exp(95, 16), // 0.95 ETH per ezETH
        exp(2, 18), // 2.0 ETH per ezETH
      ];

      for (const testRate of testRates) {
        await balancerRateProviderTest.setRate(testRate);

        const data = await priceFeed.latestRoundData();

        expect(data.answer).to.equal(testRate);
      }
    });

    it("handles very high rates", async function () {
      const highRate = exp(100000, 18); // 100000 ETH per ezETH
      await balancerRateProviderTest.setRate(highRate);

      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(highRate);
    });

    it("handles very small rates", async function () {
      const smallRate = exp(1, 8); // 0.00000001 ETH per ezETH
      await balancerRateProviderTest.setRate(smallRate);

      const data = await priceFeed.latestRoundData();

      expect(data.answer).to.equal(smallRate);
    });

    it("reverts if rate is zero", async function () {
      await balancerRateProviderTest.setRate(0);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("always returns same round data (1, 1)", async function () {
      const [roundId1, , , , answeredInRound1] = await priceFeed.latestRoundData();

      // Change rate and check again
      await balancerRateProviderTest.setRate(exp(2, 18));
      const [roundId2, , , , answeredInRound2] = await priceFeed.latestRoundData();

      expect(roundId1).to.eq(1);
      expect(answeredInRound1).to.eq(1);
      expect(roundId2).to.eq(1);
      expect(answeredInRound2).to.eq(1);
    });

    describe("different decimal outputs", function () {
      it("scales correctly for 8 decimal output", async function () {
        const eightDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 8, DESCRIPTION, token.address);
        await eightDecimalPriceFeed.deployed();

        const testRate = exp(123456789, 18); // Complex rate
        await balancerRateProviderTest.setRate(testRate);

        const data = await eightDecimalPriceFeed.latestRoundData();
        const expectedAnswer = testRate / 10n ** 10n; // 18 - 8 = 10

        expect(data.answer).to.equal(expectedAnswer);
      });

      it("scales correctly for 6 decimal output", async function () {
        const sixDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 6, DESCRIPTION, token.address);
        await sixDecimalPriceFeed.deployed();

        const testRate = exp(15, 17); // 1.5 ETH
        await balancerRateProviderTest.setRate(testRate);

        const data = await sixDecimalPriceFeed.latestRoundData();
        const expectedAnswer = testRate / 10n ** 12n; // 18 - 6 = 12

        expect(data.answer).to.equal(expectedAnswer);
      });

      it("handles rate that results in zero after scaling", async function () {
        const eightDecimalPriceFeed = await factory.deploy(balancerRateProviderTest.address, 8, DESCRIPTION, token.address);
        await eightDecimalPriceFeed.deployed();

        const verySmallRate = 1; // 1 wei
        await balancerRateProviderTest.setRate(verySmallRate);

        const data = await eightDecimalPriceFeed.latestRoundData();

        expect(data.answer).to.eq(0); // Should be 0 after scaling down
      });
    });
  });

  describe("signed256 function", function () {
    it("converts valid uint256 to int256", async function () {
      // We can test this indirectly by ensuring no revert with valid rates
      const validRate = exp(1, 18);
      await balancerRateProviderTest.setRate(validRate);

      await expect(priceFeed.latestRoundData()).to.not.be.reverted;
    });

    it("reverts when uint256 exceeds int256.max", async function () {
      // Set a rate that exceeds int256.max
      const maxInt256Plus1 = ethers.constants.MaxInt256.add(1); // MaxInt256 + 1
      await balancerRateProviderTest.setRate(maxInt256Plus1);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "InvalidInt256");
    });
  });
});
