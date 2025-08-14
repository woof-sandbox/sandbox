import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeMockERC20, time, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import {
  FaucetToken,
  PriceFeedWithFallback,
  PriceFeedWithFallback__factory,
  SimplePriceFeed,
  SimplePriceFeed__factory,
  ManagedSimplePriceFeed,
  ManagedSimplePriceFeed__factory,
} from "../../build/types";

describe("PriceFeedWithFallback", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let PriceFeedWithFallbackFactory: PriceFeedWithFallback__factory;
  let SimplePriceFeedFactory: SimplePriceFeed__factory;
  let ManagedSimplePriceFeedFactory: ManagedSimplePriceFeed__factory;

  let dao: SignerWithAddress;
  let authorized: SignerWithAddress;
  let attacker: SignerWithAddress;

  const DECIMALS = 8n;
  const DESCRIPTION = "Custom Price Feed with Fallback";
  const UPDATE_TIME_LIMIT = time.duration.minutes(2);
  const FALLBACK_UPDATE_TIME_LIMIT = time.duration.minutes(4);

  let underlyingToken: FaucetToken;
  let priceFeed: PriceFeedWithFallback;
  let underlyingPriceFeed: SimplePriceFeed;
  let fallbackPriceFeed: SimplePriceFeed;
  let sequencer: ManagedSimplePriceFeed;

  // Underlying price feed
  const underlyingPriceFeedPrice = exp(3500, 8);
  const underlyingPriceFeedDecimals = 8n;

  // Fallback price feed
  const fallbackPriceFeedPrice = exp(3000, 8);
  const fallbackPriceFeedDecimals = 8n;

  before(async function () {
    [dao, authorized, attacker] = await ethers.getSigners();

    PriceFeedWithFallbackFactory = (await ethers.getContractFactory("PriceFeedWithFallback")) as PriceFeedWithFallback__factory;
    SimplePriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
    ManagedSimplePriceFeedFactory = (await ethers.getContractFactory("ManagedSimplePriceFeed")) as ManagedSimplePriceFeed__factory;

    underlyingToken = await makeMockERC20({
      name: "Token",
      symbol: "TKN",
      decimals: 18,
    });

    underlyingPriceFeed = await SimplePriceFeedFactory.deploy(
      underlyingPriceFeedPrice,
      underlyingPriceFeedDecimals,
      underlyingToken.address
    );
    await underlyingPriceFeed.deployed();

    fallbackPriceFeed = await SimplePriceFeedFactory.deploy(fallbackPriceFeedPrice, fallbackPriceFeedDecimals, underlyingToken.address);
    await fallbackPriceFeed.deployed();

    // Sequencer with answer 0 (available)
    sequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
    await sequencer.deployed();

    priceFeed = await PriceFeedWithFallbackFactory.deploy(
      dao.address,
      sequencer.address,
      underlyingToken.address,
      underlyingPriceFeed.address,
      fallbackPriceFeed.address,
      UPDATE_TIME_LIMIT,
      FALLBACK_UPDATE_TIME_LIMIT,
      DECIMALS,
      DESCRIPTION
    );
    await priceFeed.deployed();

    // Set authorized user (contractor)
    await priceFeed.connect(dao).setContractor(authorized.address);

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", function () {
    it("sets all values properly", async function () {
      expect(await priceFeed.dao()).to.eq(dao.address);
      expect(await priceFeed.sequencer()).to.eq(sequencer.address);
      expect(await priceFeed.underlyingToken()).to.eq(underlyingToken.address);
      expect(await priceFeed.underlyingPriceFeed()).to.eq(underlyingPriceFeed.address);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(fallbackPriceFeed.address);
      expect(await priceFeed.updateTimeLimit()).to.eq(UPDATE_TIME_LIMIT);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
      expect(await priceFeed.decimals()).to.eq(DECIMALS);
      expect(await priceFeed.description()).to.eq(DESCRIPTION);
      expect(await priceFeed.version()).to.eq(1);
    });

    it("reverts if underlying token is zero address", async function () {
      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          ZERO_ADDRESS,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          0,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if decimals is greater than 18", async function () {
      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          19,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      // Skip on mainnet chain id (1)
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          ZERO_ADDRESS,
          underlyingToken.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          ZERO_ADDRESS,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if underlying price feed update time limit is zero", async function () {
      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          0,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallback price feed update time limit is zero when fallback is set", async function () {
      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          0,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("allows fallback price feed update time limit to be zero when fallback is not set", async function () {
      const priceFeedWithoutFallback = await PriceFeedWithFallbackFactory.deploy(
        dao.address,
        sequencer.address,
        underlyingToken.address,
        underlyingPriceFeed.address,
        ZERO_ADDRESS,
        UPDATE_TIME_LIMIT,
        0,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallback.deployed();

      expect(await priceFeedWithoutFallback.fallbackUpdateTimeLimit()).to.eq(0);
      expect(await priceFeedWithoutFallback.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
    });

    it("reverts if decimals do not match for underlying price feed", async function () {
      const differentDecimalsPriceFeed = await SimplePriceFeedFactory.deploy(underlyingPriceFeedPrice, 18n, underlyingToken.address);
      await differentDecimalsPriceFeed.deployed();

      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          differentDecimalsPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "DecimalsNotMatched");
    });

    it("reverts if decimals do not match for fallback price feed", async function () {
      const differentDecimalsPriceFeed = await SimplePriceFeedFactory.deploy(fallbackPriceFeedPrice, 18n, underlyingToken.address);
      await differentDecimalsPriceFeed.deployed();

      await expect(
        PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          underlyingPriceFeed.address,
          differentDecimalsPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "DecimalsNotMatched");
    });

    it("emits SequencerUpdated event", async function () {
      expect(
        await PriceFeedWithFallbackFactory.deploy(
          dao.address,
          sequencer.address,
          underlyingToken.address,
          underlyingPriceFeed.address,
          fallbackPriceFeed.address,
          UPDATE_TIME_LIMIT,
          FALLBACK_UPDATE_TIME_LIMIT,
          DECIMALS,
          DESCRIPTION
        )
      )
        .to.emit(priceFeed, "SequencerUpdated")
        .withArgs(sequencer.address);
    });

    it("emits PriceFeedsUpdated events", async function () {
      const newPriceFeed = await PriceFeedWithFallbackFactory.deploy(
        dao.address,
        sequencer.address,
        underlyingToken.address,
        underlyingPriceFeed.address,
        fallbackPriceFeed.address,
        UPDATE_TIME_LIMIT,
        FALLBACK_UPDATE_TIME_LIMIT,
        DECIMALS,
        DESCRIPTION
      );

      await expect(newPriceFeed.deployTransaction)
        .to.emit(newPriceFeed, "PriceFeedsUpdated")
        .withArgs(underlyingPriceFeed.address, UPDATE_TIME_LIMIT, true)
        .to.emit(newPriceFeed, "PriceFeedsUpdated")
        .withArgs(fallbackPriceFeed.address, FALLBACK_UPDATE_TIME_LIMIT, false);
    });
  });

  describe("setSequencer", function () {
    it("updates sequencer address", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await priceFeed.connect(dao).setSequencer(newSequencer.address);

      expect(await priceFeed.sequencer()).to.eq(newSequencer.address);
    });

    it("emits SequencerUpdated event", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await expect(priceFeed.connect(dao).setSequencer(newSequencer.address))
        .to.emit(priceFeed, "SequencerUpdated")
        .withArgs(newSequencer.address);
    });

    it("allows setting sequencer to zero address on mainnet", async function () {
      // we'll skip this test if not on mainnet
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId !== 1) {
        this.skip();
      }

      await priceFeed.connect(dao).setSequencer(ZERO_ADDRESS);
      expect(await priceFeed.sequencer()).to.eq(ZERO_ADDRESS);
    });

    it("reverts if caller is not dao", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await expect(priceFeed.connect(attacker).setSequencer(newSequencer.address)).to.be.revertedWithCustomError(priceFeed, "NotDao");
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(priceFeed.connect(dao).setSequencer(ZERO_ADDRESS)).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });

    it("reverts if current sequencer is a new one", async function () {
      const newSequencer = sequencer.address;

      await expect(priceFeed.setSequencer(newSequencer)).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });
  });

  describe("setPriceFeeds", function () {
    it("updates underlying and fallback price feeds", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeedFactory.deploy(exp(4000, 8), 8n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      const newFallbackPriceFeed = await SimplePriceFeedFactory.deploy(exp(3800, 8), 8n, underlyingToken.address);
      await newFallbackPriceFeed.deployed();

      await priceFeed
        .connect(authorized)
        .setPriceFeeds(newUnderlyingPriceFeed.address, newFallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      expect(await priceFeed.underlyingPriceFeed()).to.eq(newUnderlyingPriceFeed.address);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(newFallbackPriceFeed.address);
      expect(await priceFeed.updateTimeLimit()).to.eq(UPDATE_TIME_LIMIT);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(FALLBACK_UPDATE_TIME_LIMIT);
    });

    it("can set fallback to zero address", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeedFactory.deploy(exp(4000, 8), 8n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      await priceFeed
        .connect(authorized)
        .setPriceFeeds(newUnderlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT);

      expect(await priceFeed.underlyingPriceFeed()).to.eq(newUnderlyingPriceFeed.address);
      expect(await priceFeed.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("emits PriceFeedsUpdated events", async function () {
      const newUnderlyingPriceFeed = await SimplePriceFeedFactory.deploy(exp(4000, 8), 8n, underlyingToken.address);
      await newUnderlyingPriceFeed.deployed();

      const newFallbackPriceFeed = await SimplePriceFeedFactory.deploy(exp(3800, 8), 8n, underlyingToken.address);
      await newFallbackPriceFeed.deployed();

      await expect(
        priceFeed
          .connect(authorized)
          .setPriceFeeds(newUnderlyingPriceFeed.address, newFallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      )
        .to.emit(priceFeed, "PriceFeedsUpdated")
        .withArgs(newUnderlyingPriceFeed.address, UPDATE_TIME_LIMIT, true)
        .to.emit(priceFeed, "PriceFeedsUpdated")
        .withArgs(newFallbackPriceFeed.address, FALLBACK_UPDATE_TIME_LIMIT, false);
    });

    it("reverts if caller is not authorized", async function () {
      await expect(
        priceFeed
          .connect(attacker)
          .setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "Unauthorized");
    });

    it("reverts if underlying price feed is zero address", async function () {
      await expect(
        priceFeed.connect(authorized).setPriceFeeds(ZERO_ADDRESS, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if underlying update time limit is zero", async function () {
      await expect(
        priceFeed.connect(authorized).setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, 0, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("reverts if fallback update time limit is zero when fallback is set", async function () {
      await expect(
        priceFeed.connect(authorized).setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, 0)
      ).to.be.revertedWithCustomError(priceFeed, "InvalidUpdateTimeLimit");
    });

    it("allows fallback update time limit to be zero when fallback is not set", async function () {
      await priceFeed.connect(authorized).setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, 0);

      expect(await priceFeed.fallbackPriceFeed()).to.eq(ZERO_ADDRESS);
      expect(await priceFeed.fallbackUpdateTimeLimit()).to.eq(0);
    });

    it("reverts if decimals do not match for underlying price feed", async function () {
      const differentDecimalsPriceFeed = await SimplePriceFeedFactory.deploy(exp(4000, 18), 18n, underlyingToken.address);
      await differentDecimalsPriceFeed.deployed();

      await expect(
        priceFeed
          .connect(authorized)
          .setPriceFeeds(differentDecimalsPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "DecimalsNotMatched");
    });

    it("reverts if decimals do not match for fallback price feed", async function () {
      const differentDecimalsPriceFeed = await SimplePriceFeedFactory.deploy(exp(3800, 18), 18n, underlyingToken.address);
      await differentDecimalsPriceFeed.deployed();

      await expect(
        priceFeed
          .connect(authorized)
          .setPriceFeeds(underlyingPriceFeed.address, differentDecimalsPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "DecimalsNotMatched");
    });
  });

  describe("latestRoundData", function () {
    beforeEach(async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPriceFeedPrice, currentTime, currentTime, 2);
      await sequencer.setRoundData(3, 0, currentTime, currentTime, 3); // Sequencer available
    });

    it("returns price from underlying feed when all conditions are met", async function () {
      const [roundId, answer, , , answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(1);
      expect(answer).to.eq(underlyingPriceFeedPrice);
      expect(answeredInRound).to.eq(1);
    });

    it("reverts when sequencer is down", async function () {
      await sequencer.setRoundData(3, 1, await time.latest(), await time.latest(), 3); // Sequencer down

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("uses fallback when underlying price is zero", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);

      const [roundId, answer, , , answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(2);
      expect(answer).to.eq(fallbackPriceFeedPrice);
      expect(answeredInRound).to.eq(2);
    });

    it("uses fallback when underlying price is negative", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, -1000, currentTime, currentTime, 1);

      const [roundId, answer, , , answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(2);
      expect(answer).to.eq(fallbackPriceFeedPrice);
      expect(answeredInRound).to.eq(2);
    });

    it("uses fallback when underlying price is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT;

      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, staleTime, staleTime, 1);

      const [roundId, answer, , , answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(2);
      expect(answer).to.eq(fallbackPriceFeedPrice);
      expect(answeredInRound).to.eq(2);
    });

    it("reverts when fallback is not set and underlying fails", async function () {
      // Set fallback to zero address
      await priceFeed.connect(authorized).setPriceFeeds(underlyingPriceFeed.address, ZERO_ADDRESS, UPDATE_TIME_LIMIT, 0);

      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when both underlying and fallback prices are invalid", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, 0, currentTime, currentTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when both underlying and fallback prices are negative", async function () {
      const currentTime = await time.latest();
      await underlyingPriceFeed.setRoundData(1, -1000, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, -2000, currentTime, currentTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback price is also stale", async function () {
      const currentTime = await time.latest();
      const underlyingStaleTime = currentTime - UPDATE_TIME_LIMIT;
      const fallbackStaleTime = currentTime - FALLBACK_UPDATE_TIME_LIMIT;

      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, underlyingStaleTime, underlyingStaleTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPriceFeedPrice, fallbackStaleTime, fallbackStaleTime, 2);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("returns fallback price at exact staleness threshold", async function () {
      const currentTime = await time.latest();
      const exactThresholdTime = currentTime - FALLBACK_UPDATE_TIME_LIMIT + 2;

      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(2, fallbackPriceFeedPrice, exactThresholdTime, exactThresholdTime, 2);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(2);
      expect(answer).to.eq(fallbackPriceFeedPrice);
      expect(startedAt).to.eq(exactThresholdTime);
      expect(updatedAt).to.eq(exactThresholdTime);
      expect(answeredInRound).to.eq(2);
    });

    it("returns correct round data from underlying feed", async function () {
      const currentTime = await time.latest();
      const testRoundId = 10;
      const testStartedAt = currentTime - 100;
      const testAnsweredInRound = 10;

      await underlyingPriceFeed.setRoundData(testRoundId, underlyingPriceFeedPrice, testStartedAt, currentTime, testAnsweredInRound);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(testRoundId);
      expect(answer).to.eq(underlyingPriceFeedPrice);
      expect(startedAt).to.eq(testStartedAt);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(testAnsweredInRound);
    });

    it("returns correct round data from fallback feed when underlying fails", async function () {
      const currentTime = await time.latest();
      const testRoundId = 20;
      const testStartedAt = currentTime - 50;
      const testAnsweredInRound = 20;

      await underlyingPriceFeed.setRoundData(1, 0, currentTime, currentTime, 1);
      await fallbackPriceFeed.setRoundData(testRoundId, fallbackPriceFeedPrice, testStartedAt, currentTime, testAnsweredInRound);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(testRoundId);
      expect(answer).to.eq(fallbackPriceFeedPrice);
      expect(startedAt).to.eq(testStartedAt);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(testAnsweredInRound);
    });

    it("returns underlying price when exactly at staleness threshold", async function () {
      const currentTime = await time.latest();
      const exactThresholdTime = currentTime - UPDATE_TIME_LIMIT + 1;

      await underlyingPriceFeed.setRoundData(1, underlyingPriceFeedPrice, exactThresholdTime, exactThresholdTime, 1);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      expect(roundId).to.eq(1);
      expect(answer).to.eq(underlyingPriceFeedPrice);
      expect(startedAt).to.eq(exactThresholdTime);
      expect(updatedAt).to.eq(exactThresholdTime);
      expect(answeredInRound).to.eq(1);
    });
  });

  describe("Access Control Integration", function () {
    it("dao can call onlyDao functions", async function () {
      const newSequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
      await newSequencer.deployed();

      await expect(priceFeed.connect(dao).setSequencer(newSequencer.address)).to.not.be.reverted;
    });

    it("authorized user can call onlyAuthorized functions", async function () {
      await expect(
        priceFeed
          .connect(authorized)
          .setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.not.be.reverted;
    });

    it("dao can add and remove authorized users", async function () {
      const newAuthorized = attacker; // Reuse attacker as new authorized user

      await priceFeed.connect(dao).setContractor(newAuthorized.address);

      await expect(
        priceFeed
          .connect(newAuthorized)
          .setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.not.be.reverted;

      await priceFeed.connect(dao).setContractor(ZERO_ADDRESS);

      await expect(
        priceFeed
          .connect(newAuthorized)
          .setPriceFeeds(underlyingPriceFeed.address, fallbackPriceFeed.address, UPDATE_TIME_LIMIT, FALLBACK_UPDATE_TIME_LIMIT)
      ).to.be.revertedWithCustomError(priceFeed, "Unauthorized");
    });
  });
});
