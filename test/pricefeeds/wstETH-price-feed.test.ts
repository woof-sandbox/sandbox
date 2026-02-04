import { ethers, exp, expect, time, makeWstETHPriceFeed, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import {
  SimplePriceFeed,
  SimpleWstETH,
  WstETHPriceFeed,
  WstETHPriceFeed__factory,
  ManagedSimplePriceFeed,
  ManagedSimplePriceFeed__factory,
} from "../../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

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
  let sequencer: ManagedSimplePriceFeed;

  let WstETHPriceFeed: WstETHPriceFeed__factory;
  let ManagedSimplePriceFeedFactory: ManagedSimplePriceFeed__factory;

  const UPDATE_TIME_LIMIT = time.duration.minutes(2);
  const FALLBACK_UPDATE_TIME_LIMIT = time.duration.minutes(5);

  before(async () => {
    [dao, attacker] = await ethers.getSigners();

    ({ wstETH, wstETHPriceFeed, fallbackPriceFeed, stETHPriceFeed, WstETHPriceFeed, ManagedSimplePriceFeedFactory, sequencer } =
      await makeWstETHPriceFeed({
        stEthPrice: exp(1000, 18),
        tokensPerStEth: exp(0.8, 18),
        updateTimeLimit: UPDATE_TIME_LIMIT,
        fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
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
      expect(await wstETHPriceFeed.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
      expect(await wstETHPriceFeed.version()).to.eq(1);
      expect(await wstETHPriceFeed.description()).to.eq("Custom price feed for wstETH / ETH");
      expect(await wstETHPriceFeed.sequencer()).to.eq(sequencer.address);
      expect(await wstETHPriceFeed.dao()).to.eq(dao.address);
    });

    it("emits SequencerUpdated event", async function () {
      expect(
        await WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      )
        .to.emit(wstETHPriceFeed, "SequencerUpdated")
        .withArgs(sequencer.address);
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      // Skip on mainnet chain id (1)
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(
        WstETHPriceFeed.deploy(
          ZERO_ADDRESS,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "InvalidSequencer");
    });

    it("possible to deploy with fallbackPriceFeed as zero address", async () => {
      const wstETHPriceFeedWithoutFallback = await WstETHPriceFeed.deploy(
        sequencer.address,
        stETHPriceFeed.address,
        ZERO_ADDRESS, // fallbackPriceFeed
        wstETH.address,
        8, // decimals_
        UPDATE_TIME_LIMIT,
        0, // fallbackUpdateTimeLimit can be 0 when fallback is not set
        dao.address
      );
      await wstETHPriceFeedWithoutFallback.deployed();

      expect(await wstETHPriceFeedWithoutFallback.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
      expect(await wstETHPriceFeedWithoutFallback.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("reverts if decimals are zero", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          0, // decimals_
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "BadDecimals");
    });

    it("reverts if decimals are greater than stETHToETHPriceFeedDecimals", async () => {
      const stETHToETHPriceFeedDecimals = await stETHPriceFeed.decimals();
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          stETHToETHPriceFeedDecimals + 1, // decimals_
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "BadDecimals");
    });

    it("works with valid decimal configurations", async () => {
      const validDecimalConfigs = [1, 6, 8, 12, 18];

      for (const decimals of validDecimalConfigs) {
        const priceFeed = await WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          decimals,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        );
        await priceFeed.deployed();

        expect(await priceFeed.decimals()).to.eq(decimals);
      }
    });

    it("reverts if stETHPriceFeed is zero address", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          ZERO_ADDRESS, // stETHPriceFeed
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "ZeroAddress");
    });

    it("reverts if wstETH is zero address", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          ZERO_ADDRESS, // wstETH
          8, // decimals_
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "ZeroAddress");
    });

    it("reverts if dao is zero address", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          ZERO_ADDRESS // dao
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "ZeroAddress");
    });

    it("reverts if updateTimeLimit is zero", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          0, // updateTimeLimit_
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallbackUpdateTimeLimit is zero when fallback is set", async () => {
      await expect(
        WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          8, // decimals_
          UPDATE_TIME_LIMIT,
          0, // fallbackUpdateTimeLimit_
          dao.address
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "InvalidUpdateTimeLimit");
    });

    it("allows fallbackUpdateTimeLimit to be zero when fallback is not set", async () => {
      const priceFeed = await WstETHPriceFeed.deploy(
        sequencer.address,
        stETHPriceFeed.address,
        ZERO_ADDRESS, // no fallback
        wstETH.address,
        8,
        UPDATE_TIME_LIMIT,
        0, // can be zero when no fallback
        dao.address
      );
      await priceFeed.deployed();

      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("calculates wstETHScale correctly based on wstETH decimals", async () => {
      const wstETHDecimals = await wstETH.decimals();
      expect(await wstETHPriceFeed.wstETHScale()).to.eq(10n ** BigInt(wstETHDecimals));
    });

    it("stores stETHToETHPriceFeedDecimals correctly", async () => {
      const expectedDecimals = await stETHPriceFeed.decimals();
      expect(await wstETHPriceFeed.stETHToETHPriceFeedDecimals()).to.eq(expectedDecimals);
    });
  });

  describe("setSequencer", function () {
    it("updates sequencer address", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, wstETH.address);
      await newSequencer.deployed();

      await wstETHPriceFeed.connect(dao).setSequencer(newSequencer.address);

      expect(await wstETHPriceFeed.sequencer()).to.eq(newSequencer.address);
    });

    it("emits SequencerUpdated event", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, wstETH.address);
      await newSequencer.deployed();

      await expect(wstETHPriceFeed.connect(dao).setSequencer(newSequencer.address))
        .to.emit(wstETHPriceFeed, "SequencerUpdated")
        .withArgs(newSequencer.address);
    });

    it("allows setting sequencer to zero address on mainnet", async function () {
      // we'll skip this test if not on mainnet
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId !== 1) {
        this.skip();
      }

      await wstETHPriceFeed.connect(dao).setSequencer(ZERO_ADDRESS);
      expect(await wstETHPriceFeed.sequencer()).to.eq(ZERO_ADDRESS);
    });

    it("reverts if caller is not dao", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, wstETH.address);
      await newSequencer.deployed();

      await expect(wstETHPriceFeed.connect(attacker).setSequencer(newSequencer.address)).to.be.revertedWithCustomError(
        wstETHPriceFeed,
        "NotDao"
      );
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(wstETHPriceFeed.connect(dao).setSequencer(ZERO_ADDRESS)).to.be.revertedWithCustomError(
        wstETHPriceFeed,
        "InvalidSequencer"
      );
    });

    it("reverts if current sequencer is a new one", async function () {
      const newSequencer = sequencer.address;

      await expect(wstETHPriceFeed.setSequencer(newSequencer)).to.be.revertedWithCustomError(wstETHPriceFeed, "InvalidSequencer");
    });
  });

  describe("latestRoundData", function () {
    for (const { stEthPrice, tokensPerStEth, result } of testCases) {
      it(`stEthPrice (${stEthPrice}), tokensPerStEth (${tokensPerStEth}) -> ${result}`, async () => {
        const { wstETHPriceFeed } = await makeWstETHPriceFeed({
          stEthPrice,
          tokensPerStEth,
          updateTimeLimit: UPDATE_TIME_LIMIT,
          fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
          dao,
        });

        if (result == 0n) {
          await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
        } else {
          const { answer } = await wstETHPriceFeed.latestRoundData();
          expect(answer).to.eq(result);
        }
      });
    }

    it("reverts when sequencer is down", async function () {
      await sequencer.setRoundData(3, 1, await time.latest(), await time.latest(), 3); // Sequencer down

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("passes along roundId, startedAt, updatedAt and answeredInRound values from stETH price feed", async () => {
      const { stETHPriceFeed, wstETHPriceFeed } = await makeWstETHPriceFeed({
        stEthPrice: exp(1000, 18),
        tokensPerStEth: exp(0.8, 18),
        updateTimeLimit: UPDATE_TIME_LIMIT,
        fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
        dao,
      });

      const timeNow = await time.latest();
      const roundId = exp(15, 18);
      const answeredInRound = exp(18, 18);

      await stETHPriceFeed.setRoundData(
        roundId, // roundId_,
        exp(1000, 18), // answer_,
        timeNow, // startedAt_,
        timeNow, // updatedAt_,
        answeredInRound // answeredInRound_
      );

      const result = await wstETHPriceFeed.latestRoundData();

      expect(result.roundId.toBigInt()).to.eq(roundId);
      expect(result.startedAt.toBigInt()).to.eq(timeNow);
      expect(result.updatedAt.toBigInt()).to.eq(timeNow);
      expect(result.answeredInRound.toBigInt()).to.eq(answeredInRound);
    });

    it("when answer is <= 0, price gets from fallback price feed", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return 0
      await stETHPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

      // set fallback price where tokensPerStEth is 0.8
      const stEthPrice = exp(1000, 18);
      const result = exp(1250, 8);

      await fallbackPriceFeed.setRoundData(1, stEthPrice, timeNow, timeNow, 1);

      const { answer } = await wstETHPriceFeed.latestRoundData();

      expect(answer).to.eq(result);
    });

    it("when answer is negative, price gets from fallback price feed", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return negative value
      await stETHPriceFeed.setRoundData(1, -1000, timeNow, timeNow, 1);

      // set fallback price
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

    it("uses fallback when primary price feed is exactly at time limit", async () => {
      const timeNow = await time.latest();
      const staleTime = timeNow - UPDATE_TIME_LIMIT;

      // set primary price feed to be exactly at time limit (should trigger fallback)
      await stETHPriceFeed.setRoundData(1, exp(1000, 18), staleTime, staleTime, 1);

      // set fallback price
      const fallbackPrice = exp(1100, 18);
      await fallbackPriceFeed.setRoundData(2, fallbackPrice, timeNow, timeNow, 2);

      const { answer } = await wstETHPriceFeed.latestRoundData();

      // Should use fallback calculation
      const expectedResult = (fallbackPrice * 10n ** 18n) / exp(0.8, 18) / 10n ** 10n;
      expect(answer).to.eq(expectedResult);
    });

    it("uses primary when primary price feed is just within time limit", async () => {
      const timeNow = await time.latest();
      const recentTime = timeNow - UPDATE_TIME_LIMIT + 1;

      // set primary price feed to be just within time limit
      await stETHPriceFeed.setRoundData(1, exp(1000, 18), recentTime, recentTime, 1);

      const { answer } = await wstETHPriceFeed.latestRoundData();

      // Should use primary calculation
      const expectedResult = exp(1250, 8); // Based on tokensPerStEth = 0.8
      expect(answer).to.eq(expectedResult);
    });

    it("reverts when primary price feed has wrong data and fallback is not set", async () => {
      // create price feed without fallback
      const priceFeedWithoutFallback = await WstETHPriceFeed.deploy(
        sequencer.address,
        stETHPriceFeed.address,
        ZERO_ADDRESS, // no fallback
        wstETH.address,
        8,
        UPDATE_TIME_LIMIT,
        0,
        dao.address
      );
      await priceFeedWithoutFallback.deployed();

      // skip time to make primary stale
      await time.increase(UPDATE_TIME_LIMIT + 60);

      await expect(priceFeedWithoutFallback.latestRoundData()).to.be.revertedWithCustomError(priceFeedWithoutFallback, "PriceNotAvailable");
    });

    it("reverts when primary price feed has wrong data and fallback price feed answer <= 0", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, -1, timeNow, timeNow, 1);

      // set fallback price feed to return 0
      await fallbackPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("reverts when primary price feed has wrong data and fallback price feed answer is negative", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, -1, timeNow, timeNow, 1);

      // set fallback price feed to return negative value
      await fallbackPriceFeed.setRoundData(1, -1000, timeNow, timeNow, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("reverts when primary price feed has wrong data and fallback price feed updatedAt is too old", async () => {
      const timeNow = await time.latest();

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, -1, timeNow, timeNow, 1);

      // set fallback price feed to return valid data, but with old updatedAt
      await fallbackPriceFeed.setRoundData(
        1,
        exp(1000, 18),
        timeNow - FALLBACK_UPDATE_TIME_LIMIT - 1,
        timeNow - FALLBACK_UPDATE_TIME_LIMIT - 1,
        1
      );

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback is exactly at time limit", async () => {
      const timeNow = await time.latest();
      const staleTime = timeNow - FALLBACK_UPDATE_TIME_LIMIT;

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

      // set fallback price feed to be exactly at time limit
      await fallbackPriceFeed.setRoundData(1, exp(1000, 18), staleTime, staleTime, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.be.revertedWithCustomError(wstETHPriceFeed, "PriceNotAvailable");
    });

    it("works when fallback is just within time limit", async () => {
      const timeNow = await time.latest();
      const recentTime = timeNow - FALLBACK_UPDATE_TIME_LIMIT + 2;

      // set primary price feed to return invalid data
      await stETHPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

      // set fallback price feed to be just within time limit
      await fallbackPriceFeed.setRoundData(1, exp(1000, 18), recentTime, recentTime, 1);

      const { answer } = await wstETHPriceFeed.latestRoundData();

      const expectedResult = exp(1250, 8);
      expect(answer).to.eq(expectedResult);
    });

    describe("mathematical edge cases", function () {
      it("handles very high tokensPerStEth ratio", async () => {
        const { wstETHPriceFeed } = await makeWstETHPriceFeed({
          stEthPrice: exp(1000, 18),
          tokensPerStEth: exp(10, 18), // 10 tokens per stETH
          updateTimeLimit: UPDATE_TIME_LIMIT,
          fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
          dao,
        });

        const { answer } = await wstETHPriceFeed.latestRoundData();

        // Expected: (1000 * 10^18) / (10 * 10^18) / 10^10 = 100 * 10^8
        const expectedResult = exp(100, 8);
        expect(answer).to.eq(expectedResult);
      });

      it("handles very low tokensPerStEth ratio", async () => {
        const { wstETHPriceFeed } = await makeWstETHPriceFeed({
          stEthPrice: exp(1000, 18),
          tokensPerStEth: exp(1, 16), // 0.01 tokens per stETH
          updateTimeLimit: UPDATE_TIME_LIMIT,
          fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
          dao,
        });

        const { answer } = await wstETHPriceFeed.latestRoundData();

        // Expected: (1000 * 10^18) / (0.01 * 10^18) / 10^10 = 100000 * 10^8
        const expectedResult = exp(100000, 8);
        expect(answer).to.eq(expectedResult);
      });

      it("handles maximum reasonable stETH price", async () => {
        const maxPrice = exp(100000, 18); // $100,000 per ETH
        const { wstETHPriceFeed } = await makeWstETHPriceFeed({
          stEthPrice: maxPrice,
          tokensPerStEth: exp(1, 18), // 1:1 ratio
          updateTimeLimit: UPDATE_TIME_LIMIT,
          fallbackUpdateTimeLimit: FALLBACK_UPDATE_TIME_LIMIT,
          dao,
        });

        const { answer } = await wstETHPriceFeed.latestRoundData();

        const expectedResult = exp(100000, 8);
        expect(answer).to.eq(expectedResult);
      });

      it("handles precision with different decimal outputs", async () => {
        const priceFeed6Decimals = await WstETHPriceFeed.deploy(
          sequencer.address,
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          wstETH.address,
          6, // 6 decimals
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          dao.address
        );
        await priceFeed6Decimals.deployed();

        const timeNow = await time.latest();
        await stETHPriceFeed.setRoundData(1, exp(1000, 18), timeNow, timeNow, 1);

        const { answer } = await priceFeed6Decimals.latestRoundData();

        // Expected: (1000 * 10^18) / (0.8 * 10^18) / 10^12 = 1250 * 10^6
        const expectedResult = exp(1250, 6);
        expect(answer).to.eq(expectedResult);
      });
    });

    describe("round data propagation from fallback", function () {
      it("passes fallback round data correctly", async () => {
        const timeNow = await time.latest();
        const fallbackRoundId = 999;
        const fallbackStartedAt = timeNow - 100;
        const fallbackAnsweredInRound = 888;

        // make primary invalid
        await stETHPriceFeed.setRoundData(1, 0, timeNow, timeNow, 1);

        // set fallback with specific round data
        await fallbackPriceFeed.setRoundData(fallbackRoundId, exp(1000, 18), fallbackStartedAt, timeNow, fallbackAnsweredInRound);

        const result = await wstETHPriceFeed.latestRoundData();

        expect(result.roundId).to.eq(fallbackRoundId);
        expect(result.startedAt).to.eq(fallbackStartedAt);
        expect(result.updatedAt).to.eq(timeNow);
        expect(result.answeredInRound).to.eq(fallbackAnsweredInRound);
      });
    });
  });

  describe("setPriceFeeds", function () {
    it("allows to set new price feeds with update time limits", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;
      const newUpdateTimeLimit = time.duration.minutes(10);
      const newFallbackUpdateTimeLimit = time.duration.minutes(15);

      await wstETHPriceFeed.setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed, newUpdateTimeLimit, newFallbackUpdateTimeLimit);

      expect(await wstETHPriceFeed.stETHtoETHPriceFeed()).to.eq(newStETHPriceFeed);
      expect(await wstETHPriceFeed.fallbackPriceFeed()).to.eq(newFallbackPriceFeed);
      expect(await wstETHPriceFeed.updateTimeLimit()).to.eq(newUpdateTimeLimit);
      expect(await wstETHPriceFeed.fallbackUpdateTimeLimit()).to.eq(newFallbackUpdateTimeLimit);
    });

    it("allows setting fallback to zero address", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newUpdateTimeLimit = time.duration.minutes(10);

      await wstETHPriceFeed.setPriceFeeds(
        newStETHPriceFeed,
        ZERO_ADDRESS,
        newUpdateTimeLimit,
        0 // can be 0 when no fallback
      );

      expect(await wstETHPriceFeed.stETHtoETHPriceFeed()).to.eq(newStETHPriceFeed);
      expect(await wstETHPriceFeed.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
      expect(await wstETHPriceFeed.updateTimeLimit()).to.eq(newUpdateTimeLimit);
      expect(await wstETHPriceFeed.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("emits event when price feeds are set with fallback", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;
      const newUpdateTimeLimit = time.duration.minutes(10);
      const newFallbackUpdateTimeLimit = time.duration.minutes(15);

      await expect(wstETHPriceFeed.setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed, newUpdateTimeLimit, newFallbackUpdateTimeLimit))
        .to.emit(wstETHPriceFeed, "PriceFeedsSet")
        .withArgs(newStETHPriceFeed, newFallbackPriceFeed, newUpdateTimeLimit, newFallbackUpdateTimeLimit);
    });

    it("emits event when fallback is set to zero address", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newUpdateTimeLimit = time.duration.minutes(10);

      await expect(wstETHPriceFeed.setPriceFeeds(newStETHPriceFeed, ZERO_ADDRESS, newUpdateTimeLimit, 0))
        .to.emit(wstETHPriceFeed, "PriceFeedsSet")
        .withArgs(newStETHPriceFeed, ZERO_ADDRESS, newUpdateTimeLimit, 0);
    });

    it("reverts if stETHtoETHPriceFeed is zero address", async () => {
      await expect(
        wstETHPriceFeed.setPriceFeeds(ZERO_ADDRESS, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "ZeroAddress");
    });

    it("reverts if updateTimeLimit is zero", async () => {
      await expect(
        wstETHPriceFeed.setPriceFeeds(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          0, // zero update time limit
          FALLBACK_UPDATE_TIME_LIMIT
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallbackUpdateTimeLimit is zero when fallback is set", async () => {
      await expect(
        wstETHPriceFeed.setPriceFeeds(
          stETHPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          0 // zero fallback update time limit when fallback is set
        )
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "InvalidUpdateTimeLimit");
    });

    it("allows fallbackUpdateTimeLimit to be zero when fallback is zero address", async () => {
      await expect(
        wstETHPriceFeed.setPriceFeeds(
          stETHPriceFeed.address,
          ZERO_ADDRESS,
          UPDATE_TIME_LIMIT,
          0 // can be 0 when fallback is zero address
        )
      ).to.not.be.reverted;
    });

    it("reverts if called by non-authorized account", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await expect(
        wstETHPriceFeed
          .connect(attacker)
          .setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(wstETHPriceFeed, "Unauthorized");
    });

    it("dao can call setPriceFeeds", async () => {
      const newStETHPriceFeed = ethers.Wallet.createRandom().address;
      const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

      await expect(
        wstETHPriceFeed.connect(dao).setPriceFeeds(newStETHPriceFeed, newFallbackPriceFeed, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.not.be.reverted;
    });
  });

  describe("signed256 function", function () {
    it("converts valid uint256 to int256", async () => {
      // We can test this indirectly by ensuring no revert with valid operations
      const timeNow = await time.latest();
      await stETHPriceFeed.setRoundData(1, exp(1000, 18), timeNow, timeNow, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.not.be.reverted;
    });

    it("should handle maximum valid uint256 values", async () => {
      // The signed256 function should work with values up to type(int256).max
      const maxInt256 = ethers.BigNumber.from(2).pow(255).sub(1);

      // We can't directly test the signed256 function, but we can ensure
      // that calculations with large values don't cause reverts due to signed256
      const timeNow = await time.latest();

      // Use a large but valid price
      const largePrice = maxInt256.div(10n ** 20n); // Ensure no overflow in calculations
      await stETHPriceFeed.setRoundData(1, largePrice, timeNow, timeNow, 1);

      await expect(wstETHPriceFeed.latestRoundData()).to.not.be.reverted;
    });
  });
});
