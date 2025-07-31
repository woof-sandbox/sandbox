import { ethers, exp, makeToken, SnapshotRestorer, takeSnapshot } from "../helper/helpers";
import {
  SimplePriceFeed__factory,
  MultiplicativePriceFeed__factory,
  SimplePriceFeed,
  MultiplicativePriceFeed,
  FaucetToken,
} from "../../build/types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

export async function makeMultiplicativePriceFeed({ priceA, priceB, decimalsA = 8, decimalsB = 8 }) {
  const [owner, dao, attacker] = await ethers.getSigners();

  const tokenA = await makeToken({ name: "PriceFeedA", symbol: "PF_A", decimals: decimalsA });
  const tokenB = await makeToken({ name: "PriceFeedB", symbol: "PF_B", decimals: decimalsB });

  const SimplePriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
  const PriceFeedA = await SimplePriceFeedFactory.deploy(priceA, decimalsA, tokenA.address);
  await PriceFeedA.deployed();

  const PriceFeedB = await SimplePriceFeedFactory.deploy(priceB, decimalsB, tokenB.address);
  await PriceFeedB.deployed();

  const MultiplicativePriceFeedFactory = (await ethers.getContractFactory("MultiplicativePriceFeed")) as MultiplicativePriceFeed__factory;
  const MultiplicativePriceFeed = await MultiplicativePriceFeedFactory.deploy(
    PriceFeedA.address,
    PriceFeedB.address,
    8,
    "Multiplicative Price Feed",
    tokenB.address,
    owner.address,
    dao.address
  );
  await MultiplicativePriceFeed.deployed();

  return {
    PriceFeedA,
    PriceFeedB,
    MultiplicativePriceFeed,
    owner,
    dao,
    attacker,
    tokenA,
    tokenB,
    MultiplicativePriceFeedFactory,
  };
}

const testCases = [
  // Existing test cases from WBTC price feed
  {
    priceA: exp(1, 8),
    priceB: exp(30_000, 8),
    result: exp(30_000, 8),
  },
  {
    priceA: exp(2.123456, 8),
    priceB: exp(31_333.123, 8),
    result: 6653450803308n,
  },
  {
    priceA: exp(100, 8),
    priceB: exp(30_000, 8),
    result: exp(3_000_000, 8),
  },
  {
    priceA: exp(0.9999, 8),
    priceB: exp(30_000, 8),
    result: exp(29_997, 8),
  },
  {
    priceA: exp(0.987937, 8),
    priceB: exp(31_947.71623, 8),
    result: 3156233092911n,
  },
  {
    priceA: exp(0.5, 8),
    priceB: exp(30_000, 8),
    result: exp(15_000, 8),
  },
  {
    priceA: exp(0.00555, 8),
    priceB: exp(30_000, 8),
    result: exp(166.5, 8),
  },
  {
    priceA: exp(0, 8),
    priceB: exp(30_000, 8),
    result: exp(0, 8),
  },
  {
    priceA: exp(1, 8),
    priceB: exp(0, 8),
    result: exp(0, 8),
  },
  {
    priceA: exp(0, 8),
    priceB: exp(0, 8),
    result: exp(0, 8),
  },
  // e.g. cbETH / ETH (18 decimals) and ETH / USD (8 decimals)
  {
    priceA: exp(1, 18),
    priceB: exp(1800, 8),
    decimalsA: 18,
    decimalsB: 8,
    result: exp(1800, 8),
  },
  {
    priceA: exp(1.25, 18),
    priceB: exp(1800, 8),
    decimalsA: 18,
    decimalsB: 8,
    result: exp(2250, 8),
  },
  {
    priceA: exp(0.72, 18),
    priceB: exp(1800, 8),
    decimalsA: 18,
    decimalsB: 8,
    result: exp(1296, 8),
  },
];

describe.only("Multiplicative price feed", function () {
  let snapshot: SnapshotRestorer;

  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  let MultiplicativePriceFeedFactory: MultiplicativePriceFeed__factory;
  let MultiplicativePriceFeed: MultiplicativePriceFeed;
  let PriceFeedA: SimplePriceFeed;
  let PriceFeedB: SimplePriceFeed;

  let tokenA: FaucetToken;
  let tokenB: FaucetToken;

  before(async function () {
    ({ owner, dao, attacker, PriceFeedA, PriceFeedB, MultiplicativePriceFeed, MultiplicativePriceFeedFactory, tokenA, tokenB } =
      await makeMultiplicativePriceFeed({
        priceA: exp(1, 18),
        priceB: exp(30_000, 18),
      }));

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("constructor", function () {
    it("should set all parameters correctly", async () => {
      expect(await MultiplicativePriceFeed.priceFeedA()).to.equal(PriceFeedA.address);
      expect(await MultiplicativePriceFeed.priceFeedB()).to.equal(PriceFeedB.address);
      expect(await MultiplicativePriceFeed.combinedScale()).to.eq(10n ** (8n + 8n));
      expect(await MultiplicativePriceFeed.decimals()).to.eq(8);
      expect(await MultiplicativePriceFeed.description()).to.eq("Multiplicative Price Feed");
      expect(await MultiplicativePriceFeed.underlyingToken()).to.equal(tokenB.address);
      expect(await MultiplicativePriceFeed.priceFeedScale()).to.equal(10n ** 8n);
    });

    it("reverts if priceFeedA or priceFeedB is zero address", async () => {
      await expect(
        MultiplicativePriceFeedFactory.deploy(
          ethers.constants.AddressZero,
          PriceFeedB.address,
          8,
          "Multiplicative Price Feed",
          tokenB.address,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(MultiplicativePriceFeed, "ZeroAddress");

      await expect(
        MultiplicativePriceFeedFactory.deploy(
          PriceFeedA.address,
          ethers.constants.AddressZero,
          8,
          "Multiplicative Price Feed",
          tokenB.address,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(MultiplicativePriceFeed, "ZeroAddress");
    });

    it("reverts if decimals is 0 or greater than 18", async () => {
      await expect(
        MultiplicativePriceFeedFactory.deploy(
          PriceFeedA.address,
          PriceFeedB.address,
          0, // decimals is 0
          "Multiplicative Price Feed",
          tokenB.address,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(MultiplicativePriceFeedFactory, "BadDecimals");

      await expect(
        MultiplicativePriceFeedFactory.deploy(
          PriceFeedA.address,
          PriceFeedB.address,
          19, // decimals is greater than 18
          "Multiplicative Price Feed",
          tokenB.address,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(MultiplicativePriceFeedFactory, "BadDecimals");
    });
  });

  describe("setPriceFeeds", function () {
    it("allows to set new price feeds", async function () {
      const PriceFeedFactory = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;
      const newPriceFeedA = await PriceFeedFactory.deploy(exp(2, 8), 8, tokenA.address);
      await newPriceFeedA.deployed();

      const newPriceFeedB = await PriceFeedFactory.deploy(exp(3, 8), 8, tokenB.address);
      await newPriceFeedB.deployed();

      await MultiplicativePriceFeed.connect(owner).setPriceFeeds(newPriceFeedA.address, newPriceFeedB.address, 8);

      expect(await MultiplicativePriceFeed.priceFeedA()).to.equal(newPriceFeedA.address);
      expect(await MultiplicativePriceFeed.priceFeedB()).to.equal(newPriceFeedB.address);
    });

    it("reverts if priceFeedA or priceFeedB is zero address", async function () {
      await expect(
        MultiplicativePriceFeed.connect(owner).setPriceFeeds(ethers.constants.AddressZero, PriceFeedB.address, 8)
      ).to.be.revertedWithCustomError(MultiplicativePriceFeed, "ZeroAddress");

      await expect(
        MultiplicativePriceFeed.connect(owner).setPriceFeeds(PriceFeedA.address, ethers.constants.AddressZero, 8)
      ).to.be.revertedWithCustomError(MultiplicativePriceFeed, "ZeroAddress");
    });

    it("reverts if decimals is 0 or greater than 18", async function () {
      await expect(
        MultiplicativePriceFeed.connect(owner).setPriceFeeds(PriceFeedA.address, PriceFeedB.address, 0) // decimals is 0
      ).to.be.revertedWithCustomError(MultiplicativePriceFeedFactory, "BadDecimals");

      await expect(
        MultiplicativePriceFeed.connect(owner).setPriceFeeds(PriceFeedA.address, PriceFeedB.address, 19) // decimals is greater than 18
      ).to.be.revertedWithCustomError(MultiplicativePriceFeedFactory, "BadDecimals");
    });

    it("reverts if caller is not authorized", async function () {
      const newPriceFeedA = ethers.Wallet.createRandom().address;
      const newPriceFeedB = ethers.Wallet.createRandom().address;

      await expect(MultiplicativePriceFeed.connect(attacker).setPriceFeeds(newPriceFeedA, newPriceFeedB, 8)).to.be.revertedWithCustomError(
        MultiplicativePriceFeed,
        "Unauthorized"
      );
    });

    it("owner can do it, dao can do it", async function () {
      await expect(MultiplicativePriceFeed.connect(owner).setPriceFeeds(PriceFeedA.address, PriceFeedB.address, 8)).to.not.be.reverted;
      await expect(MultiplicativePriceFeed.connect(dao).setPriceFeeds(PriceFeedA.address, PriceFeedB.address, 8)).to.not.be.reverted;
    });
  });

  describe("latestRoundData", function () {
    for (const { priceA, priceB, decimalsA, decimalsB, result } of testCases) {
      it(`priceA (${priceA}) with ${decimalsA ?? 8} decimals, priceB (${priceB}) with ${
        decimalsB ?? 8
      } decimals -> ${result}`, async () => {
        const { MultiplicativePriceFeed } = await makeMultiplicativePriceFeed({ priceA, priceB, decimalsA, decimalsB });
        const latestRoundData = await MultiplicativePriceFeed.latestRoundData();
        const price = latestRoundData[1].toBigInt();

        expect(price).to.eq(result);
      });
    }

    it("passes along roundId, startedAt, updatedAt and answeredInRound values from price feed B", async () => {
      const { PriceFeedB, MultiplicativePriceFeed } = await makeMultiplicativePriceFeed({
        priceA: exp(1, 18),
        priceB: exp(30_000, 18),
      });

      await PriceFeedB.setRoundData(
        exp(15, 18), // roundId_,
        1, // answer_,
        exp(16, 8), // startedAt_,
        exp(17, 8), // updatedAt_,
        exp(18, 18) // answeredInRound_
      );

      const roundData = await MultiplicativePriceFeed.latestRoundData();

      expect(roundData[0].toBigInt()).to.eq(exp(15, 18));
      expect(roundData[2].toBigInt()).to.eq(exp(16, 8));
      expect(roundData[3].toBigInt()).to.eq(exp(17, 8));
      expect(roundData[4].toBigInt()).to.eq(exp(18, 18));
    });
  });

  describe("getters", () => {
    it("getters return correct values", async () => {
      expect(await MultiplicativePriceFeed.version()).to.eq(1);
      expect(await MultiplicativePriceFeed.description()).to.eq("Multiplicative Price Feed");
      expect(await MultiplicativePriceFeed.decimals()).to.eq(8);
    });
  });
});
