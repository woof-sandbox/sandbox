import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { EzETHExchangeRatePriceFeed, EzETHExchangeRatePriceFeed__factory } from "../../build/types";
import { ethers, expect, SnapshotRestorer, takeSnapshot, ZERO_ADDRESS } from "../helper/helpers";

describe("Access Control Price Feeds", function () {
  let snapshot: SnapshotRestorer;

  let priceFeed: EzETHExchangeRatePriceFeed;

  let EzETHExchangeRatePriceFeed: EzETHExchangeRatePriceFeed__factory;

  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;

  // Data for the EzETHExchangeRatePriceFeed
  const rateProvider = ethers.Wallet.createRandom().address;
  const fallbackRateProvider = ethers.Wallet.createRandom().address;
  const deciamls = 18;
  const description = "EzETH Exchange Rate Price Feed";
  const underlyingToken = ethers.Wallet.createRandom().address;

  before(async () => {
    [dao, attacker] = await ethers.getSigners();

    const daoAddress = dao.address;

    EzETHExchangeRatePriceFeed = (await ethers.getContractFactory("EzETHExchangeRatePriceFeed")) as EzETHExchangeRatePriceFeed__factory;

    priceFeed = await EzETHExchangeRatePriceFeed.deploy(
      rateProvider,
      fallbackRateProvider,
      deciamls,
      description,
      underlyingToken,
      daoAddress
    );
    await priceFeed.deployed();

    snapshot = await takeSnapshot();
  });

  afterEach(async () => snapshot.restore());

  describe("constructor", () => {
    it("deploys with the correct parameters", async () => {
      expect(await priceFeed.dao()).to.equal(dao.address);
    });

    it("reverts if dao address is zero", async () => {
      await expect(
        EzETHExchangeRatePriceFeed.deploy(rateProvider, fallbackRateProvider, deciamls, description, underlyingToken, ZERO_ADDRESS)
      ).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("emits DaoTransferred event on deployment", async () => {
      expect(
        await EzETHExchangeRatePriceFeed.deploy(rateProvider, fallbackRateProvider, deciamls, description, underlyingToken, dao.address)
      )
        .to.emit(priceFeed, "DaoTransferred")
        .withArgs(ZERO_ADDRESS, dao.address);
    });
  });

  describe("setContractor", () => {
    it("allows to set new contractor", async () => {
      await priceFeed.setContractor(attacker.address);
      expect(await priceFeed.contractor()).to.equal(attacker.address);
    });

    it("emits event on setting new contractor", async () => {
      await expect(priceFeed.setContractor(attacker.address)).to.emit(priceFeed, "ContractorSet").withArgs(ZERO_ADDRESS, attacker.address);
    });

    it("reverts if caller is not the dao", async () => {
      await expect(priceFeed.connect(attacker).setContractor(attacker.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if caller is current contractor", async () => {
      await priceFeed.setContractor(attacker.address);

      expect(await priceFeed.contractor()).to.equal(attacker.address);

      await expect(priceFeed.connect(attacker).setContractor(attacker.address)).to.be.revertedWithCustomError(priceFeed, "NotDao");
    });

    it("reverts if new contractor is current contractor", async () => {
      await priceFeed.setContractor(attacker.address);
      expect(await priceFeed.contractor()).to.equal(attacker.address);

      await expect(priceFeed.setContractor(attacker.address)).to.be.revertedWithCustomError(priceFeed, "InvalidAddress");
    });

    it("can be set to zero address", async () => {
      // first set to a valid address
      await priceFeed.setContractor(attacker.address);

      expect(await priceFeed.contractor()).to.equal(attacker.address);

      await priceFeed.setContractor(ZERO_ADDRESS);
      expect(await priceFeed.contractor()).to.equal(ZERO_ADDRESS);
    });
  });

  describe("transferDao", () => {
    it("allows to transfer dao", async () => {
      await priceFeed.transferDao(attacker.address);
      expect(await priceFeed.dao()).to.equal(attacker.address);
    });

    it("emits DaoTransferred event on transfer", async () => {
      await expect(priceFeed.transferDao(attacker.address)).to.emit(priceFeed, "DaoTransferred").withArgs(dao.address, attacker.address);
    });

    it("reverts if caller is not the dao", async () => {
      await expect(priceFeed.connect(attacker).transferDao(attacker.address))
        .to.be.revertedWithCustomError(priceFeed, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if new dao is zero address", async () => {
      await expect(priceFeed.transferDao(ZERO_ADDRESS)).to.be.revertedWithCustomError(priceFeed, "ZeroAddress");
    });

    it("reverts if new dao is current dao", async () => {
      await expect(priceFeed.transferDao(dao.address)).to.be.revertedWithCustomError(priceFeed, "InvalidAddress");
    });
  });
});
