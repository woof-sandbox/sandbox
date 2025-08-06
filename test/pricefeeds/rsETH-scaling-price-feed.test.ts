import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeToken, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  FaucetToken,
  RsETHScalingPriceFeed,
  RsETHScalingPriceFeed__factory,
  ManagedLRTOracle,
  ManagedLRTOracle__factory,
} from "../../build/types";

describe.only("RsETH Scaling Price Feed", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let RsETHScalingPriceFeedFactory: RsETHScalingPriceFeed__factory;
  let ManagedLRTOracleFactory: ManagedLRTOracle__factory;

  const DECIMALS = 8n;
  const DESCRIPTION = "RsETH Price Feed";

  let underlyingToken: FaucetToken;
  let priceFeed: RsETHScalingPriceFeed;
  let kelpOracle: ManagedLRTOracle;

  // Kelp Oracle price (18 decimals)
  const kelpOraclePrice = exp(11, 17); // 1.1 ETH per rsETH
  const kelpOracleDecimals = 18n;

  before(async function () {
    RsETHScalingPriceFeedFactory = (await ethers.getContractFactory("RsETHScalingPriceFeed")) as RsETHScalingPriceFeed__factory;
    ManagedLRTOracleFactory = (await ethers.getContractFactory("ManagedLRTOracle")) as ManagedLRTOracle__factory;

    underlyingToken = await makeToken({
      name: "Restaked ETH",
      symbol: "rsETH",
      decimals: 18,
    });

    kelpOracle = await ManagedLRTOracleFactory.deploy(kelpOraclePrice);
    await kelpOracle.deployed();

    priceFeed = await RsETHScalingPriceFeedFactory.deploy(kelpOracle.address, DECIMALS, DESCRIPTION, underlyingToken.address);
    await priceFeed.deployed();

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", function () {
    it("sets all values properly", async function () {
      expect(await priceFeed.underlyingPriceFeed()).to.eq(kelpOracle.address);
      expect(await priceFeed.decimals()).to.eq(DECIMALS);
      expect(await priceFeed.description()).to.eq(DESCRIPTION);
      expect(await priceFeed.underlyingToken()).to.eq(underlyingToken.address);
      expect(await priceFeed.version()).to.eq(1);
    });

    it("calculates rescale factor properly for 18 to 8 decimals", async function () {
      const expectedRescaleFactor = 10n ** (kelpOracleDecimals - DECIMALS);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = kelpOraclePrice / expectedRescaleFactor;

      expect(answer).to.eq(expectedAnswer);
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        RsETHScalingPriceFeedFactory.deploy(ZERO_ADDRESS, DECIMALS, DESCRIPTION, underlyingToken.address)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if underlying token is zero address", async function () {
      await expect(
        RsETHScalingPriceFeedFactory.deploy(kelpOracle.address, DECIMALS, DESCRIPTION, ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        RsETHScalingPriceFeedFactory.deploy(kelpOracle.address, 0, DESCRIPTION, underlyingToken.address)
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if decimals is greater than 18", async function () {
      await expect(
        RsETHScalingPriceFeedFactory.deploy(kelpOracle.address, 19, DESCRIPTION, underlyingToken.address)
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    describe("different decimal configurations", function () {
      it("works with 6 decimals", async function () {
        const sixDecimalPriceFeed = await RsETHScalingPriceFeedFactory.deploy(kelpOracle.address, 6, DESCRIPTION, underlyingToken.address);
        await sixDecimalPriceFeed.deployed();

        const [, answer, , ,] = await sixDecimalPriceFeed.latestRoundData();
        const expectedAnswer = kelpOraclePrice / 10n ** (18n - 6n);

        expect(answer).to.eq(expectedAnswer);
        expect(await sixDecimalPriceFeed.decimals()).to.eq(6);
      });

      it("works with 18 decimals (no scaling)", async function () {
        const eighteenDecimalPriceFeed = await RsETHScalingPriceFeedFactory.deploy(
          kelpOracle.address,
          18,
          DESCRIPTION,
          underlyingToken.address
        );
        await eighteenDecimalPriceFeed.deployed();

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        expect(answer).to.eq(kelpOraclePrice);
        expect(await eighteenDecimalPriceFeed.decimals()).to.eq(18);
      });
    });
  });

  describe("latestRoundData", function () {
    it("returns scaled price from Kelp oracle when price is valid", async function () {
      const timeNow = await time.latest();
      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(1);
      expect(answer).to.eq(kelpOraclePrice / 10n ** (kelpOracleDecimals - DECIMALS));
      expect(startedAt).to.eq(timeNow);
      expect(updatedAt).to.eq(timeNow);
      expect(answeredInRound).to.eq(1);
    });

    it("returns correct timestamps", async function () {
      const blockTimestamp = await time.latest();
      const [, , startedAt, updatedAt] = await priceFeed.latestRoundData();

      expect(startedAt).to.eq(blockTimestamp);
      expect(updatedAt).to.eq(blockTimestamp);
    });

    it("scales price correctly for different oracle prices", async function () {
      const newPrice = exp(15, 17); // 1.5 ETH per rsETH
      await kelpOracle.setPrice(newPrice);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = newPrice / 10n ** (kelpOracleDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("handles very high prices without overflow", async function () {
      const highPrice = exp(1000, 18); // 1000 ETH per rsETH
      await kelpOracle.setPrice(highPrice);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = highPrice / 10n ** (kelpOracleDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("handles very small prices correctly", async function () {
      const smallPrice = exp(1, 9); // 0.000000001 ETH per rsETH
      await kelpOracle.setPrice(smallPrice);

      const [, answer, , ,] = await priceFeed.latestRoundData();
      const expectedAnswer = smallPrice / 10n ** (kelpOracleDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("reverts when oracle price is zero", async function () {
      await kelpOracle.setPrice(0);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("always returns same round data (1, 1)", async function () {
      const [roundId1, , , , answeredInRound1] = await priceFeed.latestRoundData();

      // Change price and check again
      await kelpOracle.setPrice(exp(2, 18));
      const [roundId2, , , , answeredInRound2] = await priceFeed.latestRoundData();

      expect(roundId1).to.eq(1);
      expect(answeredInRound1).to.eq(1);
      expect(roundId2).to.eq(1);
      expect(answeredInRound2).to.eq(1);
    });

    describe("18 decimal price feed tests", function () {
      let eighteenDecimalPriceFeed: RsETHScalingPriceFeed;

      beforeEach(async function () {
        eighteenDecimalPriceFeed = await RsETHScalingPriceFeedFactory.deploy(kelpOracle.address, 18, DESCRIPTION, underlyingToken.address);
        await eighteenDecimalPriceFeed.deployed();
      });

      it("returns unscaled price when decimals match oracle decimals", async function () {
        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        // Should return the exact price from Kelp oracle without scaling
        expect(answer).to.eq(kelpOraclePrice);
      });

      it("handles different prices without scaling for 18 decimals", async function () {
        const testPrices = [
          exp(1, 18), // 1 ETH
          exp(12, 17), // 1.2 ETH
          exp(95, 16), // 0.95 ETH
          exp(2, 18), // 2 ETH
        ];

        for (const testPrice of testPrices) {
          await kelpOracle.setPrice(testPrice);

          const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

          // Should return exact price without any scaling
          expect(answer).to.eq(testPrice);
        }
      });

      it("handles very high prices with 18 decimals", async function () {
        const highPrice = exp(1000, 18); // 1000 ETH per rsETH
        await kelpOracle.setPrice(highPrice);

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        expect(answer).to.eq(highPrice);
      });

      it("handles very small prices with 18 decimals", async function () {
        const smallPrice = 1; // 1 wei
        await kelpOracle.setPrice(smallPrice);

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        expect(answer).to.eq(smallPrice);
      });

      it("reverts when oracle price is zero with 18 decimals", async function () {
        await kelpOracle.setPrice(0);

        await expect(eighteenDecimalPriceFeed.latestRoundData()).to.be.revertedWithCustomError(
          eighteenDecimalPriceFeed,
          "PriceNotAvailable"
        );
      });
    });

    describe("edge cases", function () {
      it("handles price of exactly 1 ETH", async function () {
        await kelpOracle.setPrice(exp(1, 18));

        const [, answer, , ,] = await priceFeed.latestRoundData();
        const expectedAnswer = exp(1, 18) / 10n ** (kelpOracleDecimals - DECIMALS);

        expect(answer).to.eq(expectedAnswer);
      });

      it("handles price that results in zero after scaling", async function () {
        const verySmallPrice = 1; // 1 wei
        await kelpOracle.setPrice(verySmallPrice);

        const [, answer, , ,] = await priceFeed.latestRoundData();

        expect(answer).to.eq(0); // Should be 0 after scaling down
      });
    });
  });

  describe("signed256 function", function () {
    it("converts valid uint256 to int256", async function () {
      // We can test this indirectly by ensuring no revert with valid prices
      const validPrice = exp(1, 18);
      await kelpOracle.setPrice(validPrice);

      await expect(priceFeed.latestRoundData()).to.not.be.reverted;
    });

    it("reverts when uint256 exceeds int256.max", async function () {
      // Gets the maximum value for int256 and adds 1 to it
      const overflowValue = ethers.constants.MaxInt256.add(1);

      // Set the Kelp oracle price to this overflow value
      await kelpOracle.setPrice(overflowValue);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "InvalidInt256");
    });
  });

  describe("integration tests", function () {
    it("works with different Kelp oracle implementations", async function () {
      const newKelpOracle = await ManagedLRTOracleFactory.deploy(exp(12, 17));
      await newKelpOracle.deployed();

      const newPriceFeed = await RsETHScalingPriceFeedFactory.deploy(newKelpOracle.address, DECIMALS, DESCRIPTION, underlyingToken.address);
      await newPriceFeed.deployed();

      const [, answer, , ,] = await newPriceFeed.latestRoundData();
      const expectedAnswer = exp(12, 17) / 10n ** (kelpOracleDecimals - DECIMALS);

      expect(answer).to.eq(expectedAnswer);
    });

    it("maintains precision across multiple price updates", async function () {
      const prices = [
        exp(11, 17), // 1.1 ETH
        exp(105, 16), // 1.05 ETH
        exp(95, 16), // 0.95 ETH
        exp(115, 16), // 1.15 ETH
      ];

      for (const price of prices) {
        await kelpOracle.setPrice(price);

        const [, answer, , ,] = await priceFeed.latestRoundData();
        const expectedAnswer = price / 10n ** (kelpOracleDecimals - DECIMALS);

        expect(answer).to.eq(expectedAnswer);
      }
    });

    it("handles rapid price changes", async function () {
      const initialPrice = exp(1, 18);
      await kelpOracle.setPrice(initialPrice);

      // Rapid price changes
      for (let i = 0; i < 10; i++) {
        const newPrice = initialPrice + exp(i, 16); // Add 0.01 * i ETH
        await kelpOracle.setPrice(newPrice);

        const [, answer, , ,] = await priceFeed.latestRoundData();
        const expectedAnswer = newPrice / 10n ** (kelpOracleDecimals - DECIMALS);

        expect(answer).to.eq(expectedAnswer);
      }
    });
  });
});
