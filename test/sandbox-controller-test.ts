import { expect } from "chai"
import { ethers } from "hardhat"
import {
  defaultControllerOpts,
  makeSandboxController,
  makeMockERC20,
  makePriceFeed
} from "./helper/helpers"

function makeValidCurve() {
  return {
    supplyKink: ethers.BigNumber.from("500000000000000000"),
    supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("500"),
    supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("1000"),
    supplyPerYearInterestRateSlopeBase: ethers.BigNumber.from("100"),
    borrowKink: ethers.BigNumber.from("500000000000000000"),
    borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("1000"),
    borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
    borrowPerYearInterestRateSlopeBase: ethers.BigNumber.from("1")
  }
}

function makeInvalidCurveZeroBase() {
  return {
    supplyKink: ethers.BigNumber.from("500000000000000000"),
    supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("500"),
    supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("1000"),
    supplyPerYearInterestRateSlopeBase: ethers.BigNumber.from("100"),
    borrowKink: ethers.BigNumber.from("500000000000000000"),
    borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("1000"),
    borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
    borrowPerYearInterestRateSlopeBase: ethers.BigNumber.from("0")
  }
}

function makeInvalidCurveKinkTooHigh() {
  return {
    supplyKink: ethers.BigNumber.from("1000000000000000000"),
    supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("500"),
    supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("1000"),
    supplyPerYearInterestRateSlopeBase: ethers.BigNumber.from("100"),
    borrowKink: ethers.BigNumber.from("1000000000000000000"),
    borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("1000"),
    borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
    borrowPerYearInterestRateSlopeBase: ethers.BigNumber.from("1")
  }
}

describe("SandboxController", function() {
  let owner: any
  let dao: any
  let attacker: any
  let other: any
  let SandboxControllerFactory: any

  before(async function() {
    SandboxControllerFactory = await ethers.getContractFactory("SandboxController");
    [owner, dao, attacker, other] = await ethers.getSigners()
  })

  describe("constructor", function() {
    it("initializes state with correct values", async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: true,
        storeFrontPriceFactor: "999999999999999999",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "200000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "200000000000000000",
        minUpdateTime: 300,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 500
      })
      const { sandboxController } = await makeSandboxController(opts)
      expect(await sandboxController.owner()).to.equal(owner.address)
      expect(await sandboxController.dao()).to.equal(dao.address)
      expect(await sandboxController.feeEnabled()).to.equal(true)
      expect(await sandboxController.storeFrontPriceFactor()).to.equal("999999999999999999")
      expect(await sandboxController.protocolFactorBorrow()).to.equal("100000000000000000")
      expect(await sandboxController.reserveFactorBorrow()).to.equal("200000000000000000")
      expect(await sandboxController.protocolFactorLiquidation()).to.equal("100000000000000000")
      expect(await sandboxController.reserveFactorLiquidation()).to.equal("200000000000000000")
      expect(await sandboxController.minUpdateTime()).to.equal(300)
      expect(await sandboxController.maxCollateralAssets()).to.equal(5)
      expect(await sandboxController.suggestedAmountOfSeedReserves()).to.equal("1000")
      expect(await sandboxController.suggestedLockTimeOfSeedReserves()).to.equal(500)
    })

    it("reverts if owner=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          ethers.constants.AddressZero, 
          dao.address,
          true,
          "999999999999999999",
          "100000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "ZeroAddress")
    })

    it("reverts if dao=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          ethers.constants.AddressZero,
          true,
          "999999999999999999",
          "100000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "ZeroAddress")
    })

    it("reverts if storeFrontPriceFactor >= 1e18", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          true,
          "1000000000000000000",
          "100000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if protocolFactorBorrow=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          false,
          "500000000000000000",
          "0",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if reserveFactorBorrow=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          true,
          "500000000000000000",
          "200000000000000000",
          "0",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if protocolFactorBorrow+reserveFactorBorrow > 1e18", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          true,
          "500000000000000000",
          ethers.utils.parseEther("0.6").toString(),
          ethers.utils.parseEther("0.5").toString(),
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if protocolFactorLiquidation=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          false,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          "0", 
          "200000000000000000",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if reserveFactorLiquidation=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          true,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          "100000000000000000",
          "0",
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if protocolFactorLiquidation+reserveFactorLiquidation > 1e18", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          true,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          ethers.utils.parseEther("0.8").toString(),
          ethers.utils.parseEther("0.3").toString(), 
          300,
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if minUpdateTime=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          false,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          0, // invalid
          5,
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if maxCollateralAssets=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          false,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          0, // invalid
          1000,
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if suggestedAmountOfSeedReserves=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          false,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          "0", // invalid
          500
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })

    it("reverts if suggestedLockTimeOfSeedReserves=0", async function() {
      await expect(
        SandboxControllerFactory.deploy(
          owner.address,
          dao.address,
          false,
          "500000000000000000",
          "200000000000000000",
          "200000000000000000",
          "100000000000000000",
          "200000000000000000",
          300,
          5,
          1000,
          0 // invalid
        )
      ).to.be.revertedWithCustomError(SandboxControllerFactory, "InvalidFactors")
    })
  });
  describe("deployment with typical valid parameters", function() {
    it("verifies initial values after construction", async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "100000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 300,
        maxCollateralAssets: 10,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 3600
      })
      const { sandboxController } = await makeSandboxController(opts)
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
      expect(await sandboxController.suggestedAmountOfSeedReserves()).to.equal("1000")
      expect(await sandboxController.suggestedLockTimeOfSeedReserves()).to.equal(3600)
      expect(await sandboxController.baseAssetCount()).to.equal(0)
      expect(await sandboxController.collateralAssetCount()).to.equal(0)
    })
  })

  describe("whitelistBaseAsset", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "500000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 500,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("reverts if caller is not owner or dao", async function() {
      const token = await makeMockERC20({ name: "TestToken", symbol: "TT" })
      const feed = await makePriceFeed({})
      await expect(
        sandboxController.connect(attacker).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
      ).to.be.revertedWithCustomError(sandboxController, "NotAuthorized")
    })

    it("reverts if token=0", async function() {
      const feed = await makePriceFeed({})
      await expect(
        sandboxController.whitelistBaseAsset(ethers.constants.AddressZero, feed.address, makeValidCurve(), 100)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("reverts if priceFeed=0", async function() {
      const token = await makeMockERC20({ name: "TokenZeroFeed", symbol: "TZF" })
      await expect(
        sandboxController.whitelistBaseAsset(token.address, ethers.constants.AddressZero, makeValidCurve(), 100)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("reverts if token already whitelisted", async function() {
      const token = await makeMockERC20({ name: "T1", symbol: "T1" })
      const feed = await makePriceFeed({})
      const curve = makeValidCurve()
      await sandboxController.whitelistBaseAsset(token.address, feed.address, curve, 100)
      const token2Feed = await makePriceFeed({})
      await expect(
        sandboxController.whitelistBaseAsset(token.address, token2Feed.address, curve, 200)
      ).to.be.revertedWithCustomError(sandboxController, "TokenAlreadyWhitelisted")
    })

    it("reverts if feed already whitelisted by another token", async function() {
      const token1 = await makeMockERC20({ name: "T2", symbol: "T2" })
      const token2 = await makeMockERC20({ name: "T3", symbol: "T3" })
      const feed = await makePriceFeed({})
      const curve = makeValidCurve()
      await sandboxController.whitelistBaseAsset(token1.address, feed.address, curve, 50)
      await expect(
        sandboxController.whitelistBaseAsset(token2.address, feed.address, curve, 50)
      ).to.be.revertedWithCustomError(sandboxController, "PriceFeedAlreadyWhitelisted")
    })

    it("reverts if curve is invalid", async function() {
      const token = await makeMockERC20({ name: "T4", symbol: "T4" })
      const feed = await makePriceFeed({})
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, makeInvalidCurveZeroBase(), 10)
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
      await expect(
        sandboxController.whitelistBaseAsset(token.address, feed.address, makeInvalidCurveKinkTooHigh(), 10)
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration")
    })

    it("reverts if feed not a valid aggregator", async function() {
      const token = await makeMockERC20({ name: "T5", symbol: "T5" })
      const badFeed = await makeMockERC20({ name: "BadFeed", symbol: "BF" })
      await expect(
        sandboxController.whitelistBaseAsset(token.address, badFeed.address, makeValidCurve(), 10)
      ).to.be.reverted
    })

    it("whitelists token for base asset with correct state changes", async function() {
      const token = await makeMockERC20({ name: "T6", symbol: "T6" })
      const feed = await makePriceFeed({})
      const curve = makeValidCurve()
      await sandboxController.whitelistBaseAsset(token.address, feed.address, curve, 777)
      const data = await sandboxController.baseAssets(token.address)
      expect(data.priceFeed).to.equal(feed.address)
      expect(data.decimals).to.equal(18)
      expect(data.minBorrow).to.equal(777)
      const count = await sandboxController.baseAssetCount()
      expect(count).to.equal(1)
      expect(await sandboxController.baseAssetTokens(0)).to.equal(token.address)
      expect(await sandboxController.isPriceFeedWhitelisted(feed.address)).to.be.true
    })

    it("owner can do it, dao can do it", async function() {
      const token1 = await makeMockERC20({ name: "T7", symbol: "T7" })
      const feed1 = await makePriceFeed({})
      await sandboxController.connect(owner).whitelistBaseAsset(token1.address, feed1.address, makeValidCurve(), 100)
      const token2 = await makeMockERC20({ name: "T8", symbol: "T8" })
      const feed2 = await makePriceFeed({})
      await sandboxController.connect(dao).whitelistBaseAsset(token2.address, feed2.address, makeValidCurve(), 200)
      expect(await sandboxController.baseAssetCount()).to.equal(2)
    })
  })

  describe("whitelistCollateralAsset", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "400000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 500,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("reverts if caller is not authorized", async function() {
      const token = await makeMockERC20({ name: "C1", symbol: "C1" })
      const feed = await makePriceFeed({})
      await expect(
        sandboxController.connect(attacker).whitelistCollateralAsset(token.address, feed.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotAuthorized")
    })

    it("reverts if token=0", async function() {
      const feed = await makePriceFeed({})
      await expect(
        sandboxController.whitelistCollateralAsset(ethers.constants.AddressZero, feed.address)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("reverts if feed=0", async function() {
      const token = await makeMockERC20({ name: "C2", symbol: "C2" })
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("reverts if token already whitelisted as collateral", async function() {
      const token = await makeMockERC20({ name: "C3", symbol: "C3" })
      const feed = await makePriceFeed({})
      await sandboxController.whitelistCollateralAsset(token.address, feed.address)
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, (await makePriceFeed({})).address)
      ).to.be.revertedWithCustomError(sandboxController, "TokenAlreadyWhitelisted")
    })

    it("reverts if feed is used by another token", async function() {
      const tokenA = await makeMockERC20({ name: "C4A", symbol: "C4A" })
      const tokenB = await makeMockERC20({ name: "C4B", symbol: "C4B" })
      const feed = await makePriceFeed({})
      await sandboxController.whitelistCollateralAsset(tokenA.address, feed.address)
      await expect(
        sandboxController.whitelistCollateralAsset(tokenB.address, feed.address)
      ).to.be.revertedWithCustomError(sandboxController, "PriceFeedAlreadyWhitelisted")
    })

    it("reverts if feed not valid aggregator", async function() {
      const token = await makeMockERC20({ name: "C5", symbol: "C5" })
      const badFeed = await makeMockERC20({ name: "FakeFeed2", symbol: "FF2" })
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, badFeed.address)
      ).to.be.reverted
    })

    it("whitelists valid collateral and updates state", async function() {
      const token = await makeMockERC20({ name: "C6", symbol: "C6" })
      const feed = await makePriceFeed({})
      await sandboxController.whitelistCollateralAsset(token.address, feed.address)
      const data = await sandboxController.collateralAssets(token.address)
      expect(data).to.equal(feed.address)
      expect(await sandboxController.collateralAssetCount()).to.equal(1)
      expect(await sandboxController.collateralAssetTokens(0)).to.equal(token.address)
      expect(await sandboxController.isPriceFeedWhitelisted(feed.address)).to.equal(true)
    })

    it("owner can do it, dao can do it", async function() {
      const token1 = await makeMockERC20({ name: "C7", symbol: "C7" })
      const feed1 = await makePriceFeed({})
      await sandboxController.connect(owner).whitelistCollateralAsset(token1.address, feed1.address)
      const token2 = await makeMockERC20({ name: "C8", symbol: "C8" })
      const feed2 = await makePriceFeed({})
      await sandboxController.connect(dao).whitelistCollateralAsset(token2.address, feed2.address)
      expect(await sandboxController.collateralAssetCount()).to.equal(2)
    })
  })

//   function setConfiguration(
//     uint256 _storeFrontPriceFactor,
//     uint256 _minUpdateTime,
//     uint256 _suggestedAmountOfSeedReserves,
//     uint256 _suggestedLockTimeOfSeedReserves
// ) external onlyOwner {
//      if (_storeFrontPriceFactor >= 1e18 ||
//         _minUpdateTime == 0 ||
//         _suggestedAmountOfSeedReserves == 0 ||
//         _suggestedLockTimeOfSeedReserves == 0) {
//         revert InvalidFactors();
//     }

//     storeFrontPriceFactor = _storeFrontPriceFactor;
//     minUpdateTime = _minUpdateTime;
//     suggestedAmountOfSeedReserves = _suggestedAmountOfSeedReserves;
//     suggestedLockTimeOfSeedReserves = _suggestedLockTimeOfSeedReserves;
   

//     emit ConfigChanged(
//         _storeFrontPriceFactor,
//         _minUpdateTime,
//         _suggestedAmountOfSeedReserves,
//         _suggestedLockTimeOfSeedReserves
//     );
// }

  describe("setConfiguration", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("reverts if caller is not owner", async function() {
      await expect(
        sandboxController.connect(dao).setConfiguration(
          "300000000000000000",
          400,
          "1000",
          1000
        )
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
      await expect(
        sandboxController.connect(attacker).setConfiguration(
          "300000000000000000",
          400,
          "1000",
          1000
        )
      ).to.be.revertedWithCustomError(sandboxController, "NotOwner")
    })


    it("reverts if storeFrontPriceFactor >= 1e18", async function() {
      await expect(
        sandboxController.setConfiguration(
          "1000000000000000000",
          400,
          "1000",
          1000
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })


    it("reverts if minUpdateTime=0", async function() {
      await expect(
        sandboxController.setConfiguration(
          "300000000000000000",
          0,
          "1000",
          1000
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })


    it("reverts if suggestedAmountOfSeedReserves=0", async function() {
      await expect(
        sandboxController.setConfiguration(
          "300000000000000000",
          400,
          "0",
          1000
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })


    it("reverts if suggestedLockTimeOfSeedReserves=0", async function() {
      await expect(
        sandboxController.setConfiguration(
          "300000000000000000",
          400,
          "1000",
          0
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors")
    })


    it("updates configuration with valid values", async function() {
      await sandboxController.setConfiguration(
        "400000000000000000",
        500,
        "2000",
        2000
      )
      expect(await sandboxController.storeFrontPriceFactor()).to.equal("400000000000000000")
      expect(await sandboxController.minUpdateTime()).to.equal(500)
      expect(await sandboxController.suggestedAmountOfSeedReserves()).to.equal("2000")
      expect(await sandboxController.suggestedLockTimeOfSeedReserves()).to.equal(2000)
    })
  });

  describe("setFeeEnabled", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("reverts if caller is not owner", async function() {
      await expect(
        sandboxController.connect(owner).setFeeEnabled(true)
      ).to.be.revertedWithCustomError(sandboxController, "NotDao")
      await expect(
        sandboxController.connect(attacker).setFeeEnabled(true)
      ).to.be.revertedWithCustomError(sandboxController, "NotDao")
    })

    it("sets feeEnabled and emits event", async function() {
      expect(await sandboxController.feeEnabled()).to.equal(false)
      const tx = await sandboxController.connect(dao).setFeeEnabled(true)
      const rcpt = await tx.wait()
      const ev = rcpt.events?.find((e: any) => e.event === "FeeEnabledSet")
      expect(ev.args[0]).to.equal(true)
      expect(await sandboxController.feeEnabled()).to.equal(true)
    })
  })

  describe("addBaseAssetCurve", function() {
    let sandboxController: any
    let token: any
    let feed: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
      token = await makeMockERC20({name: "T9", symbol: "T9"})
      feed = await makePriceFeed({})
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
    })

    it("reverts if token=0", async function() {
      await expect(
        sandboxController.addBaseAssetCurve(ethers.constants.AddressZero, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("reverts if token not whitelisted", async function() {
      const token2 = await makeMockERC20({name: "T10", symbol: "T10"})
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
    let sandboxController: any
    let token: any
    let feed: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
      token = await makeMockERC20({name: "T11", symbol: "T11"})
      feed = await makePriceFeed({})
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 10)
    })

    it("reverts if token=0", async function() {
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(ethers.constants.AddressZero, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("reverts if token not whitelisted", async function() {
      const token2 = await makeMockERC20({name: "T12", symbol: "T12"})
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
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
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
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("reverts if caller not owner", async function() {
      await expect(
        sandboxController.connect(owner).transferDao(other.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotDao")
      await expect(
        sandboxController.connect(attacker).transferDao(attacker.address)
      ).to.be.revertedWithCustomError(sandboxController, "NotDao")
    })

    it("reverts if newDao=0", async function() {
      await expect(
        sandboxController.connect(dao).transferDao(ethers.constants.AddressZero)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress")
    })

    it("transfers dao to new address", async function() {
      expect(await sandboxController.dao()).to.equal(dao.address)
      const tx = await sandboxController.connect(dao).transferDao(other.address)
      const rcpt = await tx.wait()
      const ev = rcpt.events?.find((e: any) => e.event === "DaoTransferred")
      expect(ev.args.oldDao).to.equal(dao.address)
      expect(ev.args.newDao).to.equal(other.address)
      expect(await sandboxController.dao()).to.equal(other.address)
    })
  })

  describe("isBaseTokenWhitelisted", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("returns false if token not whitelisted", async function() {
      const token = await makeMockERC20({name: "T13", symbol: "T13"})
      expect(await sandboxController.isBaseTokenWhitelisted(token.address)).to.equal(false)
    })

    it("returns true if base asset whitelisted", async function() {
      const token = await makeMockERC20({name: "T14", symbol: "T14"})
      const feed = await makePriceFeed({})
      await sandboxController.whitelistBaseAsset(token.address, feed.address, makeValidCurve(), 50)
      expect(await sandboxController.isBaseTokenWhitelisted(token.address)).to.equal(true)
    })
  })

  describe("isCollateralTokenWhitelisted", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
    })

    it("returns false if token not whitelisted", async function() {
      const token = await makeMockERC20({name: "C15", symbol: "C15"})
      expect(await sandboxController.isCollateralTokenWhitelisted(token.address)).to.equal(false)
    })

    it("returns true if collateral asset whitelisted", async function() {
      const token = await makeMockERC20({name: "C16", symbol: "C16"})
      const feed = await makePriceFeed({})
      await sandboxController.whitelistCollateralAsset(token.address, feed.address)
      expect(await sandboxController.isCollateralTokenWhitelisted(token.address)).to.equal(true)
    })

  });

  describe("isCurveConfigurationValid", function() {
    let sandboxController: any

    beforeEach(async function() {
      const opts = defaultControllerOpts({
        admin: owner,
        governor: dao,
        feeEnabled: false,
        storeFrontPriceFactor: "300000000000000000",
        protocolFactorBorrow: "100000000000000000",
        reserveFactorBorrow: "100000000000000000",
        protocolFactorLiquidation: "100000000000000000",
        reserveFactorLiquidation: "100000000000000000",
        minUpdateTime: 400,
        maxCollateralAssets: 5,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000
      })
      const c = await makeSandboxController(opts)
      sandboxController = c.sandboxController
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
      c.supplyKink = ethers.BigNumber.from("1000000000000000000")
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
      c.borrowKink = ethers.BigNumber.from("1000000000000000000")
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
      c.borrowPerYearInterestRateSlopeBase = ethers.BigNumber.from("0")
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
