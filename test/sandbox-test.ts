import { ethers } from 'hardhat';
import { expect } from 'chai';
import { event, wait, makeSandboxController } from './helper/helpers';

describe('SandboxController', function () {
  const parseEther = ethers.utils.parseEther;
  const ZERO = parseEther("0");
  const ONE_E18 = parseEther("1");
  const ONE_E18_PLUS1 = ONE_E18.add(1);

  function validFactors() {
    return {
      storeFrontPriceFactor: ONE_E18.toString(),
      protocolFactorBorrow: parseEther("0.5").toString(),
      reserveFactorBorrow: parseEther("0.2").toString(),
      protocolFactorLiquidation: parseEther("0.3").toString(),
      reserveFactorLiquidation: parseEther("0.4").toString()
    };
  }

  function invalidFactors() {
    return {
      storeFrontPriceFactor: ZERO.toString(),
      protocolFactorBorrow: ZERO.toString(),
      reserveFactorBorrow: parseEther("0.2").toString(),
      protocolFactorLiquidation: parseEther("0.3").toString(),
      reserveFactorLiquidation: parseEther("0.4").toString()
    };
  }

  function validCurve() {
    return {
      supplyKink: 1,
      supplyPerYearInterestRateSlopeLow: 1,
      supplyPerYearInterestRateSlopeHigh: 1,
      supplyPerYearInterestRateSlopeBase: 1,
      borrowKink: 1,
      borrowPerYearInterestRateSlopeLow: 1,
      borrowPerYearInterestRateSlopeHigh: 1,
      borrowPerYearInterestRateSlopeBase: 1,
    };
  }

  function invalidCurve() {
    return {
      supplyKink: 0,
      supplyPerYearInterestRateSlopeLow: 1,
      supplyPerYearInterestRateSlopeHigh: 1,
      supplyPerYearInterestRateSlopeBase: 1,
      borrowKink: 1,
      borrowPerYearInterestRateSlopeLow: 1,
      borrowPerYearInterestRateSlopeHigh: 1,
      borrowPerYearInterestRateSlopeBase: 1,
    };
  }

  async function deploySimplePriceFeed() {
    const PriceFeedFactory = await ethers.getContractFactory('SimplePriceFeed');
    const feed = await PriceFeedFactory.deploy("100000000", 8);
    await feed.deployed();
    return feed;
  }

  async function deployTestToken(name = 'Test Token', symbol = 'TT', decimals = 18) {
    const FaucetTokenFactory = await ethers.getContractFactory('FaucetToken');
    const token = await FaucetTokenFactory.deploy(
      parseEther("100000"),
      name,
      decimals,
      symbol
    );
    await token.deployed();
    return token;
  }

  it('can create a new sandbox', async () => {
    const [owner, dao] = await ethers.getSigners();
    const { sandboxController } = await makeSandboxController({
      admin: owner,
      governor: dao,
    });
    const OWNER_ROLE = await sandboxController.OWNER_ROLE();
    const GOVERNOR_ROLE = await sandboxController.DAO_ROLE();
    expect(await sandboxController.hasRole(OWNER_ROLE, owner.address)).to.be.true;
    expect(await sandboxController.hasRole(GOVERNOR_ROLE, dao.address)).to.be.true;
  });

  describe('whitelistBaseAsset', () => {
    it('reverts if token or feed is zero address', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const feed = await deploySimplePriceFeed();
      await expect(
        sandboxController.whitelistBaseAsset(
          ethers.constants.AddressZero,
          feed.address,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
      const token = await deployTestToken();
      await expect(
        sandboxController.whitelistBaseAsset(
          token.address,
          ethers.constants.AddressZero,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
    });

    it('reverts if storeFrontPriceFactor is invalid', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await expect(
        sandboxController.whitelistBaseAsset(
          token.address,
          feed.address,
          false,
          ZERO.toString(),
          validFactors(),
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidStoreFrontPriceFactorValue');
      await expect(
        sandboxController.whitelistBaseAsset(
          token.address,
          feed.address,
          false,
          ONE_E18_PLUS1.toString(),
          validFactors(),
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidStoreFrontPriceFactorValue');
    });

    it('reverts if token is already whitelisted', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(
          token.address,
          feed.address,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      );
      const anotherFeed = await deploySimplePriceFeed();
      await expect(
        sandboxController.whitelistBaseAsset(
          token.address,
          anotherFeed.address,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'TokenAlreadyWhitelisted');
    });

    it('reverts if price feed is already whitelisted', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const tokenA = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(tokenA.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      );
      const tokenB = await deployTestToken('Token B', 'TKB');
      await expect(
        sandboxController.whitelistBaseAsset(
          tokenB.address,
          feed.address,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'PriceFeedAlreadyWhitelisted');
    });

    it('reverts if curve invalid', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), invalidCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidCurveConfiguration');
    });

    it('reverts if borrow or liquidation factors invalid', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      const bad1 = { ...validFactors(), protocolFactorBorrow: ZERO.toString() };
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), bad1, validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidBorrowFactor');
      const bad2 = { ...validFactors(), protocolFactorLiquidation: "600000000000000000", reserveFactorLiquidation: "500000000000000000" };
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), bad2, validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidBorrowFactor');
    });

    it('reverts if feed is not a real feed', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const notAFeed = await deployTestToken("Random", "RND");
      await expect(
        sandboxController.whitelistBaseAsset(token.address, notAFeed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidPriceFeed');
    });

    it('whitelists valid token & feed and emits event', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      const tx = await wait(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      );
      const ev = event(tx, 0);
      expect(ev['BaseAssetWhitelisted'].token).to.equal(token.address);
      expect(ev['BaseAssetWhitelisted'].priceFeed).to.equal(feed.address);
      const info = await sandboxController.baseAssets(token.address);
      expect(info.priceFeed).to.equal(feed.address);
      expect(info.feeEnabled).to.equal(false);
      expect(info.baseAssetFactors.storeFrontPriceFactor).to.equal(ONE_E18.toString());
      expect(await sandboxController.isPriceFeedWhitelisted(feed.address)).to.be.true;
      expect(await sandboxController.baseAssetCount()).to.equal(1);
    });

    it('reverts if called by non-admin/DAO', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await expect(
        sandboxController.connect(attacker).whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
    });
  });

  describe('setFeeEnabled', () => {
    it('reverts if token=0 or not whitelisted', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      await expect(
        sandboxController.connect(dao).setFeeEnabled(ethers.constants.AddressZero, true)
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
      const token = await deployTestToken();
      await expect(
        sandboxController.connect(dao).setFeeEnabled(token.address, true)
      ).to.be.revertedWithCustomError(sandboxController, 'TokenNotWhitelisted');
    });

    it('sets feeEnabled (DAO-only)', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      );
      await expect(
        sandboxController.setFeeEnabled(token.address, true)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
      await expect(
        sandboxController.connect(attacker).setFeeEnabled(token.address, true)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
      await wait(sandboxController.connect(dao).setFeeEnabled(token.address, true));
      const info = await sandboxController.baseAssets(token.address);
      expect(info.feeEnabled).to.equal(true);
    });
  });

  describe('setFactors', () => {
    it('reverts if token=0 or not whitelisted', async () => {
      const [owner] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: owner });
      await expect(
        sandboxController.setFactors(ethers.constants.AddressZero, validFactors())
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
      const token = await deployTestToken();
      await expect(
        sandboxController.setFactors(token.address, validFactors())
      ).to.be.revertedWithCustomError(sandboxController, 'TokenNotWhitelisted');
    });

    it('reverts if factors invalid', async () => {
      const [owner] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: owner });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(
          token.address,
          feed.address,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      );
      const f1 = { ...validFactors(), storeFrontPriceFactor: "0" };
      await expect(
        sandboxController.setFactors(token.address, f1)
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidBorrowFactor');
      const f2 = { ...validFactors(), protocolFactorBorrow: "900000000000000000", reserveFactorBorrow: "200000000000000000" };
      await expect(
        sandboxController.setFactors(token.address, f2)
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidBorrowFactor');
      const f3 = { ...validFactors(), protocolFactorLiquidation: "600000000000000000", reserveFactorLiquidation: "600000000000000000" };
      await expect(
        sandboxController.setFactors(token.address, f3)
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidBorrowFactor');
    });

    it('sets factors (owner-only)', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(
          token.address,
          feed.address,
          false,
          ONE_E18.toString(),
          validFactors(),
          validCurve()
        )
      );
      const newFactors = {
        storeFrontPriceFactor: parseEther("0.8").toString(),
        protocolFactorBorrow: parseEther("0.4").toString(),
        reserveFactorBorrow: parseEther("0.2").toString(),
        protocolFactorLiquidation: parseEther("0.3").toString(),
        reserveFactorLiquidation: parseEther("0.1").toString()
      };
      await expect(
        sandboxController.connect(dao).setFactors(token.address, newFactors)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
      await expect(
        sandboxController.connect(attacker).setFactors(token.address, newFactors)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
      await wait(sandboxController.setFactors(token.address, newFactors));
      const info = await sandboxController.baseAssets(token.address);
      expect(info.baseAssetFactors.storeFrontPriceFactor).to.equal(newFactors.storeFrontPriceFactor);
      expect(info.baseAssetFactors.protocolFactorBorrow).to.equal(newFactors.protocolFactorBorrow);
      expect(info.baseAssetFactors.reserveFactorLiquidation).to.equal(newFactors.reserveFactorLiquidation);
    });
  });

  describe('addBaseAssetCurve', () => {
    it('reverts if token=0 or not whitelisted', async () => {
      const [owner] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: owner });
      await expect(
        sandboxController.addBaseAssetCurve(ethers.constants.AddressZero, validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
      const token = await deployTestToken();
      await expect(
        sandboxController.addBaseAssetCurve(token.address, validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'TokenNotWhitelisted');
    });

    it('reverts if curve invalid', async () => {
      const [owner] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: owner });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(
          token.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve()
        )
      );
      await expect(
        sandboxController.addBaseAssetCurve(token.address, invalidCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidCurveConfiguration');
    });

    it('adds curve for whitelisted token (owner or DAO)', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      );
      const newCurve = {
        supplyKink: 10,
        supplyPerYearInterestRateSlopeLow: 20,
        supplyPerYearInterestRateSlopeHigh: 30,
        supplyPerYearInterestRateSlopeBase: 40,
        borrowKink: 50,
        borrowPerYearInterestRateSlopeLow: 60,
        borrowPerYearInterestRateSlopeHigh: 70,
        borrowPerYearInterestRateSlopeBase: 80,
      };
      const tx = await wait(
        sandboxController.addBaseAssetCurve(token.address, newCurve)
      );
      const ev = event(tx, 0);
      expect(ev['BaseAssetCurveAdded'].token).to.equal(token.address);
      const newerCurve = { ...newCurve, supplyKink: 99 };
      const tx2 = await wait(
        sandboxController.connect(dao).addBaseAssetCurve(token.address, newerCurve)
      );
      const ev2 = event(tx2, 0);
      expect(ev2['BaseAssetCurveAdded'].token).to.equal(token.address);
      await expect(
        sandboxController.connect(attacker).addBaseAssetCurve(token.address, newCurve)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
    });
  });

  describe('changeBaseAssetCurve', () => {
    it('reverts if token=0 or not whitelisted', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(
          ethers.constants.AddressZero,
          0,
          validCurve()
        )
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
      const token = await deployTestToken();
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'TokenNotWhitelisted');
    });

    it('reverts if curve invalid or index out of range', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      await wait(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), validCurve())
      );
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 99, validCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidCurveConfiguration');
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, invalidCurve())
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidCurveConfiguration');
    });

    it('reverts if new curve is identical to old one', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      const curve = validCurve();
      await wait(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), curve)
      );
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, curve)
      ).to.be.revertedWithCustomError(sandboxController, 'InvalidCurveConfiguration');
    });

    it('updates existing curve (DAO-only)', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const token = await deployTestToken();
      const feed = await deploySimplePriceFeed();
      const curve = validCurve();
      await wait(
        sandboxController.whitelistBaseAsset(token.address, feed.address, false, ONE_E18.toString(), validFactors(), curve)
      );
      const newCurve = {
        supplyKink: 9,
        supplyPerYearInterestRateSlopeLow: 9,
        supplyPerYearInterestRateSlopeHigh: 9,
        supplyPerYearInterestRateSlopeBase: 9,
        borrowKink: 9,
        borrowPerYearInterestRateSlopeLow: 9,
        borrowPerYearInterestRateSlopeHigh: 9,
        borrowPerYearInterestRateSlopeBase: 9,
      };
      await expect(
        sandboxController.changeBaseAssetCurve(token.address, 0, newCurve)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
      await expect(
        sandboxController.connect(attacker).changeBaseAssetCurve(token.address, 0, newCurve)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
      const tx = await wait(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, newCurve)
      );
      const ev = event(tx, 0);
      expect(ev['BaseAssetCurveChanged'].token).to.equal(token.address);
    });
  });

  describe('transferOwnerRole', () => {
    it('reverts if caller not owner', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      await expect(
        sandboxController.connect(attacker).transferOwnerRole(attacker.address)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
    });

    it('reverts if newOwner=0', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      await expect(
        sandboxController.transferOwnerRole(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
    });

    it('transfers owner successfully', async () => {
      const [owner, dao, newOwner] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const OWNER_ROLE = await sandboxController.OWNER_ROLE();
      expect(await sandboxController.hasRole(OWNER_ROLE, owner.address)).to.be.true;
      await wait(sandboxController.transferOwnerRole(newOwner.address));
      expect(await sandboxController.hasRole(OWNER_ROLE, owner.address)).to.be.false;
      expect(await sandboxController.hasRole(OWNER_ROLE, newOwner.address)).to.be.true;
    });
  });

  describe('transferDAORole', () => {
    it('reverts if caller not DAO', async () => {
      const [owner, dao, attacker] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      await expect(
        sandboxController.connect(attacker).transferDAORole(attacker.address)
      ).to.be.revertedWithCustomError(sandboxController, 'NotAuthorized');
    });

    it('reverts if newDAO=0', async () => {
      const [owner, dao] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      await expect(
        sandboxController.connect(dao).transferDAORole(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, 'ZeroAddress');
    });

    it('transfers DAO role successfully', async () => {
      const [owner, dao, newDAO] = await ethers.getSigners();
      const { sandboxController } = await makeSandboxController({ admin: owner, governor: dao });
      const DAO_ROLE = await sandboxController.DAO_ROLE();
      expect(await sandboxController.hasRole(DAO_ROLE, dao.address)).to.be.true;
      await wait(sandboxController.connect(dao).transferDAORole(newDAO.address));
      expect(await sandboxController.hasRole(DAO_ROLE, dao.address)).to.be.false;
      expect(await sandboxController.hasRole(DAO_ROLE, newDAO.address)).to.be.true;
    });
  });
});
