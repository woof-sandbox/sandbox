import { ethers, exp, expect, makeWstETHPriceFeed, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { SimplePriceFeed, SimpleWstETH, WstETHPriceFeed, WstETHPriceFeed__factory } from "../../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const testCases = [
  {
    stEthPrice: exp(1300, 18),
    tokensPerStEth: exp(0.9, 18),
    result: 144444444444n,
  },
  {
    stEthPrice: exp(1000, 18),
    tokensPerStEth: exp(0.9, 18),
    result: 111111111111n,
  },
  {
    stEthPrice: exp(1000, 18),
    tokensPerStEth: exp(0.2, 18),
    result: exp(5000, 8),
  },
  {
    stEthPrice: exp(1000, 18),
    tokensPerStEth: exp(0.5, 18),
    result: exp(2000, 8),
  },
  {
    stEthPrice: exp(1000, 18),
    tokensPerStEth: exp(0.8, 18),
    result: exp(1250, 8),
  },
  {
    stEthPrice: exp(-1000, 18),
    tokensPerStEth: exp(0.8, 18),
    result: 0n,
  },
];

describe("wstETH price feed", function () {
  let snapshot: SnapshotRestorer;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  let wstETH: SimpleWstETH;
  let wstETHPriceFeed: WstETHPriceFeed;
  let fallbackPriceFeed: SimplePriceFeed;
  let stETHPriceFeed: SimplePriceFeed;
  let WstETHPriceFeed: WstETHPriceFeed__factory;

  const UPDATE_TIME_LIMIT = time.duration.minutes(2);

  before(async () => {
    [dao, attacker] = await ethers.getSigners();

    ({ wstETH, wstETHPriceFeed, fallbackPriceFeed, stETHPriceFeed, WstETHPriceFeed } = await makeWstETHPriceFeed({
      stEthPrice: exp(1000, 18),
      tokensPerStEth: exp(0.8, 18),
      updateTimeLimit: UPDATE_TIME_LIMIT,
      dao,
    }));

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", function () {
    it("deploys with correct parameters", async () => {
      expect(await wstETHPriceFeed.stETHtoETHPriceFeed()).to.eq(stETHPriceFeed.address);
      expect(await wstETHPriceFeed.fallbackPriceFeed()).to.eq(fallbackPriceFeed.address);
      expect(await wstETHPriceFeed.stETHToETHPriceFeedDecimals()).to.eq(18);
      expect(await wstETHPriceFeed.wstETHScale()).to.eq(10n ** 18n);
      expect(await wstETHPriceFeed.decimals()).to.eq(8);
      expect(await wstETHPriceFeed.underlyingToken()).to.eq(wstETH.address);
      expect(await wstETHPriceFeed.dao()).to.eq(dao.address);
      expect(await wstETHPriceFeed.updateTimeLimit()).to.eq(UPDATE_TIME_LIMIT);
    });

    it("possible to deploy with fallbackPriceFeed as zero address", async () => {
      const wstETHPriceFeed = await WstETHPriceFeed.deploy(
        stETHPriceFeed.address,
        ZERO_ADDRESS, // fallbackPriceFeed
        wstETH.address,
        8, // decimals_
        UPDATE_TIME_LIMIT,
        UPDATE_TIME_LIMIT,
        dao.address
      );
      expect(await wstETHPriceFeed.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
    });

    it("reverts if decimals are zero", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          0, // decimals_
          UPDATE_TIME_LIMIT,
          UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(WstETHPriceFeed, "BadDecimals");
    });

    it("reverts if decimals are greater than stETHToETHPriceFeedDecimals", async () => {
      const stETHToETHPriceFeedDecimals = await stETHPriceFeed.decimals();
      await expect(
        WstETHPriceFeed.deploy(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          stETHToETHPriceFeedDecimals + 1, // decimals_
          UPDATE_TIME_LIMIT,
          UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(WstETHPriceFeed, "BadDecimals");
    });

    it("reverts if stETHPriceFeed is zero address", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          ZERO_ADDRESS, // stETHPriceFeed
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          UPDATE_TIME_LIMIT,
          UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(WstETHPriceFeed, "ZeroAddress");
    });

    it("reverts if wstETH is zero address", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          ZERO_ADDRESS, // wstETH
          8, // decimals_
          UPDATE_TIME_LIMIT,
          UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "ZeroAddress");
    });

    it("reverts if updateTimeLimit is zero", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          0, // updateTimeLimit_
          UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(WstETHPriceFeed, "ZeroUpdateTimeLimit");
    });

    it("reverts if fallbackUpdateTimeLimit is zero", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          UPDATE_TIME_LIMIT,
          0, // fallbackUpdateTimeLimit_
          dao.address
        )
      ).to.be.revertedWithCustomError(WstETHPriceFeed, "ZeroUpdateTimeLimit");
    });
  });

  describe("latestRoundData", function () {
    for (const { stEthPrice, tokensPerStEth, result } of testCases) {
      it(`stEthPrice (${stEthPrice}), tokensPerStEth (${tokensPerStEth}) -> ${result}`, async () => {
        const { wstETHPriceFeed } = await makeWstETHPriceFeed({ stEthPrice, tokensPerStEth, updateTimeLimit: UPDATE_TIME_LIMIT, dao });

        if (result == 0n) {
          await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
        } else {
          const { answer } = await wstETHPriceFeed.latestRoundData();

          expect(answer).to.eq(result);
        }
      });
    }

    it("passes along roundId, startedAt, updatedAt and answeredInRound values from stETH price feed", async () => {
      const { stETHPriceFeed, wstETHPriceFeed } = await makeWstETHPriceFeed({
        stEthPrice: exp(1000, 18),
        tokensPerStEth: exp(0.8, 18),
        updateTimeLimit: UPDATE_TIME_LIMIT,
        dao,
      });

      const timeNow = await time.latest();

      await stETHPriceFeed.setRoundData(
        exp(15, 18), // roundId_,
        1, // answer_,
        timeNow, // startedAt_,
        timeNow, // updatedAt_,
        exp(18, 18) // answeredInRound_
      );

      const { roundId, startedAt, updatedAt, answeredInRound } = await wstETHPriceFeed.latestRoundData();

      expect(roundId.toBigInt()).to.eq(exp(15, 18));
      expect(startedAt.toBigInt()).to.eq(timeNow);
      expect(updatedAt.toBigInt()).to.eq(timeNow);
      expect(answeredInRound.toBigInt()).to.eq(exp(18, 18));
    });

    it("when answer is <= 0, price gets from fallback price feed", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return 0
      await stETHPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

      // set fallback price where stTokensPerStEth is 0.8
      const stEthPrice = exp(1000, 18);
      const result = exp(1250, 8);

      await fallbackPriceFeed.setRoundData(1, stEthPrice, timeNow, timeNow, 1);

      const { answer } = await wstETHPriceFeed.latestRoundData();

      expect(answer).to.eq(result);
    });

    it("when updatedAt is too old, price gets from fallback price feed", async () => {
      const stEthPrice = exp(1000, 18);
      const result = exp(1250, 8);

      await time.increase(UPDATE_TIME_LIMIT * 2);

      const timeNow = await time.latest();
      await fallbackPriceFeed.setRoundData(1, stEthPrice, timeNow, timeNow, 1);

      const { answer } = await wstETHPriceFeed.latestRoundData();

      expect(answer).to.eq(result);
    });

    it("reverts when primary price feed has wrong data and fallback is not set", async () => {
      // set fallback as zero address
      await wstETHPriceFeed.setPriceFeeds(stETHPriceFeed.address, ZERO_ADDRESS);

      // skip 3 minutes to make sure that we will fall back to fallback price feed
      await time.increase(UPDATE_TIME_LIMIT + 60);

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("reverts when primary price feed has wrong data and fallback price feed answer <= 0", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, -1, timeNow, timeNow, 1);

      // set fallback price feed to return 0
      await fallbackPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("when primary price feed has wrong data and fallback price feed updatedAt is too old, return 0 answer", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, -1, timeNow, timeNow, 1);

      // set fallback price feed to return valid data, but with old updatedAt
      await fallbackPriceFeed.setRoundData(1, exp(1000, 18), timeNow - UPDATE_TIME_LIMIT * 2, timeNow - UPDATE_TIME_LIMIT * 2, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });
  });

  describe("setPriceFeeds", function () {
    it("allows to set new price feeds", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await wstETHPriceFeed.setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed);

      expect(await wstETHPriceFeed.stETHtoETHPriceFeed()).to.eq(newStETHPriceFeed);
      expect(await wstETHPriceFeed.fallbackPriceFeed()).to.eq(newFallbackPriceFeed);
    });

    it("emits event when price feeds are set", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await expect(wstETHPriceFeed.setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed))
        .to.emit(wstETHPriceFeed, "PriceFeedsSet")
        .withArgs(newStETHPriceFeed, newFallbackPriceFeed);
    });

    it("reverts if stETHtoETHPriceFeed is zero address", async () => {
      await expect(wstETHPriceFeed.setPriceFeeds(ZERO_ADDRESS, fallbackPriceFeed.address)).to.be.revertedWithCustomError(
        wstETHPriceFeed,
        "ZeroAddress"
      );
    });

    it("reverts if called by non-authorized account", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await expect(wstETHPriceFeed.connect(attacker).setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed)).to.be.revertedWithCustomError(
        wstETHPriceFeed,
        "Unauthorized"
      );
    });
  });
});
