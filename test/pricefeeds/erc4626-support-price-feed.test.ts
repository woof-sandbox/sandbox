import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, exp, expect, makeToken, SnapshotRestorer, takeSnapshot } from "../helper/helpers";
import {
  ERC4626RateProviderTest,
  ERC4626RateProviderTest__factory,
  FaucetToken,
  ManagedSimplePriceFeed,
  ManagedSimplePriceFeed__factory,
  PriceFeedWith4626Support,
  PriceFeedWith4626Support__factory,
} from "../../build/types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PriceFeedWith4626Support", function () {
  let snapshot: SnapshotRestorer;

  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  let token18: FaucetToken;
  let token6: FaucetToken;

  let RateProviderFactory: ERC4626RateProviderTest__factory;
  let ManagedSimplePriceFeed: ManagedSimplePriceFeed__factory;
  let PriceFeedWith4626Support: PriceFeedWith4626Support__factory;

  let underlyingPriceFeed18: ManagedSimplePriceFeed;
  let underlyingPriceFeed6: ManagedSimplePriceFeed;
  let fallbackPriceFeed18: ManagedSimplePriceFeed;
  let fallbackPriceFeed6: ManagedSimplePriceFeed;

  let rateProvider: ERC4626RateProviderTest;

  let priceFeed: PriceFeedWith4626Support;

  const DESCRIPTION = "Test Price Feed with ERC4626 Support";
  const UPDATE_TIME_LIMIT = time.duration.minutes(2);
  const DECIMALS = 8;

  before(async () => {
    [owner, dao, attacker] = await ethers.getSigners();

    RateProviderFactory = (await ethers.getContractFactory("ERC4626RateProviderTest")) as ERC4626RateProviderTest__factory;
    ManagedSimplePriceFeed = (await ethers.getContractFactory("ManagedSimplePriceFeed")) as ManagedSimplePriceFeed__factory;
    PriceFeedWith4626Support = (await ethers.getContractFactory("PriceFeedWith4626Support")) as PriceFeedWith4626Support__factory;

    token18 = await makeToken({ name: "Token", symbol: "TKN", decimals: 18 });
    token6 = await makeToken({ name: "Token6", symbol: "TKN6", decimals: 6 });

    underlyingPriceFeed18 = await ManagedSimplePriceFeed.deploy(exp(4000, 18), 18, token18.address);
    underlyingPriceFeed6 = await ManagedSimplePriceFeed.deploy(exp(1, 8), 8, token6.address);

    fallbackPriceFeed18 = await ManagedSimplePriceFeed.deploy(exp(4000, 8), 8, token18.address);
    fallbackPriceFeed6 = await ManagedSimplePriceFeed.deploy(exp(1, 8), 8, token6.address);

    rateProvider = await RateProviderFactory.deploy(token18.address, "RateProvider", "RateProvider", 18);

    priceFeed = (await PriceFeedWith4626Support.deploy(
      rateProvider.address,
      underlyingPriceFeed18.address,
      fallbackPriceFeed18.address,
      8,
      DESCRIPTION,
      token18.address,
      UPDATE_TIME_LIMIT,
      owner.address,
      dao.address
    )) as PriceFeedWith4626Support;

    snapshot = await takeSnapshot();
  });

  afterEach(async () => await snapshot.restore());

  describe("constructor", function () {
    it("should initialize with correct parameters", async () => {
      expect(await priceFeed.rateProvider()).to.equal(rateProvider.address);
      expect(await priceFeed.underlyingPriceFeed()).to.equal(underlyingPriceFeed18.address);
      expect(await priceFeed.fallbackPriceFeed()).to.equal(fallbackPriceFeed18.address);
      expect(await priceFeed.decimals()).to.equal(8);
      expect(await priceFeed.description()).to.equal(DESCRIPTION);
      expect(await priceFeed.underlyingToken()).to.equal(token18.address);
      expect(await priceFeed.updateTimeLimit()).to.equal(UPDATE_TIME_LIMIT);

      const rateProviderDecimals = await rateProvider.decimals();
      const underlyingDecimals = await underlyingPriceFeed18.decimals();
      const expectedCombinedScale = 10 ** (rateProviderDecimals + underlyingDecimals);

      expect(await priceFeed.combinedScale()).to.eq(expectedCombinedScale);
      expect(await priceFeed.priceFeedScale()).to.eq(10 ** DECIMALS);
    });

    it("reverts when underlyingPriceFeed is zero address", async () => {
      await expect(
        PriceFeedWith4626Support.deploy(
          rateProvider.address,
          ethers.constants.AddressZero,
          fallbackPriceFeed18.address,
          8,
          DESCRIPTION,
          token18.address,
          UPDATE_TIME_LIMIT,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts when rateProvider is zero address", async () => {
      await expect(
        PriceFeedWith4626Support.deploy(
          ethers.constants.AddressZero,
          underlyingPriceFeed18.address,
          fallbackPriceFeed18.address,
          8,
          DESCRIPTION,
          token18.address,
          UPDATE_TIME_LIMIT,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts when underlyingToken is zero address", async () => {
      await expect(
        PriceFeedWith4626Support.deploy(
          rateProvider.address,
          underlyingPriceFeed18.address,
          fallbackPriceFeed18.address,
          8,
          DESCRIPTION,
          ethers.constants.AddressZero,
          UPDATE_TIME_LIMIT,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("allows to deploy with fallbackPriceFeed as zero address", async () => {
      const priceFeedWithFallbackZero = await PriceFeedWith4626Support.deploy(
        rateProvider.address,
        underlyingPriceFeed18.address,
        ethers.constants.AddressZero,
        8,
        DESCRIPTION,
        token18.address,
        UPDATE_TIME_LIMIT,
        owner.address,
        dao.address
      );

      expect(await priceFeedWithFallbackZero.fallbackPriceFeed()).to.equal(ethers.constants.AddressZero);
    });

    it("reverts when decimals is zero", async () => {
      await expect(
        PriceFeedWith4626Support.deploy(
          rateProvider.address,
          underlyingPriceFeed18.address,
          fallbackPriceFeed18.address,
          0, // zero decimals
          DESCRIPTION,
          token18.address,
          UPDATE_TIME_LIMIT,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });

    it("reverts when decimals is greater than 18", async () => {
      await expect(
        PriceFeedWith4626Support.deploy(
          rateProvider.address,
          underlyingPriceFeed18.address,
          fallbackPriceFeed18.address,
          19, // decimals > 18
          DESCRIPTION,
          token18.address,
          UPDATE_TIME_LIMIT,
          owner.address,
          dao.address
        )
      ).to.be.revertedWithCustomError(priceFeed, "BadDecimals");
    });
  });

  describe("setPriceFeeds", function () {
    const newUnderlyingPriceFeed = ethers.Wallet.createRandom().address;
    const newFallbackPriceFeed = ethers.Wallet.createRandom().address;

    it("should update price feeds correctly", async () => {
      await priceFeed.setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed);

      expect(await priceFeed.underlyingPriceFeed()).to.equal(newUnderlyingPriceFeed);
      expect(await priceFeed.fallbackPriceFeed()).to.equal(newFallbackPriceFeed);
    });

    it("reverts if caller is not authorized", async () => {
      await expect(priceFeed.connect(attacker).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.be.revertedWithCustomError(
        priceFeed,
        "Unauthorized"
      );
    });

    it("owner can do it, dao can do it", async () => {
      await expect(priceFeed.connect(owner).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.not.be.reverted;
      await expect(priceFeed.connect(dao).setPriceFeeds(newUnderlyingPriceFeed, newFallbackPriceFeed)).to.not.be.reverted;
    });
  });

  describe("getters", function () {
    it("returns correct verstion value", async () => {
      expect(await priceFeed.version()).to.equal("1");
    });
  });

  describe("latestRoundData", function () {
    it("returns correct data for latest round", async () => {
      const latestData = await priceFeed.latestRoundData();

      console.log(latestData.answer.toString());
    });
  });
});
