import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeMockERC20, time, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import {
  FaucetToken,
  ReverseMultiplicativePriceFeed,
  ReverseMultiplicativePriceFeed__factory,
  SimplePriceFeed,
  SimplePriceFeed__factory,
  ManagedSimplePriceFeed,
  ManagedSimplePriceFeed__factory,
} from "../../build/types";

describe("Reverse Multiplicative Price Feed", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let ReverseMultiplicativePriceFeedFactory: ReverseMultiplicativePriceFeed__factory;
  let SimplePriceFeed: SimplePriceFeed__factory;
  let ManagedSimplePriceFeedFactory: ManagedSimplePriceFeed__factory;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  const DECIMALS = 8n;
  const DESCRIPTION = "TokenX/ETH Price Feed";
  const UPDATE_TIME_LIMIT_A = time.duration.minutes(2);
  const UPDATE_TIME_LIMIT_B = time.duration.minutes(3);
  const UPDATE_TIME_LIMIT_FALLBACK_A = time.duration.minutes(4);
  const UPDATE_TIME_LIMIT_FALLBACK_B = time.duration.minutes(5);

  let underlyingToken: FaucetToken;
  let priceFeed: ReverseMultiplicativePriceFeed;
  let priceFeedA: SimplePriceFeed;
  let priceFeedB: SimplePriceFeed;
  let fallbackPriceFeedA: SimplePriceFeed;
  let fallbackPriceFeedB: SimplePriceFeed;
  let sequencer: ManagedSimplePriceFeed;

  // Price feed A (TokenX/USD) - 8 decimals
  const priceFeedAPrice = exp(5000, 8); // $50.00
  const priceFeedADecimals = 8n;

  // Price feed B (ETH/USD) - 8 decimals
  const priceFeedBPrice = exp(2500, 8); // $2500.00
  const priceFeedBDecimals = 8n;

  // Fallback price feed A (TokenX/USD) - 18 decimals
  const fallbackPriceFeedAPrice = exp(4800, 18); // $48.00
  const fallbackPriceFeedADecimals = 18n;

  // Fallback price feed B (ETH/USD) - 6 decimals
  const fallbackPriceFeedBPrice = exp(2400, 6); // $2400.00
  const fallbackPriceFeedBDecimals = 6n;

  before(async function () {
    [dao, attacker] = await ethers.getSigners();

    ReverseMultiplicativePriceFeedFactory = (await ethers.getContractFactory(
      "ReverseMultiplicativePriceFeed"
    )) as ReverseMultiplicativePriceFeed__factory;
    SimplePriceFeed = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
    ManagedSimplePriceFeedFactory = (await ethers.getContractFactory("ManagedSimplePriceFeed")) as ManagedSimplePriceFeed__factory;

    underlyingToken = await makeMockERC20({
      name: "TokenX",
      symbol: "TKNX",
      decimals: 18,
    });

    // Sequencer with answer 0 (available)
    sequencer = await ManagedSimplePriceFeedFactory.deploy(0, 8, underlyingToken.address);
    await sequencer.deployed();

    priceFeedA = await SimplePriceFeed.deploy(priceFeedAPrice, priceFeedADecimals, underlyingToken.address);
    await priceFeedA.deployed();

    priceFeedB = await SimplePriceFeed.deploy(priceFeedBPrice, priceFeedBDecimals, underlyingToken.address);
    await priceFeedB.deployed();

    fallbackPriceFeedA = await SimplePriceFeed.deploy(fallbackPriceFeedAPrice, fallbackPriceFeedADecimals, underlyingToken.address);
    await fallbackPriceFeedA.deployed();

    fallbackPriceFeedB = await SimplePriceFeed.deploy(fallbackPriceFeedBPrice, fallbackPriceFeedBDecimals, underlyingToken.address);
    await fallbackPriceFeedB.deployed();

    priceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
      dao.address,
      sequencer.address,
      priceFeedA.address,
      priceFeedB.address,
      fallbackPriceFeedA.address,
      fallbackPriceFeedB.address,
      underlyingToken.address,
      UPDATE_TIME_LIMIT_A,
      UPDATE_TIME_LIMIT_B,
      UPDATE_TIME_LIMIT_FALLBACK_A,
      UPDATE_TIME_LIMIT_FALLBACK_B,
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
      expect(await priceFeed.priceFeedA()).to.eq(priceFeedA.address);
      expect(await priceFeed.priceFeedB()).to.eq(priceFeedB.address);
      expect(await priceFeed.fallbackPriceFeedA()).to.eq(fallbackPriceFeedA.address);
      expect(await priceFeed.fallbackPriceFeedB()).to.eq(fallbackPriceFeedB.address);
      expect(await priceFeed.updateTimeLimitA()).to.eq(UPDATE_TIME_LIMIT_A);
      expect(await priceFeed.updateTimeLimitB()).to.eq(UPDATE_TIME_LIMIT_B);
      expect(await priceFeed.updateTimeLimitFallbackA()).to.eq(UPDATE_TIME_LIMIT_FALLBACK_A);
      expect(await priceFeed.updateTimeLimitFallbackB()).to.eq(UPDATE_TIME_LIMIT_FALLBACK_B);
      expect(await priceFeed.decimals()).to.eq(DECIMALS);
      expect(await priceFeed.description()).to.eq(DESCRIPTION);
      expect(await priceFeed.underlyingToken()).to.eq(underlyingToken.address);
      expect(await priceFeed.version()).to.eq(1);
      expect(await priceFeed.sequencer()).to.eq(sequencer.address);
    });

    it("emits SequencerUpdated event", async function () {
      expect(
        await ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      )
        .to.emit(priceFeed, "SequencerUpdated")
        .withArgs(sequencer.address);
    });

    it("sets price feed scales properly", async function () {
      const priceFeedAScale = await priceFeed.priceFeedAScale();
      const priceFeedBScale = await priceFeed.priceFeedBScale();
      const fallbackPriceFeedAScale = await priceFeed.fallbackPriceFeedAScale();
      const fallbackPriceFeedBScale = await priceFeed.fallbackPriceFeedBScale();
      const priceFeedScale = await priceFeed.priceFeedScale();

      expect(priceFeedAScale).to.eq(10n ** priceFeedADecimals);
      expect(priceFeedBScale).to.eq(10n ** priceFeedBDecimals);
      expect(fallbackPriceFeedAScale).to.eq(10n ** fallbackPriceFeedADecimals);
      expect(fallbackPriceFeedBScale).to.eq(10n ** fallbackPriceFeedBDecimals);
      expect(priceFeedScale).to.eq(10n ** DECIMALS);
    });

    it("reverts if price feed A is zero address", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          ZERO_ADDRESS,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if sequencer is zero address on non-mainnet", async function () {
      // Skip on mainnet chain id (1)
      const currentChainId = await ethers.provider.getNetwork().then(n => n.chainId);
      if (currentChainId === 1) {
        this.skip();
      }

      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          ZERO_ADDRESS,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "InvalidSequencer");
    });

    it("reverts if price feed B is zero address", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          ZERO_ADDRESS,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("allows fallback price feed A to be zero address", async function () {
      const priceFeedWithoutFallbackA = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        ZERO_ADDRESS,
        fallbackPriceFeedB.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallbackA.deployed();

      expect(await priceFeedWithoutFallbackA.fallbackPriceFeedA()).to.eq(ZERO_ADDRESS);
    });

    it("allows fallback price feed B to be zero address", async function () {
      const priceFeedWithoutFallbackB = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        fallbackPriceFeedA.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallbackB.deployed();

      expect(await priceFeedWithoutFallbackB.fallbackPriceFeedB()).to.eq(ZERO_ADDRESS);
    });

    it("reverts if update time limit A is zero", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          0,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("reverts if update time limit B is zero", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          0,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("reverts if fallback update time limit A is zero when fallback A is set", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          0,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("reverts if fallback update time limit B is zero when fallback B is set", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          0,
          DECIMALS,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("allows fallback update time limit A to be zero when fallback A is not set", async function () {
      const priceFeedWithoutFallbackA = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        ZERO_ADDRESS,
        fallbackPriceFeedB.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        0,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallbackA.deployed();

      expect(await priceFeedWithoutFallbackA.updateTimeLimitFallbackA()).to.eq(0);
    });

    it("allows fallback update time limit B to be zero when fallback B is not set", async function () {
      const priceFeedWithoutFallbackB = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        fallbackPriceFeedA.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        0,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallbackB.deployed();

      expect(await priceFeedWithoutFallbackB.updateTimeLimitFallbackB()).to.eq(0);
    });

    it("reverts if decimals is zero", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          0,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts if decimals is greater than 18", async function () {
      await expect(
        ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          19,
          DESCRIPTION
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("works with different price feed decimals", async function () {
      const priceFeedA6 = await SimplePriceFeed.deploy(exp(50, 6), 6n, underlyingToken.address);
      await priceFeedA6.deployed();

      const priceFeedB18 = await SimplePriceFeed.deploy(exp(2500, 18), 18n, underlyingToken.address);
      await priceFeedB18.deployed();

      const mixedDecimalPriceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA6.address,
        priceFeedB18.address,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        DECIMALS,
        DESCRIPTION
      );
      await mixedDecimalPriceFeed.deployed();

      expect(await mixedDecimalPriceFeed.priceFeedAScale()).to.eq(10n ** 6n);
      expect(await mixedDecimalPriceFeed.priceFeedBScale()).to.eq(10n ** 18n);
    });

    it("emits PriceFeedSet events during construction", async function () {
      expect(
        await ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      )
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(priceFeedA.address, 10n ** priceFeedADecimals, UPDATE_TIME_LIMIT_A, true)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(priceFeedB.address, 10n ** priceFeedBDecimals, UPDATE_TIME_LIMIT_B, false);
    });

    it("emits FallbackPriceFeedSet events during construction", async function () {
      expect(
        await ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          DECIMALS,
          DESCRIPTION
        )
      )
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(fallbackPriceFeedA.address, UPDATE_TIME_LIMIT_FALLBACK_A, true)
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(fallbackPriceFeedB.address, UPDATE_TIME_LIMIT_FALLBACK_B, false);
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
    it("updates all price feeds and scales", async function () {
      const newPriceFeedA = await SimplePriceFeed.deploy(exp(6000, 8), 8n, underlyingToken.address);
      await newPriceFeedA.deployed();

      const newPriceFeedB = await SimplePriceFeed.deploy(exp(3000, 8), 8n, underlyingToken.address);
      await newPriceFeedB.deployed();

      const newFallbackA = await SimplePriceFeed.deploy(exp(5800, 18), 18n, underlyingToken.address);
      await newFallbackA.deployed();

      const newFallbackB = await SimplePriceFeed.deploy(exp(2900, 6), 6n, underlyingToken.address);
      await newFallbackB.deployed();

      await priceFeed.setPriceFeeds(
        newPriceFeedA.address,
        newPriceFeedB.address,
        newFallbackA.address,
        newFallbackB.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B
      );

      expect(await priceFeed.priceFeedA()).to.eq(newPriceFeedA.address);
      expect(await priceFeed.priceFeedB()).to.eq(newPriceFeedB.address);
      expect(await priceFeed.fallbackPriceFeedA()).to.eq(newFallbackA.address);
      expect(await priceFeed.fallbackPriceFeedB()).to.eq(newFallbackB.address);

      expect(await priceFeed.priceFeedAScale()).to.eq(10n ** 8n);
      expect(await priceFeed.priceFeedBScale()).to.eq(10n ** 8n);
      expect(await priceFeed.fallbackPriceFeedAScale()).to.eq(10n ** 18n);
      expect(await priceFeed.fallbackPriceFeedBScale()).to.eq(10n ** 6n);
    });

    it("reverts when sequencer is down", async function () {
      await sequencer.setRoundData(3, 1, await time.latest(), await time.latest(), 3); // Sequencer down

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("updates update time limits", async function () {
      const newUpdateTimeLimitA = time.duration.minutes(5);
      const newUpdateTimeLimitB = time.duration.minutes(6);
      const newUpdateTimeLimitFallbackA = time.duration.minutes(7);
      const newUpdateTimeLimitFallbackB = time.duration.minutes(8);

      await priceFeed.setPriceFeeds(
        priceFeedA.address,
        priceFeedB.address,
        fallbackPriceFeedA.address,
        fallbackPriceFeedB.address,
        newUpdateTimeLimitA,
        newUpdateTimeLimitB,
        newUpdateTimeLimitFallbackA,
        newUpdateTimeLimitFallbackB
      );

      expect(await priceFeed.updateTimeLimitA()).to.eq(newUpdateTimeLimitA);
      expect(await priceFeed.updateTimeLimitB()).to.eq(newUpdateTimeLimitB);
      expect(await priceFeed.updateTimeLimitFallbackA()).to.eq(newUpdateTimeLimitFallbackA);
      expect(await priceFeed.updateTimeLimitFallbackB()).to.eq(newUpdateTimeLimitFallbackB);
    });

    it("allows setting fallback feeds to zero address", async function () {
      await priceFeed.setPriceFeeds(
        priceFeedA.address,
        priceFeedB.address,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        0,
        0
      );

      expect(await priceFeed.fallbackPriceFeedA()).to.eq(ZERO_ADDRESS);
      expect(await priceFeed.fallbackPriceFeedB()).to.eq(ZERO_ADDRESS);
      expect(await priceFeed.updateTimeLimitFallbackA()).to.eq(0);
      expect(await priceFeed.updateTimeLimitFallbackB()).to.eq(0);
      expect(await priceFeed.fallbackPriceFeedAScale()).to.eq(0);
      expect(await priceFeed.fallbackPriceFeedBScale()).to.eq(0);
    });

    it("emits PriceFeedSet events", async function () {
      const newPriceFeedA = await SimplePriceFeed.deploy(exp(6000, 8), 8n, underlyingToken.address);
      await newPriceFeedA.deployed();

      const newPriceFeedB = await SimplePriceFeed.deploy(exp(3000, 8), 8n, underlyingToken.address);
      await newPriceFeedB.deployed();

      await expect(
        priceFeed.setPriceFeeds(
          newPriceFeedA.address,
          newPriceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      )
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(newPriceFeedA.address, 10n ** 8n, UPDATE_TIME_LIMIT_A, true)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(newPriceFeedB.address, 10n ** 8n, UPDATE_TIME_LIMIT_B, false);
    });

    it("emits FallbackPriceFeedSet events", async function () {
      const newFallbackA = await SimplePriceFeed.deploy(exp(5800, 18), 18n, underlyingToken.address);
      await newFallbackA.deployed();

      const newFallbackB = await SimplePriceFeed.deploy(exp(2900, 6), 6n, underlyingToken.address);
      await newFallbackB.deployed();

      const tx = priceFeed.setPriceFeeds(
        priceFeedA.address,
        priceFeedB.address,
        newFallbackA.address,
        newFallbackB.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B
      );

      await expect(tx)
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(newFallbackA.address, 10n ** 18n, UPDATE_TIME_LIMIT_FALLBACK_A, true);

      await expect(tx)
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(newFallbackB.address, 10n ** 6n, UPDATE_TIME_LIMIT_FALLBACK_B, false);
    });

    it("emits FallbackPriceFeedSet with zero address when removing fallbacks", async function () {
      const tx = priceFeed.setPriceFeeds(
        priceFeedA.address,
        priceFeedB.address,
        ZERO_ADDRESS,
        ZERO_ADDRESS,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        0,
        0
      );

      await expect(tx).to.emit(priceFeed, "FallbackPriceFeedSet").withArgs(ZERO_ADDRESS, 0, 0, true);

      await expect(tx).to.emit(priceFeed, "FallbackPriceFeedSet").withArgs(ZERO_ADDRESS, 0, 0, false);
    });

    it("reverts if price feed A is zero address", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          ZERO_ADDRESS,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if price feed B is zero address", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          ZERO_ADDRESS,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if caller is not authorized", async function () {
      await expect(
        priceFeed
          .connect(attacker)
          .setPriceFeeds(
            priceFeedA.address,
            priceFeedB.address,
            fallbackPriceFeedA.address,
            fallbackPriceFeedB.address,
            UPDATE_TIME_LIMIT_A,
            UPDATE_TIME_LIMIT_B,
            UPDATE_TIME_LIMIT_FALLBACK_A,
            UPDATE_TIME_LIMIT_FALLBACK_B
          )
      ).to.be.revertedWithCustomError(priceFeed, "Unauthorized");
    });

    it("dao can call setPriceFeeds", async function () {
      await expect(
        priceFeed
          .connect(dao)
          .setPriceFeeds(
            priceFeedA.address,
            priceFeedB.address,
            fallbackPriceFeedA.address,
            fallbackPriceFeedB.address,
            UPDATE_TIME_LIMIT_A,
            UPDATE_TIME_LIMIT_B,
            UPDATE_TIME_LIMIT_FALLBACK_A,
            UPDATE_TIME_LIMIT_FALLBACK_B
          )
      ).to.not.be.reverted;
    });

    it("reverts if update time limit A is zero", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          0,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("reverts if update time limit B is zero", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          UPDATE_TIME_LIMIT_A,
          0,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("reverts if fallback update time limit A is zero when fallback A is set", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          0,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });

    it("reverts if fallback update time limit B is zero when fallback B is set", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          0
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadUpdateTimeLimit");
    });
  });

  describe("signed256 function", function () {
    it("converts valid uint256 to int256", async function () {
      // We can test this indirectly by ensuring no revert with valid decimals
      const validDecimalPriceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        fallbackPriceFeedA.address,
        fallbackPriceFeedB.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        18,
        DESCRIPTION
      );
      await validDecimalPriceFeed.deployed();

      expect(await validDecimalPriceFeed.priceFeedScale()).to.eq(10n ** 18n);
    });

    it("should work with maximum valid decimals", async function () {
      const maxDecimalPriceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        fallbackPriceFeedA.address,
        fallbackPriceFeedB.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        18,
        DESCRIPTION
      );
      await maxDecimalPriceFeed.deployed();

      expect(await maxDecimalPriceFeed.priceFeedScale()).to.eq(10n ** 18n);
    });
  });

  describe("latestRoundData", function () {
    it("returns calculated price using both primary price feeds when both are valid", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Expected calculation: (priceA * priceFeedBScale * priceFeedScale) / priceB / priceFeedAScale
      const expectedAnswer = (priceFeedAPrice * 10n ** priceFeedBDecimals * 10n ** DECIMALS) / priceFeedBPrice / 10n ** priceFeedADecimals;

      expect(roundId).to.eq(2); // From price feed B
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(2);
    });

    it("uses fallback price feed A when primary price feed A has zero price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(4, priceFeedBPrice, currentTime, currentTime, 4);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Expected calculation using fallback A scale
      const expectedAnswer =
        (fallbackPriceFeedAPrice * 10n ** priceFeedBDecimals * 10n ** DECIMALS) / priceFeedBPrice / 10n ** fallbackPriceFeedADecimals;

      expect(roundId).to.eq(4); // From price feed B
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(4); // From price feed B
    });

    it("uses fallback price feed A when primary price feed A has negative price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, -1000, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);

      const [, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (fallbackPriceFeedAPrice * 10n ** priceFeedBDecimals * 10n ** DECIMALS) / priceFeedBPrice / 10n ** fallbackPriceFeedADecimals;

      expect(answer).to.eq(expectedAnswer);
    });

    it("uses fallback price feed A when primary price feed A is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT_A + 2; // 2 seconds additional because of 2 additional transactions

      await priceFeedA.setRoundData(1, priceFeedAPrice, staleTime, staleTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);

      const [, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (fallbackPriceFeedAPrice * 10n ** priceFeedBDecimals * 10n ** DECIMALS) / priceFeedBPrice / 10n ** fallbackPriceFeedADecimals;

      expect(answer).to.eq(expectedAnswer);
    });

    it("uses fallback price feed B when primary price feed B has zero price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Expected calculation using fallback B scale
      const expectedAnswer =
        (priceFeedAPrice * 10n ** fallbackPriceFeedBDecimals * 10n ** DECIMALS) / fallbackPriceFeedBPrice / 10n ** priceFeedADecimals;

      expect(roundId).to.eq(4); // From fallback price feed B
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(4); // From fallback price feed B
    });

    it("uses fallback price feed B when primary price feed B has negative price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, -2000, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

      const [roundId, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (priceFeedAPrice * 10n ** fallbackPriceFeedBDecimals * 10n ** DECIMALS) / fallbackPriceFeedBPrice / 10n ** priceFeedADecimals;

      expect(roundId).to.eq(4);
      expect(answer).to.eq(expectedAnswer);
    });

    it("uses fallback price feed B when primary price feed B is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT_B + 2; // 2 seconds additional because of 2 additional transactions

      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);
      await priceFeedB.setRoundData(2, priceFeedBPrice, staleTime, staleTime, 2);

      const [roundId, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (priceFeedAPrice * 10n ** fallbackPriceFeedBDecimals * 10n ** DECIMALS) / fallbackPriceFeedBPrice / 10n ** priceFeedADecimals;

      expect(roundId).to.eq(4);
      expect(answer).to.eq(expectedAnswer);
    });

    it("uses both fallback price feeds when both primary feeds are invalid", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, -1000, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

      const [roundId, answer, , ,] = await priceFeed.latestRoundData();

      // Expected calculation using both fallback scales
      const expectedAnswer =
        (fallbackPriceFeedAPrice * 10n ** fallbackPriceFeedBDecimals * 10n ** DECIMALS) /
        fallbackPriceFeedBPrice /
        10n ** fallbackPriceFeedADecimals;

      expect(roundId).to.eq(4);
      expect(answer).to.eq(expectedAnswer);
    });

    it("reverts when primary price feed A is invalid and no fallback A is set", async function () {
      const priceFeedWithoutFallbackA = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        ZERO_ADDRESS,
        fallbackPriceFeedB.address,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallbackA.deployed();

      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);

      await expect(priceFeedWithoutFallbackA.latestRoundData()).to.be.revertedWithCustomError(
        priceFeedWithoutFallbackA,
        "PriceNotAvailable"
      );
    });

    it("reverts when primary price feed B is invalid and no fallback B is set", async function () {
      const priceFeedWithoutFallbackB = await ReverseMultiplicativePriceFeedFactory.deploy(
        dao.address,
        sequencer.address,
        priceFeedA.address,
        priceFeedB.address,
        fallbackPriceFeedA.address,
        ZERO_ADDRESS,
        underlyingToken.address,
        UPDATE_TIME_LIMIT_A,
        UPDATE_TIME_LIMIT_B,
        UPDATE_TIME_LIMIT_FALLBACK_A,
        UPDATE_TIME_LIMIT_FALLBACK_B,
        DECIMALS,
        DESCRIPTION
      );
      await priceFeedWithoutFallbackB.deployed();

      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);

      await expect(priceFeedWithoutFallbackB.latestRoundData()).to.be.revertedWithCustomError(
        priceFeedWithoutFallbackB,
        "PriceNotAvailable"
      );
    });

    it("reverts when fallback price feed A has invalid price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, -1000, currentTime, currentTime, 3);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback price feed A is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT_FALLBACK_A + 2;

      await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, staleTime, staleTime, 3);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback price feed B has invalid price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, 0, currentTime, currentTime, 4);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    it("reverts when fallback price feed B is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT_FALLBACK_B + 2; // 2 seconds additional because of 2 additional transactions

      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, staleTime, staleTime, 4);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    describe("18 decimal price feed tests", function () {
      let eighteenDecimalPriceFeed: ReverseMultiplicativePriceFeed;
      let priceFeedA18: SimplePriceFeed;
      let priceFeedB18: SimplePriceFeed;

      beforeEach(async function () {
        // Create 18 decimal price feeds
        const priceFeedAPrice18 = exp(5000, 18); // $50.00 with 18 decimals
        const priceFeedBPrice18 = exp(2500, 18); // $2500.00 with 18 decimals

        priceFeedA18 = await SimplePriceFeed.deploy(priceFeedAPrice18, 18n, underlyingToken.address);
        await priceFeedA18.deployed();

        priceFeedB18 = await SimplePriceFeed.deploy(priceFeedBPrice18, 18n, underlyingToken.address);
        await priceFeedB18.deployed();

        eighteenDecimalPriceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA18.address,
          priceFeedB18.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          18, // 18 decimals for the price feed itself
          DESCRIPTION
        );
        await eighteenDecimalPriceFeed.deployed();
      });

      it("calculates price correctly with 18 decimal inputs and 18 decimal output", async function () {
        const currentTime = await time.latest();
        const priceA18 = exp(5000, 18);
        const priceB18 = exp(2500, 18);

        await priceFeedA18.setRoundData(1, priceA18, currentTime, currentTime, 1);
        await priceFeedB18.setRoundData(2, priceB18, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await eighteenDecimalPriceFeed.latestRoundData();

        // Expected: (priceA * 10^18 * 10^18) / priceB / 10^18 = (priceA * 10^18) / priceB
        const expectedAnswer = (priceA18 * 10n ** 18n) / priceB18;

        expect(answer).to.eq(expectedAnswer);
        expect(await eighteenDecimalPriceFeed.decimals()).to.eq(18);
        expect(roundId).to.eq(2); // From price feed B
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2); // From price feed B
      });

      it("handles high precision calculations with 18 decimals", async function () {
        const currentTime = await time.latest();
        const priceA18 = exp(123456789, 18); // Very precise price
        const priceB18 = exp(987654321, 18); // Very precise price

        await priceFeedA18.setRoundData(1, priceA18, currentTime, currentTime, 1);
        await priceFeedB18.setRoundData(2, priceB18, currentTime, currentTime, 2);

        const [, answer, , ,] = await eighteenDecimalPriceFeed.latestRoundData();

        const expectedAnswer = (priceA18 * 10n ** 18n) / priceB18;

        expect(answer).to.eq(expectedAnswer);
      });
    });

    describe("8 decimal price feed tests", function () {
      let eightDecimalPriceFeed: ReverseMultiplicativePriceFeed;

      beforeEach(async function () {
        eightDecimalPriceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA.address,
          priceFeedB.address,
          fallbackPriceFeedA.address,
          fallbackPriceFeedB.address,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          8, // 8 decimals for the price feed itself
          DESCRIPTION
        );
        await eightDecimalPriceFeed.deployed();
      });

      it("calculates price correctly with 8 decimal inputs and 8 decimal output", async function () {
        const currentTime = await time.latest();
        await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await eightDecimalPriceFeed.latestRoundData();

        // Expected: (priceA * 10^8 * 10^8) / priceB / 10^8 = (priceA * 10^8) / priceB
        const expectedAnswer = (priceFeedAPrice * 10n ** 8n) / priceFeedBPrice;

        expect(answer).to.eq(expectedAnswer);
        expect(await eightDecimalPriceFeed.decimals()).to.eq(8);
        expect(roundId).to.eq(2); // From price feed B
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2); // From price feed B
      });

      it("handles different price scenarios with 8 decimals", async function () {
        const currentTime = await time.latest();
        const priceA = exp(1000, 8); // $10.00
        const priceB = exp(200000, 8); // $2000.00

        await priceFeedA.setRoundData(1, priceA, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(2, priceB, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await eightDecimalPriceFeed.latestRoundData();

        const expectedAnswer = (priceA * 10n ** 8n) / priceB;

        expect(answer).to.eq(expectedAnswer);
        expect(roundId).to.eq(2); // From price feed B
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2); // From price feed B
      });
    });

    describe("mixed decimal configurations", function () {
      it("handles mixed decimals: 6 and 18 decimal inputs with 12 decimal output", async function () {
        const priceFeedA6 = await SimplePriceFeed.deploy(exp(50, 6), 6n, underlyingToken.address);
        await priceFeedA6.deployed();

        const priceFeedB18 = await SimplePriceFeed.deploy(exp(2500, 18), 18n, underlyingToken.address);
        await priceFeedB18.deployed();

        const mixedDecimalPriceFeed = await ReverseMultiplicativePriceFeedFactory.deploy(
          dao.address,
          sequencer.address,
          priceFeedA6.address,
          priceFeedB18.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          12, // 12 decimals for output
          DESCRIPTION
        );
        await mixedDecimalPriceFeed.deployed();

        const currentTime = await time.latest();
        const priceA = exp(50, 6);
        const priceB = exp(2500, 18);

        await priceFeedA6.setRoundData(1, priceA, currentTime, currentTime, 1);
        await priceFeedB18.setRoundData(2, priceB, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await mixedDecimalPriceFeed.latestRoundData();

        // Expected: (priceA * 10^18 * 10^12) / priceB / 10^6
        const expectedAnswer = (priceA * 10n ** 18n * 10n ** 12n) / priceB / 10n ** 6n;

        expect(answer).to.eq(expectedAnswer);
        expect(await mixedDecimalPriceFeed.decimals()).to.eq(12);
        expect(roundId).to.eq(2); // From price feed B
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2); // From price feed B
      });
    });

    describe("edge cases", function () {
      it("handles very large price differences", async function () {
        const currentTime = await time.latest();
        const smallPriceA = exp(1, 8); // $0.01
        const largePriceB = exp(1000000, 8); // $10,000.00

        await priceFeedA.setRoundData(1, smallPriceA, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(2, largePriceB, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

        const expectedAnswer = (smallPriceA * 10n ** 8n * 10n ** 8n) / largePriceB / 10n ** 8n;

        expect(answer).to.eq(expectedAnswer);
        expect(roundId).to.eq(2); // From price feed B
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2); // From price feed B
      });

      it("handles price at exact staleness threshold", async function () {
        const currentTime = await time.latest();
        const exactThresholdTime = currentTime - UPDATE_TIME_LIMIT_A + 2;

        await priceFeedA.setRoundData(1, priceFeedAPrice, exactThresholdTime, exactThresholdTime, 1);
        await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

        const expectedAnswer = (priceFeedAPrice * 10n ** 8n * 10n ** 8n) / priceFeedBPrice / 10n ** 8n;

        expect(answer).to.eq(expectedAnswer);
        expect(roundId).to.eq(2); // From price feed B
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2); // From price feed B
      });

      it("returns round data from the active price feed B", async function () {
        const currentTime = await time.latest();
        const testRoundId = 123;
        const testStartedAt = currentTime - 100;
        const testAnsweredInRound = 456;

        await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(testRoundId, priceFeedBPrice, testStartedAt, currentTime, testAnsweredInRound);

        const [roundId, , startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

        expect(roundId).to.eq(testRoundId);
        expect(startedAt).to.eq(testStartedAt);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(testAnsweredInRound);
      });

      it("returns round data from fallback price feed B when primary B fails", async function () {
        const currentTime = await time.latest();
        const fallbackRoundId = 789;
        const fallbackStartedAt = currentTime - 50;
        const fallbackAnsweredInRound = 999;

        await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
        await fallbackPriceFeedB.setRoundData(
          fallbackRoundId,
          fallbackPriceFeedBPrice,
          fallbackStartedAt,
          currentTime,
          fallbackAnsweredInRound
        );

        const [roundId, , startedAt, , answeredInRound] = await priceFeed.latestRoundData();

        expect(roundId).to.eq(fallbackRoundId);
        expect(startedAt).to.eq(fallbackStartedAt);
        expect(answeredInRound).to.eq(fallbackAnsweredInRound);
      });
    });
  });
});
