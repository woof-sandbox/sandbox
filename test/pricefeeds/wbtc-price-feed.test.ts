import { ethers, exp, expect, makeWBTCPriceFeed, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { FaucetToken, SimplePriceFeed, SimplePriceFeed__factory, WBTCPriceFeed, WBTCPriceFeed__factory } from "../../build/types";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const testCases = [
  {
    WBTCToBTCPrice: exp(1, 8),
    BTCToUSDPrice: exp(30_000, 8),
    result: exp(30_000, 8),
  },
  {
    WBTCToBTCPrice: exp(2.123456, 8),
    BTCToUSDPrice: exp(31_333.123, 8),
    result: 6653450803308n,
  },
  {
    WBTCToBTCPrice: exp(100, 8),
    BTCToUSDPrice: exp(30_000, 8),
    result: exp(3_000_000, 8),
  },
  {
    WBTCToBTCPrice: exp(0.9999, 8),
    BTCToUSDPrice: exp(30_000, 8),
    result: exp(29_997, 8),
  },
  {
    WBTCToBTCPrice: exp(0.987937, 8),
    BTCToUSDPrice: exp(31_947.71623, 8),
    result: 3156233092911n,
  },
  {
    WBTCToBTCPrice: exp(0.5, 8),
    BTCToUSDPrice: exp(30_000, 8),
    result: exp(15_000, 8),
  },
  {
    WBTCToBTCPrice: exp(0.00555, 8),
    BTCToUSDPrice: exp(30_000, 8),
    result: exp(166.5, 8),
  },
  {
    WBTCToBTCPrice: exp(0, 8),
    BTCToUSDPrice: exp(30_000, 8),
    result: exp(0, 8),
  },
  {
    WBTCToBTCPrice: exp(1, 8),
    BTCToUSDPrice: exp(0, 8),
    result: exp(0, 8),
  },
  {
    WBTCToBTCPrice: exp(0, 8),
    BTCToUSDPrice: exp(0, 8),
    result: exp(0, 8),
  },
];

const UPDATE_TIME_LIMIT = time.duration.minutes(2);
const FALLBACK_UPDATE_TIME_LIMIT = time.duration.minutes(5);
const FALLBACK_PRICE = exp(50_000, 8);

describe("WBTC price feed", function () {
  let snapshot: SnapshotRestorer;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  let wbtcPriceFeed: WBTCPriceFeed;

  let SimplePriceFeed: SimplePriceFeed__factory;
  let WBTCPriceFeed: WBTCPriceFeed__factory;

  let WBTCToBTCPriceFeed: SimplePriceFeed;
  let BTCToUSDPriceFeed: SimplePriceFeed;
  let fallbackPriceFeed: SimplePriceFeed;

  let wbtc: FaucetToken;

  before(async () => {
    [dao, attacker] = await ethers.getSigners();

    ({ wbtcPriceFeed, SimplePriceFeed, WBTCToBTCPriceFeed, WBTCPriceFeed, BTCToUSDPriceFeed, wbtc, fallbackPriceFeed } =
      await makeWBTCPriceFeed({
        WBTCToBTCPrice: exp(1, 8),
        BTCToUSDPrice: exp(30_000, 8),
        dao,
        updateTimeLimit: UPDATE_TIME_LIMIT,
        fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
        fallbackBTCtoUSDPrice: FALLBACK_PRICE,
      }));

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", function () {
    it("should deploy with correct parameters", async () => {
      expect(await wbtcPriceFeed.WBTCtoBTCPriceFeed()).to.eq(WBTCToBTCPriceFeed.address);
      expect(await wbtcPriceFeed.BTCtoUSDPriceFeed()).to.eq(BTCToUSDPriceFeed.address);
      expect(await wbtcPriceFeed.fallbackBTCtoUSDPriceFeed()).to.eq(fallbackPriceFeed.address);
      expect(await wbtcPriceFeed.decimals()).to.eq(8);
      expect(await wbtcPriceFeed.underlyingToken()).to.eq(wbtc.address);
      expect(await wbtcPriceFeed.priceFeedScale()).to.eq(10n ** 8n);
      expect(await wbtcPriceFeed.combinedScale()).to.eq(10n ** 16n);
    });

    it("allows to deploy with zero fallback price feed", async () => {
      const wbtcPriceFeedWithZeroFallback = await WBTCPriceFeed.deploy(
        dao.address,
        WBTCToBTCPriceFeed.address,
        BTCToUSDPriceFeed.address,
        ZERO_ADDRESS,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        8,
        wbtc.address
      );

      expect(await wbtcPriceFeedWithZeroFallback.fallbackBTCtoUSDPriceFeed()).to.eq(ZERO_ADDRESS);
    });

    it("should revert if WBTCToBTCPriceFeed is zero address", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          ZERO_ADDRESS,
          BTCToUSDPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          8,
          wbtc.address
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroAddress");
    });

    it("should revert if BTCToUSDPriceFeed is zero address", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          WBTCToBTCPriceFeed.address,
          ZERO_ADDRESS,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          8,
          wbtc.address
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroAddress");
    });

    it("reverts if underlying token is zero address", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          WBTCToBTCPriceFeed.address,
          BTCToUSDPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          8,
          ZERO_ADDRESS
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroAddress");
    });

    it("reverts if updateTimeLimit is zero", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          WBTCToBTCPriceFeed.address,
          BTCToUSDPriceFeed.address,
          fallbackPriceFeed.address,
          0, // updateTimeLimit
          FALLBACK_UPDATE_TIME_LIMIT,
          8,
          wbtc.address
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroUpdateTimeLimit");
    });

    it("reverts if fallbackUpdateTimeLimit is zero", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          WBTCToBTCPriceFeed.address,
          BTCToUSDPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          0, // fallbackUpdateTimeLimit
          8,
          wbtc.address
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroUpdateTimeLimit");
    });

    it("reverts if decimals is zero", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          WBTCToBTCPriceFeed.address,
          BTCToUSDPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          0, // decimals
          wbtc.address
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "BadDecimals");
    });

    it("reverts if decimals > 18", async () => {
      await expect(
        WBTCPriceFeed.deploy(
          dao.address,
          WBTCToBTCPriceFeed.address,
          BTCToUSDPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          19, // decimals
          wbtc.address
        )
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "BadDecimals");
    });
  });

  describe("latestRoundData", function () {
    for (const { WBTCToBTCPrice, BTCToUSDPrice, result } of testCases) {
      it(`WBTCToBTCPrice (${WBTCToBTCPrice}), BTCToUSDPrice (${BTCToUSDPrice}) -> ${result}`, async () => {
        const { wbtcPriceFeed } = await makeWBTCPriceFeed({
          WBTCToBTCPrice,
          BTCToUSDPrice,
          dao,
          updateTimeLimit: UPDATE_TIME_LIMIT,
          fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
          fallbackBTCtoUSDPrice: 0,
        });

        if (WBTCToBTCPrice === 0n || BTCToUSDPrice === 0n) {
          await expect(wbtcPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wbtcPriceFeed, "PriceNotAvailable");
        } else {
          const latestRoundData = await wbtcPriceFeed.latestRoundData();
          const price = latestRoundData[1].toBigInt();

          expect(price).to.eq(result);
        }
      });
    }

    it("passes along roundId, startedAt, updatedAt and answeredInRound values from BTC / USD price feed", async () => {
      const { BTCToUSDPriceFeed, wbtcPriceFeed } = await makeWBTCPriceFeed({
        WBTCToBTCPrice: exp(1, 18),
        BTCToUSDPrice: exp(30_000, 18),
        dao,
        updateTimeLimit: UPDATE_TIME_LIMIT,
        fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
        fallbackBTCtoUSDPrice: 0,
      });

      const timeNow = await time.latest();

      await BTCToUSDPriceFeed.setRoundData(
        exp(15, 18), // roundId_,
        1, // answer_,
        timeNow, // startedAt_,
        timeNow, // updatedAt_,
        exp(18, 18) // answeredInRound_
      );

      const roundData = await wbtcPriceFeed.latestRoundData();

      expect(roundData[0].toBigInt()).to.eq(exp(15, 18));
      expect(roundData[2].toBigInt()).to.eq(timeNow);
      expect(roundData[3].toBigInt()).to.eq(timeNow);
      expect(roundData[4].toBigInt()).to.eq(exp(18, 18));
    });

    it("reverts if WBTCtoBTCPriceFeed answer is not valid", async () => {
      // set WBTCToBTCPriceFeed answer to zero
      await WBTCToBTCPriceFeed.setRoundData(1, 0, 0, 0, 1);

      await expect(wbtcPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wbtcPriceFeed, "PriceNotAvailable");
    });

    it("reverts if BTCtoUSDPriceFeed answer is not valid and fallbackPriceFeed is not set", async () => {
      // set fallbackPriceFeed to zero address
      await wbtcPriceFeed.setPriceFeeds(
        WBTCToBTCPriceFeed.address,
        BTCToUSDPriceFeed.address,
        ZERO_ADDRESS, // fallbackPriceFeed
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      // set BTCToUSDPriceFeed answer to zero
      await BTCToUSDPriceFeed.setRoundData(1, 0, 0, 0, 1);

      await expect(wbtcPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wbtcPriceFeed, "PriceNotAvailable");
    });

    it("reverts if BTCtoUSDPriceFeed answer is not valid and fallbackPriceFeed  answer <= 0", async () => {
      // set BTCToUSDPriceFeed answer to zero
      await BTCToUSDPriceFeed.setRoundData(1, 0, 0, 0, 1);
      // set fallbackPriceFeed answer to zero
      await fallbackPriceFeed.setRoundData(1, 0, 0, 0, 1);

      await expect(wbtcPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wbtcPriceFeed, "PriceNotAvailable");
    });

    it("reverts if BTCtoUSDPriceFeed answer is not valid and fallbackPriceFeed  updatedAt < fallbackUpdateTimeLimit", async () => {
      // set BTCToUSDPriceFeed answer to zero
      await BTCToUSDPriceFeed.setRoundData(1, 0, 0, 0, 1);

      // set fallbackPriceFeed answer to zero
      const timeNow = await time.latest();
      await fallbackPriceFeed.setRoundData(1, exp(10_000, 8), 0, timeNow, 1);

      // skip time to make sure fallbackPriceFeed is not updated for a long time
      await time.increase(FALLBACK_UPDATE_TIME_LIMIT + 1);

      await expect(wbtcPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wbtcPriceFeed, "PriceNotAvailable");
    });

    it("gets price from fallbackPriceFeed if BTCtoUSDPriceFeed answer is <= 0", async () => {
      // set BTCToUSDPriceFeed answer to zero
      await BTCToUSDPriceFeed.setRoundData(1, 0, 0, 0, 1);

      const priceFeedScale = await wbtcPriceFeed.priceFeedScale();
      const WBTCToBTCPrice = exp(1, 8);
      const BTCToUSDPrice = FALLBACK_PRICE;
      const combinedScale = await wbtcPriceFeed.combinedScale();
      const expectedResult = priceFeedScale.mul(WBTCToBTCPrice * BTCToUSDPrice).div(combinedScale);

      const latestRoundData = await wbtcPriceFeed.latestRoundData();
      const price = latestRoundData[1].toBigInt();

      expect(price).to.eq(expectedResult);
    });

    it("gets price from fallbackPriceFeed if BTCtoUSDPriceFeed answer is not updated for a long time", async () => {
      // set BTCToUSDPriceFeed updatedAt to a time in the past
      const timeNow = await time.latest();
      await BTCToUSDPriceFeed.setRoundData(1, exp(30_000, 8), timeNow, timeNow, 1);

      // then skip time to make sure BTCToUSDPriceFeed is not updated for a long time
      await time.increase(UPDATE_TIME_LIMIT + 1);

      const priceFeedScale = await wbtcPriceFeed.priceFeedScale();
      const WBTCToBTCPrice = exp(1, 8);
      const BTCToUSDPrice = FALLBACK_PRICE;
      const combinedScale = await wbtcPriceFeed.combinedScale();
      const expectedResult = priceFeedScale.mul(WBTCToBTCPrice * BTCToUSDPrice).div(combinedScale);

      const latestRoundData = await wbtcPriceFeed.latestRoundData();
      const price = latestRoundData[1].toBigInt();

      expect(price).to.eq(expectedResult);
    });
  });

  describe("setPriceFeeds", function () {
    it("should update price feeds addresses", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 8), 8, wbtc.address);
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 8), 8, wbtc.address);

      await wbtcPriceFeed.setPriceFeeds(
        newWBTCtoBTC.address,
        newBTCtoUSD.address,
        ZERO_ADDRESS,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      expect(await wbtcPriceFeed.WBTCtoBTCPriceFeed()).to.eq(newWBTCtoBTC.address);
      expect(await wbtcPriceFeed.BTCtoUSDPriceFeed()).to.eq(newBTCtoUSD.address);
      expect(await wbtcPriceFeed.fallbackBTCtoUSDPriceFeed()).to.eq(ZERO_ADDRESS);
    });

    it("should update combinedScale", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 18), 18, wbtc.address);
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 18), 18, wbtc.address);

      await wbtcPriceFeed.setPriceFeeds(
        newWBTCtoBTC.address,
        newBTCtoUSD.address,
        ZERO_ADDRESS,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT
      );

      expect(await wbtcPriceFeed.combinedScale()).to.eq(10n ** 36n);
    });

    it("should update time limits", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 8), 8, wbtc.address);
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 8), 8, wbtc.address);

      const newUpdateTimeLimit = time.duration.minutes(3);
      const newFallbackUpdateTimeLimit = time.duration.minutes(6);

      await wbtcPriceFeed.setPriceFeeds(
        newWBTCtoBTC.address,
        newBTCtoUSD.address,
        ZERO_ADDRESS,
        newUpdateTimeLimit,
        newFallbackUpdateTimeLimit
      );

      expect(await wbtcPriceFeed.updateTimeLimit()).to.eq(newUpdateTimeLimit);
      expect(await wbtcPriceFeed.fallbackUpdateTimeLimit()).to.eq(newFallbackUpdateTimeLimit);
    });

    it("emits event during setting price feeds", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 8), 8, wbtc.address);
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 8), 8, wbtc.address);

      await expect(
        wbtcPriceFeed.setPriceFeeds(newWBTCtoBTC.address, newBTCtoUSD.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      )
        .to.emit(wbtcPriceFeed, "PriceFeedsSet")
        .withArgs(newWBTCtoBTC.address, newBTCtoUSD.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);
    });

    it("reverts if update time limit is zero", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 8), 8, wbtc.address);
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 8), 8, wbtc.address);

      await expect(
        wbtcPriceFeed.setPriceFeeds(newWBTCtoBTC.address, newBTCtoUSD.address, ZERO_ADDRESS, 0, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroUpdateTimeLimit");

      await expect(
        wbtcPriceFeed.setPriceFeeds(newWBTCtoBTC.address, newBTCtoUSD.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, 0)
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroUpdateTimeLimit");
    });

    it("reverts if wbtc to btc price feed is zero address", async () => {
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 8), 8, wbtc.address);

      await expect(
        wbtcPriceFeed.setPriceFeeds(ZERO_ADDRESS, newBTCtoUSD.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroAddress");
    });

    it("reverts if btc to usd price feed is zero address", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 8), 8, wbtc.address);

      await expect(
        wbtcPriceFeed.setPriceFeeds(newWBTCtoBTC.address, ZERO_ADDRESS, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "ZeroAddress");
    });

    it("reverts if caller is not authorized", async () => {
      const newWBTCtoBTC = await SimplePriceFeed.deploy(exp(1, 8), 8, wbtc.address);
      const newBTCtoUSD = await SimplePriceFeed.deploy(exp(40_000, 8), 8, wbtc.address);

      await expect(
        wbtcPriceFeed
          .connect(attacker)
          .setPriceFeeds(newWBTCtoBTC.address, newBTCtoUSD.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(wbtcPriceFeed, "Unauthorized");
    });
  });
});
