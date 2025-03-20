import { ethers } from "hardhat"
import { expect } from "chai"

describe("SandboxController", function() {
  let owner: any
  let dao: any
  let attacker: any
  let other: any
  let contractFactory: any
  let sandboxController: any

  async function deployPriceFeed() {
    const PriceFeedFactory = await ethers.getContractFactory('SimplePriceFeed')
    const feed = await PriceFeedFactory.deploy('100000000', 8)
    await feed.deployed()
    return feed;
  }

  async function deployMockToken(
    name = 'Test Token',
    symbol = 'TT',
    decimals = 18
  ) {
    const FaucetTokenFactory = await ethers.getContractFactory('FaucetToken')
    const token = await FaucetTokenFactory.deploy(
      ethers.utils.parseEther('100000'),
      name,
      decimals,
      symbol
    )
    await token.deployed()
    return token
  }


  function makeValidCurve() {
    return {
      supplyKink: 500000000000000000n,
      supplyPerYearInterestRateSlopeLow: 500n,
      supplyPerYearInterestRateSlopeHigh: 1000n,
      supplyPerYearInterestRateSlopeBase: 100n,
      borrowKink: 500000000000000000n,
      borrowPerYearInterestRateSlopeLow: 1000n,
      borrowPerYearInterestRateSlopeHigh: 2000n,
      borrowPerYearInterestRateSlopeBase: 1n
    }
  }

  function makeInvalidCurveZeroBase() {
    return {
      supplyKink: 500000000000000000n,
      supplyPerYearInterestRateSlopeLow: 500n,
      supplyPerYearInterestRateSlopeHigh: 1000n,
      supplyPerYearInterestRateSlopeBase: 100n,
      borrowKink: 500000000000000000n,
      borrowPerYearInterestRateSlopeLow: 1000n,
      borrowPerYearInterestRateSlopeHigh: 2000n,
      borrowPerYearInterestRateSlopeBase: 0n
    }
  }

  function makeInvalidCurveKinkTooHigh() {
    return {
      supplyKink: 1000000000000000000n,
      supplyPerYearInterestRateSlopeLow: 500n,
      supplyPerYearInterestRateSlopeHigh: 1000n,
      supplyPerYearInterestRateSlopeBase: 100n,
      borrowKink: 1000000000000000000n,
      borrowPerYearInterestRateSlopeLow: 1000n,
      borrowPerYearInterestRateSlopeHigh: 2000n,
      borrowPerYearInterestRateSlopeBase: 1n
    }
  }

  async function deploySandboxController(_owner: string, _dao: string, feeEnabled: boolean, sfpFactor: bigint, pfb: bigint, rfb: bigint, pfl: bigint, rfl: bigint, mut: bigint, mca: bigint, seeds: bigint, lock: bigint) {
    const c = await contractFactory.deploy(_owner, _dao, feeEnabled, sfpFactor, pfb, rfb, pfl, rfl, mut, mca, seeds, lock)
    sandboxController = c;
    await c.deployed()
    return c
  }

  before(async function() {
    [owner, dao, attacker, other] = await ethers.getSigners()
    contractFactory = await ethers.getContractFactory("SandboxController")
  })

  describe("constructor", function() {
    it("initializes state with correct values", async function() {
      const c = await deploySandboxController(
        owner.address,
        dao.address,
        true,
        999999999999999999n,
        100000000000000000n,
        200000000000000000n,
        100000000000000000n,
        200000000000000000n,
        300n,
        5n,
        1000n,
        500n
      )
      expect(await c.owner()).to.equal(owner.address)
      expect(await c.dao()).to.equal(dao.address)
      expect(await c.feeEnabled()).to.equal(true)
      expect(await c.storeFrontPriceFactor()).to.equal("999999999999999999")
      expect(await c.protocolFactorBorrow()).to.equal("100000000000000000")
      expect(await c.reserveFactorBorrow()).to.equal("200000000000000000")
      expect(await c.protocolFactorLiquidation()).to.equal("100000000000000000")
      expect(await c.reserveFactorLiquidation()).to.equal("200000000000000000")
      expect(await c.minUpdateTime()).to.equal(300)
      expect(await c.maxCollateralAssets()).to.equal(5)
      expect(await c.suggestedAmountOfSeedReserves()).to.equal(1000)
      expect(await c.suggestedLockTimeOfSeedReserves()).to.equal(500)
    })
    it("reverts if owner=0", async function() {
      await expect(
        deploySandboxController(
          ethers.constants.AddressZero,
          dao.address,
          true,
          999999999999999999n,
          100000000000000000n,
          200000000000000000n,
          100000000000000000n,
          200000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if dao=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          ethers.constants.AddressZero,
          true,
          999999999999999999n,
          100000000000000000n,
          200000000000000000n,
          100000000000000000n,
          200000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if storeFrontPriceFactor >= 1e18", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          1000000000000000000n,
          100000000000000000n,
          200000000000000000n,
          100000000000000000n,
          200000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if protocolFactorBorrow=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          0n,
          500000000000000000n,
          100000000000000000n,
          100000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if reserveFactorBorrow=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          100000000000000000n,
          0n,
          100000000000000000n,
          100000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if protocolFactorBorrow+reserveFactorBorrow > 1e18", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          600000000000000000n,
          600000000000000000n,
          100000000000000000n,
          100000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if protocolFactorLiquidation=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          0n,
          200000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if reserveFactorLiquidation=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          100000000000000000n,
          0n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if protocolFactorLiquidation+reserveFactorLiquidation > 1e18", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          800000000000000000n,
          300000000000000000n,
          300n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if minUpdateTime=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          100000000000000000n,
          200000000000000000n,
          0n,
          5n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if maxCollateralAssets=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          100000000000000000n,
          200000000000000000n,
          300n,
          0n,
          1000n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if suggestedAmountOfSeedReserves=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          100000000000000000n,
          200000000000000000n,
          300n,
          5n,
          0n,
          500n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
    it("reverts if suggestedLockTimeOfSeedReserves=0", async function() {
      await expect(
        deploySandboxController(
          owner.address,
          dao.address,
          true,
          500000000000000000n,
          200000000000000000n,
          300000000000000000n,
          100000000000000000n,
          200000000000000000n,
          300n,
          5n,
          500n,
          0n
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })
  })

  describe("deployment with typical valid parameters", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        300n,
        10n,
        1000n,
        3600n
      )
    })
    it("verifies initial values after construction", async function() {
      expect(await sandboxController.owner()).to.equal(owner.address)
      expect(await sandboxController.dao()).to.equal(dao.address)
      expect(await sandboxController.feeEnabled()).to.equal(false)
      expect(await sandboxController.storeFrontPriceFactor()).to.equal("100000000000000000")
      expect(await sandboxController.protocolFactorBorrow()).to.equal("100000000000000000")
      expect(await sandboxController.reserveFactorBorrow()).to.equal("100000000000000000")
      expect(await sandboxController.protocolFactorLiquidation()).to.equal("100000000000000000")
      expect(await sandboxController.reserveFactorLiquidation()).to.equal("100000000000000000")
      expect(await sandboxController.minUpdateTime()).to.equal(300)
      expect(await sandboxController.maxCollateralAssets()).to.equal(10)
      expect(await sandboxController.suggestedAmountOfSeedReserves()).to.equal(1000)
      expect(await sandboxController.suggestedLockTimeOfSeedReserves()).to.equal(3600)
      expect(await sandboxController.baseAssetCount()).to.equal(0)
      expect(await sandboxController.collateralAssetCount()).to.equal(0)
    })
  })

  describe("whitelistBaseAsset", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        500000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        500n,
        5n,
        1000n,
        1000n
      )
    })
    it("reverts if caller is not owner or dao", async function() {
      const token = await deployMockToken("TestToken", "TT", 18)
      const feed = await deployPriceFeed()
      await expect(
        sandboxController.connect(attacker).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
      ).to.be.revertedWithCustomError(sandboxController, "NotAuthorized")
    })
    it("reverts if token=0", async function() {
      const feed = await deployPriceFeed()
      await expect(
        sandboxController.whitelistBaseAsset(ethers.constants.AddressZero, feed.address, makeValidCurve(), 100)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if priceFeed=0", async function() {
      const token = await deployMockToken("TokenZeroFeed", "TZF", 18)
      await expect(
        sandboxController.whitelistBaseAsset(token.address, ethers.constants.AddressZero, makeValidCurve(), 100)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if token already whitelisted", async function() {
      const token = await deployMockToken("T1", "T1", 18)
      const feed = await deployPriceFeed()
      const validC = makeValidCurve()
      await sandboxController.whitelistBaseAsset(token.address, feed.address, validC, 100)
      await expect(
        sandboxController.whitelistBaseAsset(token.address, (await deployPriceFeed()).address, validC, 200)
      ).to.be.revertedWithCustomError(sandboxController, "TokenAlreadyWhitelisted")
    })
    it("reverts if feed already whitelisted by another token", async function() {
      const token1 = await deployMockToken("T2", "T2", 18)
      const token2 = await deployMockToken("T3", "T3", 18)
      const feed = await deployPriceFeed()
      const validC = makeValidCurve()
      await sandboxController.whitelistBaseAsset(token1.address, feed.address, validC, 50)
      await expect(
        sandboxController.whitelistBaseAsset(token2.address, feed.address, validC, 50)
      ).to.be.revertedWithCustomError(sandboxController, "PriceFeedAlreadyWhitelisted")
    })
    it("reverts if curve is invalid (kink>1e18 or base=0)", async function() {
      const token = await deployMockToken("T4", "T4", 18)
      const feed = await deployPriceFeed()
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, makeInvalidCurveZeroBase(), 10)
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, makeInvalidCurveKinkTooHigh(), 10)
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
    })
    it("reverts if feed does not return valid data", async function() {
      const token = await deployMockToken("T5", "T5", 18)
      const feed = await deployMockToken("FakeFeed", "FF", 18)
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
      ).to.be.revertedWithoutReason;
    });
    it("whitelists token for base asset with correct state changes", async function() {
      const token = await deployMockToken("T6", "T6", 6)
      const feed = await deployPriceFeed()
      const curve = makeValidCurve()
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, curve, 777)
      const data = await sandboxController.baseAssets(token.address)
      expect(data.priceFeed).to.equal(feed.address)
      expect(data.decimals).to.equal(6)
      expect(data.minBorrow).to.equal(777)
      const count = await sandboxController.baseAssetCount()
      expect(count).to.equal(1)
      expect(await sandboxController.baseAssetTokens(0)).to.equal(token.address)
      const pfWhite = await sandboxController.isPriceFeedWhitelisted(feed.address)
      expect(pfWhite).to.be.true
    })
    it("owner can do it, dao can do it", async function() {
      const token = await deployMockToken("T7", "T7", 18)
      const feed = await deployPriceFeed()
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 100)
      const token2 = await deployMockToken("T8", "T8", 18)
      const feed2 = await deployPriceFeed()
      await sandboxController.connect(dao).whitelistBaseAsset(token2.address, feed2.address, makeValidCurve(), 200)
      expect(await sandboxController.baseAssetCount()).to.equal(2)
    })
  })

  describe("whitelistCollateralAsset", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        400000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        500n,
        5n,
        1000n,
        1000n
      )
    })
    it("reverts if caller is not authorized", async function() {
      const token = await deployMockToken("C1", "C1", 18)
      const feed = await deployPriceFeed()
      await expect(
        sandboxController.connect(attacker).whitelistCollateralAsset(token.address, feed.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotAuthorized")
    })
    it("reverts if token=0", async function() {
      const feed = await deployPriceFeed()
      await expect(
        sandboxController.whitelistCollateralAsset(ethers.constants.AddressZero, feed.address)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if feed=0", async function() {
      const token = await deployMockToken("C2", "C2", 6)
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if token already whitelisted as collateral", async function() {
      const token = await deployMockToken("C3", "C3", 8)
      const feed = await deployPriceFeed()
      await sandboxController.whitelistCollateralAsset(token.address, feed.address)
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, (await deployPriceFeed()).address)
      ).to.be.revertedWithCustomError(sandboxController, "TokenAlreadyWhitelisted")
    })
    it("reverts if feed is used by another token", async function() {
      const tokenA = await deployMockToken("C4A", "C4A", 10)
      const tokenB = await deployMockToken("C4B", "C4B", 10)
      const feed = await deployPriceFeed()
      await sandboxController.whitelistCollateralAsset(tokenA.address, feed.address)
      await expect(
        sandboxController.whitelistCollateralAsset(tokenB.address, feed.address)
      ).to.be.revertedWithCustomError(sandboxController, "PriceFeedAlreadyWhitelisted")
    })
    it("reverts if feed not valid chainlink type feed", async function() {
      const token = await deployMockToken("C5", "C5", 6)
      const feed = await deployMockToken("FakeFeed2", "FF2", 18)
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, feed.address)
      ).to.be.revertedWithoutReason();
    })
    it("whitelists valid collateral and updates state", async function() {
      const token = await deployMockToken("C6", "C6", 12)
      const feed = await deployPriceFeed()
      await sandboxController.connect(owner).whitelistCollateralAsset(token.address, feed.address)
      const data = await sandboxController.collateralAssets(token.address)
      expect(data).to.equal(feed.address)
      expect(await sandboxController.collateralAssetCount()).to.equal(1)
      expect(await sandboxController.collateralAssetTokens(0)).to.equal(token.address)
      expect(await sandboxController.isPriceFeedWhitelisted(feed.address)).to.equal(true)
    })
    it("owner can do it, dao can do it", async function() {
      const token1 = await deployMockToken("C7", "C7", 9)
      const feed1 = await deployPriceFeed()
      await sandboxController.connect(owner).whitelistCollateralAsset(token1.address, feed1.address)
      const token2 = await deployMockToken("C8", "C8", 9)
      const feed2 = await deployPriceFeed()
      await sandboxController.connect(dao).whitelistCollateralAsset(token2.address, feed2.address)
      expect(await sandboxController.collateralAssetCount()).to.equal(2)
    })
  })

  describe("setFeeEnabled", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
    })
    it("reverts if caller is not owner", async function() {
      await expect(
        sandboxController.connect(dao).setFeeEnabled(true)
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
      await expect(
        sandboxController.connect(attacker).setFeeEnabled(true)
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
    })
    it("sets feeEnabled and emits event", async function() {
      expect(await sandboxController.feeEnabled()).to.equal(false)
      const tx = await sandboxController.connect(owner).setFeeEnabled(true)
      const rcpt = await tx.wait()
      const ev = rcpt.events?.find((e: any) => e.event === "FeeEnabledSet")
      expect(ev.args[0]).to.equal(true)
      expect(await sandboxController.feeEnabled()).to.equal(true)
    })
  })

  describe("addBaseAssetCurve", function() {
    let token: any
    let feed: any
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
      token = await deployMockToken("ABAC", "ABAC", 18)
      feed = await deployPriceFeed()
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
    })
    it("reverts if token=0", async function() {
      await expect(
        sandboxController.addBaseAssetCurve(ethers.constants.AddressZero, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if token not whitelisted", async function() {
      const token2 = await deployMockToken("ABAC2", "ABAC2", 18)
      await expect(
        sandboxController.addBaseAssetCurve(token2.address, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "TokenNotWhitelisted")
    })
    it("reverts if curve invalid", async function() {
      await expect(
        sandboxController.addBaseAssetCurve(token.address, makeInvalidCurveZeroBase())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
      await expect(
        sandboxController.addBaseAssetCurve(token.address, makeInvalidCurveKinkTooHigh())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
    })
    it("reverts if caller not authorized", async function() {
      await expect(
        sandboxController.connect(attacker).addBaseAssetCurve(token.address, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "NotAuthorized")
    })
    it("works if called by owner or dao", async function() {
      await sandboxController.connect(owner).addBaseAssetCurve(token.address, makeValidCurve())
      await sandboxController.connect(dao).addBaseAssetCurve(token.address, makeValidCurve())
      const info = await sandboxController.baseAssets(token.address)
      expect(info.priceFeed).to.equal(feed.address)
    })
  })

  describe("changeBaseAssetCurve", function() {
    let token: any
    let feed: any
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
      token = await deployMockToken("CBAC", "CBAC", 18)
      feed = await deployPriceFeed()
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
    })
    it("reverts if token=0", async function() {
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(ethers.constants.AddressZero, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("reverts if token not whitelisted", async function() {
      const token2 = await deployMockToken("CBAC2", "CBAC2", 18)
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token2.address, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "TokenNotWhitelisted")
    })
    it("reverts if curve index out of range", async function() {
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 99, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
    })
    it("reverts if curve invalid", async function() {
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, makeInvalidCurveZeroBase())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, makeInvalidCurveKinkTooHigh())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
    })
    it("reverts if caller is not dao", async function() {
      await expect(
        sandboxController.connect(owner).changeBaseAssetCurve(token.address, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "NotDao")
      await expect(
        sandboxController.connect(attacker).changeBaseAssetCurve(token.address, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "NotDao")
    })
    it("works if dao calls it", async function() {
      const newCurve = makeValidCurve()
      await sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, newCurve)
      const ba = await sandboxController.baseAssets(token.address)
      expect(ba.priceFeed).to.equal(feed.address)
    })
  })

  describe("transferOwner", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
    })
    it("reverts if caller not owner", async function() {
      await expect(
        sandboxController.connect(dao).transferOwner(dao.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
      await expect(
        sandboxController.connect(attacker).transferOwner(attacker.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
    })
    it("reverts if newOwner=0", async function() {
      await expect(
        sandboxController.connect(owner).transferOwner(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("transfers owner to new address", async function() {
      expect(await sandboxController.owner()).to.equal(owner.address)
      const tx = await sandboxController.connect(owner).transferOwner(other.address)
      const rcpt = await tx.wait()
      const ev = rcpt.events?.find((e: any) => e.event === "OwnerTransferred")
      expect(ev.args.oldOwner).to.equal(owner.address)
      expect(ev.args.newOwner).to.equal(other.address)
      expect(await sandboxController.owner()).to.equal(other.address)
    })
  })

  describe("transferDao", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
    })
    it("reverts if caller not owner", async function() {
      await expect(
        sandboxController.connect(dao).transferDao(other.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
      await expect(
        sandboxController.connect(attacker).transferDao(attacker.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
    })
    it("reverts if newDao=0", async function() {
      await expect(
        sandboxController.connect(owner).transferDao(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })
    it("transfers dao to new address", async function() {
      expect(await sandboxController.dao()).to.equal(dao.address)
      const tx = await sandboxController.connect(owner).transferDao(other.address)
      const rcpt = await tx.wait()
      const ev = rcpt.events?.find((e: any) => e.event === "DaoTransferred")
      expect(ev.args.oldDao).to.equal(dao.address)
      expect(ev.args.newDao).to.equal(other.address)
      expect(await sandboxController.dao()).to.equal(other.address)
    })
  })

  describe("isTokenWhitelisted", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
    })
    it("returns false if token not whitelisted", async function() {
      const token = await deployMockToken("NW", "NW", 18)
      expect(await sandboxController.isTokenWhitelisted(token.address)).to.equal(false)
    })
    it("returns true if base asset whitelisted", async function() {
      const token = await deployMockToken("WW", "WW", 18)
      const feed = await deployPriceFeed()
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 50)
      expect(await sandboxController.isTokenWhitelisted(token.address)).to.equal(true)
    })
  })

  describe("isCurveConfigurationValid", function() {
    beforeEach(async function() {
      sandboxController = await deploySandboxController(
        owner.address,
        dao.address,
        false,
        300000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        100000000000000000n,
        400n,
        5n,
        1000n,
        1000n
      )
    })
    it("returns true for valid curve", async function() {
      const c = makeValidCurve()
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateSlopeBase: c.supplyPerYearInterestRateSlopeBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateSlopeBase: c.borrowPerYearInterestRateSlopeBase
      })
      expect(ok).to.equal(true)
    })
    it("returns false if supplyKink >= 1e18", async function() {
      const c = makeValidCurve()
      c.supplyKink = 1000000000000000000n
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateSlopeBase: c.supplyPerYearInterestRateSlopeBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateSlopeBase: c.borrowPerYearInterestRateSlopeBase
      })
      expect(ok).to.equal(false)
    })
    it("returns false if borrowKink >= 1e18", async function() {
      const c = makeValidCurve()
      c.borrowKink = 1000000000000000000n
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateSlopeBase: c.supplyPerYearInterestRateSlopeBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateSlopeBase: c.borrowPerYearInterestRateSlopeBase
      })
      expect(ok).to.equal(false)
    })
    it("returns false if borrowPerYearInterestRateSlopeBase=0", async function() {
      const c = makeValidCurve()
      c.borrowPerYearInterestRateSlopeBase = 0n
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateSlopeBase: c.supplyPerYearInterestRateSlopeBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateSlopeBase: c.borrowPerYearInterestRateSlopeBase
      })
      expect(ok).to.equal(false)
    })
  })
})