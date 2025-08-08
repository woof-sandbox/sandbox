import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  FaucetToken,
  MultiplicativePriceFeed,
  MultiplicativePriceFeed__factory,
  SimplePriceFeed,
  SimplePriceFeed__factory,
} from "../../build/types";
import { ethers, exp, expect, makeToken, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Access Control Price Feeds", function () {
  let snapshot: SnapshotRestorer;

  // factories
  let MultiplicativePriceFeedFactory: MultiplicativePriceFeed__factory;
  let SimplePriceFeed: SimplePriceFeed__factory;

  let dao: SignerWithAddress;
  let contractor: SignerWithAddress;
  let attacker: SignerWithAddress;
  let newDao: SignerWithAddress;

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

  before(async () => {
    [dao, attacker, contractor, newDao] = await ethers.getSigners();

    MultiplicativePriceFeedFactory = (await ethers.getContractFactory("MultiplicativePriceFeed")) as MultiplicativePriceFeed__factory;
    SimplePriceFeed = (await ethers.getContractFactory("SimplePriceFeed")) as SimplePriceFeed__factory;

    underlyingToken = await makeToken({
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

  describe("constructor", () => {
    it("deploys with the correct parameters", async () => {
      expect(await priceFeed.dao()).to.equal(dao.address);
      expect(await priceFeed.contractor()).to.equal(ZERO_ADDRESS);
    });

    it("reverts if dao address is zero", async () => {
      await expect(
        MultiplicativePriceFeedFactory.deploy(
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
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("emits DaoTransferred event on deployment", async () => {
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
        .to.emit(priceFeed, "DaoTransferred")
        .withArgs(ZERO_ADDRESS, dao.address);
    });
  });

  describe("setContractor", () => {
    it("allows dao to set new contractor", async () => {
      await priceFeed.connect(dao).setContractor(contractor.address);
      expect(await priceFeed.contractor()).to.equal(contractor.address);
    });

    it("emits ContractorSet event on setting new contractor", async () => {
      await expect(priceFeed.connect(dao).setContractor(contractor.address))
        .to.emit(priceFeed, "ContractorSet")
        .withArgs(ZERO_ADDRESS, contractor.address);
    });

    it("allows dao to update contractor to different address", async () => {
      await priceFeed.connect(dao).setContractor(contractor.address);
      expect(await priceFeed.contractor()).to.equal(contractor.address);

      await expect(priceFeed.connect(dao).setContractor(newDao.address))
        .to.emit(priceFeed, "ContractorSet")
        .withArgs(contractor.address, newDao.address);

      expect(await priceFeed.contractor()).to.equal(newDao.address);
    });

    it("reverts if caller is not the dao", async () => {
      await expect(priceFeed.connect(attacker).setContractor(contractor.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if contractor calls setContractor", async () => {
      await priceFeed.connect(dao).setContractor(contractor.address);
      expect(await priceFeed.contractor()).to.equal(contractor.address);

      await expect(priceFeed.connect(contractor).setContractor(attacker.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(contractor.address);
    });

    it("reverts if new contractor is current contractor", async () => {
      await priceFeed.connect(dao).setContractor(contractor.address);
      expect(await priceFeed.contractor()).to.equal(contractor.address);

      await expect(priceFeed.connect(dao).setContractor(contractor.address)).to.be.revertedWithCustomError(priceFeed, "InvalidAddress");
    });

    it("can set contractor to zero address", async () => {
      // First set to a valid address
      await priceFeed.connect(dao).setContractor(contractor.address);
      expect(await priceFeed.contractor()).to.equal(contractor.address);

      // Then set back to zero address
      await expect(priceFeed.connect(dao).setContractor(ZERO_ADDRESS))
        .to.emit(priceFeed, "ContractorSet")
        .withArgs(contractor.address, ZERO_ADDRESS);

      expect(await priceFeed.contractor()).to.equal(ZERO_ADDRESS);
    });

    it("can set contractor from zero address to valid address", async () => {
      expect(await priceFeed.contractor()).to.equal(ZERO_ADDRESS);

      await expect(priceFeed.connect(dao).setContractor(contractor.address))
        .to.emit(priceFeed, "ContractorSet")
        .withArgs(ZERO_ADDRESS, contractor.address);

      expect(await priceFeed.contractor()).to.equal(contractor.address);
    });

    it("reverts if trying to set zero address when contractor is already zero address", async () => {
      expect(await priceFeed.contractor()).to.equal(ZERO_ADDRESS);

      await expect(priceFeed.connect(dao).setContractor(ZERO_ADDRESS)).to.be.revertedWithCustomError(priceFeed, "InvalidAddress");
    });
  });

  describe("transferDao", () => {
    it("allows dao to transfer dao role", async () => {
      await priceFeed.connect(dao).transferDao(newDao.address);
      expect(await priceFeed.dao()).to.equal(newDao.address);
    });

    it("emits DaoTransferred event on transfer", async () => {
      await expect(priceFeed.connect(dao).transferDao(newDao.address))
        .to.emit(priceFeed, "DaoTransferred")
        .withArgs(dao.address, newDao.address);
    });

    it("reverts if caller is not the dao", async () => {
      await expect(priceFeed.connect(attacker).transferDao(newDao.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if contractor calls transferDao", async () => {
      await priceFeed.connect(dao).setContractor(contractor.address);

      await expect(priceFeed.connect(contractor).transferDao(newDao.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(contractor.address);
    });

    it("reverts if new dao is zero address", async () => {
      await expect(priceFeed.connect(dao).transferDao(ZERO_ADDRESS)).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if new dao is current dao", async () => {
      await expect(priceFeed.connect(dao).transferDao(dao.address)).to.be.revertedWithCustomError(priceFeed, "InvalidAddress");
    });

    it("new dao can perform dao functions after transfer", async () => {
      await priceFeed.connect(dao).transferDao(newDao.address);
      expect(await priceFeed.dao()).to.equal(newDao.address);

      // New dao should be able to set contractor
      await expect(priceFeed.connect(newDao).setContractor(contractor.address)).to.not.be.reverted;

      expect(await priceFeed.contractor()).to.equal(contractor.address);
    });

    it("old dao cannot perform dao functions after transfer", async () => {
      await priceFeed.connect(dao).transferDao(newDao.address);

      await expect(priceFeed.connect(dao).setContractor(contractor.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(dao.address);
    });
  });
});
