import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeMockERC20, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  FaucetToken,
  MultiplicativePriceFeed,
  MultiplicativePriceFeed__factory,
  SimplePriceFeed,
  SimplePriceFeed__factory,
} from "../../build/types";

describe("Multiplicative Price Feed", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let MultiplicativePriceFeedFactory: MultiplicativePriceFeed__factory;
  let SimplePriceFeed: SimplePriceFeed__factory;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  const DECIMALS = 8n;
  const DESCRIPTION = "TokenA*TokenB Price Feed";
  const UPDATE_TIME_LIMIT_A = time.duration.minutes(2);
  const UPDATE_TIME_LIMIT_B = time.duration.minutes(3);
  const UPDATE_TIME_LIMIT_FALLBACK_A = time.duration.minutes(4);
  const UPDATE_TIME_LIMIT_FALLBACK_B = time.duration.minutes(5);

  let underlyingToken: FaucetToken;
  let priceFeed: MultiplicativePriceFeed;
  let priceFeedA: SimplePriceFeed;
  let priceFeedB: SimplePriceFeed;
  let fallbackPriceFeedA: SimplePriceFeed;
  let fallbackPriceFeedB: SimplePriceFeed;

  // Price feed A (TokenA/USD) - 8 decimals
  const priceFeedAPrice = exp(100, 8); // $1.00
  const priceFeedADecimals = 8n;

  // Price feed B (TokenB/USD) - 8 decimals
  const priceFeedBPrice = exp(2500, 8); // $25.00
  const priceFeedBDecimals = 8n;

  // Fallback price feed A (TokenA/USD) - 18 decimals
  const fallbackPriceFeedAPrice = exp(95, 16); // $0.95
  const fallbackPriceFeedADecimals = 18n;

  // Fallback price feed B (TokenB/USD) - 6 decimals
  const fallbackPriceFeedBPrice = exp(24, 6); // $24.00
  const fallbackPriceFeedBDecimals = 6n;

  before(async function () {
    [dao, attacker] = await ethers.getSigners();

    MultiplicativePriceFeedFactory = (await ethers.getContractFactory("MultiplicativePriceFeed")) as MultiplicativePriceFeed__factory;
    SimplePriceFeed = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;

    underlyingToken = await makeMockERC20({
      name: "TokenB",
      symbol: "TKNB",
      decimals: 18,
    });

    priceFeedA = await SimplePriceFeed.deploy(priceFeedAPrice, priceFeedADecimals, underlyingToken.address);
    await priceFeedA.deployed();

    priceFeedB = await SimplePriceFeed.deploy(priceFeedBPrice, priceFeedBDecimals, underlyingToken.address);
    await priceFeedB.deployed();

    fallbackPriceFeedA = await SimplePriceFeed.deploy(fallbackPriceFeedAPrice, fallbackPriceFeedADecimals, underlyingToken.address);
    await fallbackPriceFeedA.deployed();

    fallbackPriceFeedB = await SimplePriceFeed.deploy(fallbackPriceFeedBPrice, fallbackPriceFeedBDecimals, underlyingToken.address);
    await fallbackPriceFeedB.deployed();

    priceFeed = await MultiplicativePriceFeedFactory.deploy(
      dao.address,
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
      expect(await priceFeed.priceFeedScale()).to.eq(10n ** DECIMALS);
      expect(await priceFeed.priceFeedADecimals()).to.eq(priceFeedADecimals);
      expect(await priceFeed.priceFeedBDecimals()).to.eq(priceFeedBDecimals);
      expect(await priceFeed.fallbackPriceFeedADecimals()).to.eq(fallbackPriceFeedADecimals);
      expect(await priceFeed.fallbackPriceFeedBDecimals()).to.eq(fallbackPriceFeedBDecimals);
    });

    it("reverts if price feed A is zero address", async function () {
      await expect(
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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

    it("reverts if price feed B is zero address", async function () {
      await expect(
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
      const priceFeedWithoutFallbackA = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
      const priceFeedWithoutFallbackB = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
      const priceFeedWithoutFallbackA = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
      const priceFeedWithoutFallbackB = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
        MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
      const priceFeedA6 = await SimplePriceFeed.deploy(exp(1, 6), 6n, underlyingToken.address);
      await priceFeedA6.deployed();

      const priceFeedB18 = await SimplePriceFeed.deploy(exp(25, 18), 18n, underlyingToken.address);
      await priceFeedB18.deployed();

      const mixedDecimalPriceFeed = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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

      expect(await mixedDecimalPriceFeed.priceFeedA()).to.eq(priceFeedA6.address);
      expect(await mixedDecimalPriceFeed.priceFeedB()).to.eq(priceFeedB18.address);
    });

    it("emits PriceFeedSet events during construction", async function () {
      expect(
        await MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
        .withArgs(priceFeedA.address, priceFeedADecimals, UPDATE_TIME_LIMIT_A, true)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(priceFeedB.address, priceFeedBDecimals, UPDATE_TIME_LIMIT_B, false);
    });

    it("emits FallbackPriceFeedSet events during construction", async function () {
      expect(
        await MultiplicativePriceFeedFactory.deploy(
          dao.address,
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
        .withArgs(fallbackPriceFeedA.address, fallbackPriceFeedADecimals, UPDATE_TIME_LIMIT_FALLBACK_A, true)
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(fallbackPriceFeedB.address, fallbackPriceFeedBDecimals, UPDATE_TIME_LIMIT_FALLBACK_B, false);
    });
  });

  describe("setPriceFeeds", function () {
    it("updates all price feeds", async function () {
      const newPriceFeedA = await SimplePriceFeed.deploy(exp(200, 8), 8n, underlyingToken.address);
      await newPriceFeedA.deployed();

      const newPriceFeedB = await SimplePriceFeed.deploy(exp(3000, 8), 8n, underlyingToken.address);
      await newPriceFeedB.deployed();

      const newFallbackA = await SimplePriceFeed.deploy(exp(190, 18), 18n, underlyingToken.address);
      await newFallbackA.deployed();

      const newFallbackB = await SimplePriceFeed.deploy(exp(29, 6), 6n, underlyingToken.address);
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
    });

    it("emits PriceFeedSet events", async function () {
      const newPriceFeedA = await SimplePriceFeed.deploy(exp(200, 8), 8n, underlyingToken.address);
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
        .withArgs(newPriceFeedA.address, 8n, UPDATE_TIME_LIMIT_A, true)
        .to.emit(priceFeed, "PriceFeedSet")
        .withArgs(newPriceFeedB.address, 8n, UPDATE_TIME_LIMIT_B, false);
    });

    it("emits FallbackPriceFeedSet events", async function () {
      const newFallbackA = await SimplePriceFeed.deploy(exp(190, 18), 18n, underlyingToken.address);
      await newFallbackA.deployed();

      const newFallbackB = await SimplePriceFeed.deploy(exp(29, 6), 6n, underlyingToken.address);
      await newFallbackB.deployed();

      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          priceFeedB.address,
          newFallbackA.address,
          newFallbackB.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B
        )
      )
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(newFallbackA.address, 18n, UPDATE_TIME_LIMIT_FALLBACK_A, true)
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(newFallbackB.address, 6n, UPDATE_TIME_LIMIT_FALLBACK_B, false);
    });

    it("emits FallbackPriceFeedSet with zero address when removing fallbacks", async function () {
      await expect(
        priceFeed.setPriceFeeds(
          priceFeedA.address,
          priceFeedB.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          0,
          0
        )
      )
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(ZERO_ADDRESS, 0, 0, true)
        .to.emit(priceFeed, "FallbackPriceFeedSet")
        .withArgs(ZERO_ADDRESS, 0, 0, false);
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
      const validDecimalPriceFeed = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
      const maxDecimalPriceFeed = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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

      // Expected calculation: (priceA * priceB * priceFeedScale) / combinedScale
      // combinedScale = 10^(decimalsA + decimalsB) = 10^(8+8) = 10^16
      const expectedAnswer = (priceFeedAPrice * priceFeedBPrice * 10n ** DECIMALS) / 10n ** (priceFeedADecimals + priceFeedBDecimals);

      expect(roundId).to.eq(2); // From price feed B
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(2);
    });

    it("uses fallback price feed A when primary price feed A has zero price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Expected calculation using fallback A decimals
      const expectedAnswer =
        (fallbackPriceFeedAPrice * priceFeedBPrice * 10n ** DECIMALS) / 10n ** (fallbackPriceFeedADecimals + priceFeedBDecimals);

      expect(roundId).to.eq(2);
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(2); // From price feed B
    });

    it("uses fallback price feed A when primary price feed A has negative price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, -1000, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (fallbackPriceFeedAPrice * priceFeedBPrice * 10n ** DECIMALS) / 10n ** (fallbackPriceFeedADecimals + priceFeedBDecimals);

      expect(answer).to.eq(expectedAnswer);
      expect(roundId).to.eq(2);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(2); // From price feed B
    });

    it("uses fallback price feed A when primary price feed A is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT_A + 2;

      await priceFeedA.setRoundData(1, priceFeedAPrice, staleTime, staleTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, currentTime, currentTime, 2);
      await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);

      const [, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (fallbackPriceFeedAPrice * priceFeedBPrice * 10n ** DECIMALS) / 10n ** (fallbackPriceFeedADecimals + priceFeedBDecimals);

      expect(answer).to.eq(expectedAnswer);
    });

    it("uses fallback price feed B when primary price feed B has zero price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

      const [roundId, answer, startedAt, updatedAt, answeredInRound] = await priceFeed.latestRoundData();

      // Expected calculation using fallback B decimals
      const expectedAnswer =
        (priceFeedAPrice * fallbackPriceFeedBPrice * 10n ** DECIMALS) / 10n ** (priceFeedADecimals + fallbackPriceFeedBDecimals);

      expect(roundId).to.eq(4); // From fallback price feed B
      expect(answer).to.eq(expectedAnswer);
      expect(startedAt).to.eq(currentTime);
      expect(updatedAt).to.eq(currentTime);
      expect(answeredInRound).to.eq(4);
    });

    it("uses fallback price feed B when primary price feed B has negative price", async function () {
      const currentTime = await time.latest();
      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, -2000, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

      const [roundId, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (priceFeedAPrice * fallbackPriceFeedBPrice * 10n ** DECIMALS) / 10n ** (priceFeedADecimals + fallbackPriceFeedBDecimals);

      expect(roundId).to.eq(4);
      expect(answer).to.eq(expectedAnswer);
    });

    it("uses fallback price feed B when primary price feed B is stale", async function () {
      const currentTime = await time.latest();
      const staleTime = currentTime - UPDATE_TIME_LIMIT_B + 2;

      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, priceFeedBPrice, staleTime, staleTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

      const [roundId, answer, , ,] = await priceFeed.latestRoundData();

      const expectedAnswer =
        (priceFeedAPrice * fallbackPriceFeedBPrice * 10n ** DECIMALS) / 10n ** (priceFeedADecimals + fallbackPriceFeedBDecimals);

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

      // Expected calculation using both fallback decimals
      const expectedAnswer =
        (fallbackPriceFeedAPrice * fallbackPriceFeedBPrice * 10n ** DECIMALS) /
        10n ** (fallbackPriceFeedADecimals + fallbackPriceFeedBDecimals);

      expect(roundId).to.eq(4);
      expect(answer).to.eq(expectedAnswer);
    });

    it("reverts when primary price feed A is invalid and no fallback A is set", async function () {
      const priceFeedWithoutFallbackA = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
      const priceFeedWithoutFallbackB = await MultiplicativePriceFeedFactory.deploy(
        dao.address,
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
      const staleTime = currentTime - UPDATE_TIME_LIMIT_FALLBACK_B + 2;

      await priceFeedA.setRoundData(1, priceFeedAPrice, currentTime, currentTime, 1);
      await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
      await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, staleTime, staleTime, 4);

      await expect(priceFeed.latestRoundData()).to.be.revertedWithCustomError(priceFeed, "PriceNotAvailable");
    });

    describe("mathematical calculations", function () {
      const testCases = [
        {
          priceA: exp(1, 8),
          priceB: exp(30000, 8),
          decimalsA: 8,
          decimalsB: 8,
          expected: exp(30000, 8),
        },
        {
          priceA: exp(2.123456, 8),
          priceB: exp(31333.123, 8),
          decimalsA: 8,
          decimalsB: 8,
          expected: 6653450803308n,
        },
        {
          priceA: exp(100, 8),
          priceB: exp(30000, 8),
          decimalsA: 8,
          decimalsB: 8,
          expected: exp(3000000, 8),
        },
        {
          priceA: exp(1, 18),
          priceB: exp(1800, 8),
          decimalsA: 18,
          decimalsB: 8,
          expected: exp(1800, 8),
        },
        {
          priceA: exp(1.25, 18),
          priceB: exp(1800, 8),
          decimalsA: 18,
          decimalsB: 8,
          expected: exp(2250, 8),
        },
      ];

      for (const testCase of testCases) {
        it(`calculates ${testCase.priceA} (${testCase.decimalsA} decimals) * ${testCase.priceB} (${testCase.decimalsB} decimals) = ${testCase.expected}`, async function () {
          const testPriceFeedA = await SimplePriceFeed.deploy(testCase.priceA, testCase.decimalsA, underlyingToken.address);
          await testPriceFeedA.deployed();

          const testPriceFeedB = await SimplePriceFeed.deploy(testCase.priceB, testCase.decimalsB, underlyingToken.address);
          await testPriceFeedB.deployed();

          const testMultiplicativePriceFeed = await MultiplicativePriceFeedFactory.deploy(
            dao.address,
            testPriceFeedA.address,
            testPriceFeedB.address,
            ZERO_ADDRESS,
            ZERO_ADDRESS,
            underlyingToken.address,
            UPDATE_TIME_LIMIT_A,
            UPDATE_TIME_LIMIT_B,
            0,
            0,
            DECIMALS,
            DESCRIPTION
          );
          await testMultiplicativePriceFeed.deployed();

          const currentTime = await time.latest();
          await testPriceFeedA.setRoundData(1, testCase.priceA, currentTime, currentTime, 1);
          await testPriceFeedB.setRoundData(2, testCase.priceB, currentTime, currentTime, 2);

          const [, answer] = await testMultiplicativePriceFeed.latestRoundData();

          expect(answer).to.eq(testCase.expected);
        });
      }
    });

    describe("different decimal configurations", function () {
      it("handles mixed decimals: 6 and 18 decimal inputs with 8 decimal output", async function () {
        const priceFeedA6 = await SimplePriceFeed.deploy(exp(2, 6), 6n, underlyingToken.address);
        await priceFeedA6.deployed();

        const priceFeedB18 = await SimplePriceFeed.deploy(exp(1500, 18), 18n, underlyingToken.address);
        await priceFeedB18.deployed();

        const mixedDecimalPriceFeed = await MultiplicativePriceFeedFactory.deploy(
          dao.address,
          priceFeedA6.address,
          priceFeedB18.address,
          ZERO_ADDRESS,
          ZERO_ADDRESS,
          underlyingToken.address,
          UPDATE_TIME_LIMIT_A,
          UPDATE_TIME_LIMIT_B,
          UPDATE_TIME_LIMIT_FALLBACK_A,
          UPDATE_TIME_LIMIT_FALLBACK_B,
          8, // 8 decimals for output
          DESCRIPTION
        );
        await mixedDecimalPriceFeed.deployed();

        const currentTime = await time.latest();
        const priceA = exp(2, 6);
        const priceB = exp(1500, 18);

        await priceFeedA6.setRoundData(1, priceA, currentTime, currentTime, 1);
        await priceFeedB18.setRoundData(2, priceB, currentTime, currentTime, 2);

        const [roundId, answer, startedAt, updatedAt, answeredInRound] = await mixedDecimalPriceFeed.latestRoundData();

        // Expected: (priceA * priceB * 10^8) / 10^(6+18)
        const expectedAnswer = (priceA * priceB * 10n ** 8n) / 10n ** (6n + 18n);

        expect(answer).to.eq(expectedAnswer);
        expect(startedAt).to.eq(currentTime);
        expect(updatedAt).to.eq(currentTime);
        expect(answeredInRound).to.eq(2);
        expect(roundId).to.eq(2); // From price feed B
      });
    });

    describe("edge cases", function () {
      it("handles zero price from price feed A and price feed B", async function () {
        const currentTime = await time.latest();

        await priceFeedA.setRoundData(1, 0, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(2, 0, currentTime, currentTime, 2);
        await fallbackPriceFeedA.setRoundData(3, fallbackPriceFeedAPrice, currentTime, currentTime, 3);
        await fallbackPriceFeedB.setRoundData(4, fallbackPriceFeedBPrice, currentTime, currentTime, 4);

        const [, answer, , ,] = await priceFeed.latestRoundData();

        const expectedAnswer =
          (fallbackPriceFeedAPrice * fallbackPriceFeedBPrice * 10n ** DECIMALS) /
          10n ** (fallbackPriceFeedADecimals + fallbackPriceFeedBDecimals);
        expect(answer).to.eq(expectedAnswer);
      });

      it("handles very large price values", async function () {
        const largePriceA = exp(10000000, 8); // $100,000.00
        const largePriceB = exp(100000000, 8); // $1,000,000.00

        const currentTime = await time.latest();

        await priceFeedA.setRoundData(1, largePriceA, currentTime, currentTime, 1);
        await priceFeedB.setRoundData(2, largePriceB, currentTime, currentTime, 2);

        const [, answer, , ,] = await priceFeed.latestRoundData();

        const expectedAnswer = (largePriceA * largePriceB * 10n ** DECIMALS) / 10n ** (priceFeedADecimals + priceFeedBDecimals);
        expect(answer).to.eq(expectedAnswer);
      });

      it("returns round data from active price feed B", async function () {
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
