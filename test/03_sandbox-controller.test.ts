import { expect } from "chai";
import { ethers } from "hardhat";
import {
  defaultSandboxControllerOpts,
  makeSandboxController,
  makeMockERC20,
  makePriceFeed,
  exp,
  MIN_UPDATE_TIME,
  DEFAULT_UPDATE_TIME,
  makeValidCurve,
  SnapshotRestorer,
  takeSnapshot,
} from "./helper/helpers";

import { SandboxController } from "../build/types";

import { BaseAssetCurveStruct } from "../build/types/SandboxController";

import { parseEther } from "ethers/lib/utils";

function makeInvalidCurveZeroBase() {
  return {
    supplyKink: parseEther("0.5").toString(),
    supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("500"),
    supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("1000"),
    supplyPerYearInterestRateBase: ethers.BigNumber.from("100"),
    borrowKink: parseEther("0.5").toString(),
    borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("1000"),
    borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("0"),
    borrowPerYearInterestRateBase: ethers.BigNumber.from("0"),
  };
}

function makeInvalidCurveKinkTooHigh() {
  return {
    supplyKink: parseEther("1").toString(),
    supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("500"),
    supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("1000"),
    supplyPerYearInterestRateBase: ethers.BigNumber.from("100"),
    borrowKink: parseEther("1").toString(),
    borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("1000"),
    borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
    borrowPerYearInterestRateBase: ethers.BigNumber.from("1"),
  };
}

describe("3. SandboxController", function () {
  let owner: any;
  let dao: any;
  let attacker: any;
  let other: any;
  let treasury: any;
  let opts: any;
  let sandboxController: SandboxController;

  before(async function () {
    [owner, dao, treasury, attacker, other] = await ethers.getSigners();

    opts = defaultSandboxControllerOpts({
      admin: owner,
      dao: dao,
      treasury: treasury,
      suggestedAmountOfSeedReserves: "1000",
      suggestedLockTimeOfSeedReserves: 3600,
    });

    sandboxController = (await makeSandboxController(opts)).sandboxController;
  });

  describe("deployment with typical valid parameters", function () {
    it("verifies initial values after construction", async function () {
      expect(await sandboxController.owner()).to.equal(owner.address);
      expect(await sandboxController.dao()).to.equal(dao.address);
      expect(await sandboxController.treasury()).to.equal(treasury.address);
      expect(await sandboxController.feeEnabled()).to.equal(false);
      /// Protocol Commissions
      expect(await sandboxController.protocolCommission(0)).to.equal(exp(0.01, 18));
      expect(await sandboxController.protocolCommission(1)).to.equal(exp(0.02, 18));
      expect(await sandboxController.protocolCommission(2)).to.equal(exp(0.03, 18));
      /// Reserve Commissions
      expect(await sandboxController.reserveCommission(0)).to.equal(exp(0.01, 18));
      expect(await sandboxController.reserveCommission(1)).to.equal(exp(0.02, 18));
      expect(await sandboxController.reserveCommission(2)).to.equal(exp(0.03, 18));
    });

    it("verifies config after construction", async function () {
      expect((await sandboxController.config()).storeFrontPriceFactor).to.equal(opts.storeFrontPriceFactor);
      expect((await sandboxController.config()).minUpdateTime).to.equal(MIN_UPDATE_TIME);
      expect((await sandboxController.config()).maxUpdateTime).to.equal(DEFAULT_UPDATE_TIME);
      expect((await sandboxController.config()).suggestedAmountOfSeedReserves).to.equal(opts.suggestedAmountOfSeedReserves);
      expect((await sandboxController.config()).suggestedLockTimeOfSeedReserves).to.equal(opts.suggestedLockTimeOfSeedReserves);
    });

    it("should be no assets by default", async function () {
      expect(await sandboxController.getBaseAssetLength()).to.equal(0);
      expect(await sandboxController.getCollateralAssetLength()).to.equal(0);
    });
  });

  describe("whitelistBaseAsset - reverts", function () {
    let tokenTest;
    let priceFeedTest;
    let curve: BaseAssetCurveStruct;

    before(async function () {
      tokenTest = await makeMockERC20({ name: "TestToken", symbol: "TT" });
      priceFeedTest = await makePriceFeed(tokenTest.address);
      curve = makeValidCurve();
    });

    after(async function () {
      // no assets registered in this testset
      expect(await sandboxController.getBaseAssetLength()).to.equal(0);
      expect(await sandboxController.getCollateralAssetLength()).to.equal(0);
    });

    it("should show that token is not whitelised", async function () {
      expect(await sandboxController.isBaseTokenWhitelisted(tokenTest.address)).to.be.false;
    });

    it("should show no curves for base asset", async function () {
      const assetCurves = await sandboxController.curves(tokenTest.address);

      expect(assetCurves.length).to.equal(0);
    });

    it("reverts if caller is not owner or dao", async function () {
      await expect(
        sandboxController.connect(attacker).whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
      ).to.be.revertedWithCustomError(sandboxController, "Unauthorized");
    });

    it("reverts if token = 0", async function () {
      await expect(
        sandboxController.whitelistBaseAsset(ethers.constants.AddressZero, priceFeedTest.address, curve, 100)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if priceFeed = 0", async function () {
      await expect(
        sandboxController.whitelistBaseAsset(tokenTest.address, ethers.constants.AddressZero, curve, 100)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if base token already whitelisted", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      const token1 = await makeMockERC20({ name: "T1", symbol: "T1" });
      const priceFeed1 = await makePriceFeed(token1.address);
      await sandboxController.whitelistBaseAsset(token1.address, priceFeed1.address, curve, 100);

      const priceFeed2 = await makePriceFeed(token1.address);
      await expect(sandboxController.whitelistBaseAsset(token1.address, priceFeed2.address, curve, 200)).to.be.revertedWithCustomError(
        sandboxController,
        "BaseTokenAlreadyWhitelisted"
      );

      await snapshot.restore();
    });

    it("reverts if token is not associated with price feed", async function () {
      const token1 = await makeMockERC20({ name: "T2", symbol: "T2" });
      const priceFeed1 = await makePriceFeed(token1.address);
      await expect(sandboxController.whitelistBaseAsset(tokenTest.address, priceFeed1.address, curve, 50)).to.be.revertedWithCustomError(
        sandboxController,
        "WrongPriceFeedUnderlying"
      );
    });

    it("reverts if different price feed already used for token", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      const token1 = await makeMockERC20({ name: "C1", symbol: "C1" });
      const priceFeedChainlink = await makePriceFeed(token1.address);
      const priceFeedRedStone = await makePriceFeed(token1.address);
      /// Whitelist token with one price feed vender(for example RedStone)
      await sandboxController.whitelistCollateralAsset(
        token1.address,
        priceFeedRedStone.address,
        exp(1.1, 17),
        exp(1.2, 17),
        exp(1.3, 17),
        exp(1.4, 17),
        exp(1.5, 17),
        exp(1.6, 17)
      );
      /// Try to whitelist token with different price feed vender(for example Chainlink)
      await expect(
        sandboxController.whitelistBaseAsset(token1.address, priceFeedChainlink.address, curve, 100)
      ).to.be.revertedWithCustomError(sandboxController, "DifferentPriceFeedAlreadyUsedForToken");

      await snapshot.restore();
    });

    it("reverts if feed not a valid aggregator", async function () {
      const token = await makeMockERC20({ name: "T3", symbol: "T3" });
      const badFeed = await makeMockERC20({ name: "BadFeed", symbol: "BF" });
      await expect(sandboxController.whitelistBaseAsset(token.address, badFeed.address, curve, 10)).to.be.reverted;
    });

    it("reverts if invalid price feed", async function () {
      const token = await makeMockERC20({ name: "T4", symbol: "T4" });
      const priceFeed = await makePriceFeed(token.address, "0");
      await expect(
        sandboxController.whitelistBaseAsset(token.address, priceFeed.address, makeValidCurve(), 100)
      ).to.be.revertedWithCustomError(sandboxController, "InvalidPriceFeed");
    });

    describe("reverts on invalid curves", function () {
      beforeEach(async function () {
        curve = makeValidCurve();
      });

      it("reverts for zero supply kink", async function () {
        curve.supplyKink = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for zero borrow kink", async function () {
        curve.borrowKink = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply kink > 1e18", async function () {
        curve.supplyKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow kink > 1e18", async function () {
        curve.borrowKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply slope high = 0", async function () {
        curve.supplyPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply slope low = 0", async function () {
        curve.supplyPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow slope high = 0", async function () {
        curve.borrowPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow slope low = 0", async function () {
        curve.borrowPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, makeInvalidCurveKinkTooHigh(), 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });
    });
  });

  describe("whitelistBaseAsset - happy cases", function () {
    let tokenTest;
    let priceFeedTest;
    const curve: BaseAssetCurveStruct = makeValidCurve();
    const minBorrow = 777;

    before(async function () {
      tokenTest = await makeMockERC20({ name: "TestToken2", symbol: "TT2" });
      priceFeedTest = await makePriceFeed(tokenTest.address);

      await sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, minBorrow);
    });

    after(async function () {
      // no collateral assets registered in this testset
      expect(await sandboxController.getCollateralAssetLength()).to.equal(0);
    });

    it("asset is added to the base assets array", async function () {
      expect(await sandboxController.getBaseAssetLength()).to.equal(1);
      expect(await sandboxController.baseAssetTokens(0)).to.equal(tokenTest.address);
    });

    it("should show that token is whitelised", async function () {
      expect(await sandboxController.isBaseTokenWhitelisted(tokenTest.address)).to.be.true;
    });

    it("whitelists token for base asset with correct token details", async function () {
      const data = await sandboxController.baseAssets(tokenTest.address);

      expect(data.priceFeed).to.equal(priceFeedTest.address);
      expect(data.decimals).to.equal(18);
      expect(data.minBorrow).to.equal(minBorrow);
    });

    it("should add data feed for the base asset", async function () {
      expect(await sandboxController.tokenToPriceFeed(tokenTest.address)).to.equal(priceFeedTest.address);
    });

    it("should store curve for base asset", async function () {
      const assetCurves = await sandboxController.curves(tokenTest.address);

      expect(assetCurves.length).to.equal(1);
    });

    it("should store correct curve parameters for base asset", async function () {
      const firstCurve = (await sandboxController.curves(tokenTest.address))[0];

      expect(firstCurve.supplyKink).to.equal(curve.supplyKink);
      expect(firstCurve.supplyPerYearInterestRateSlopeLow).to.equal(curve.supplyPerYearInterestRateSlopeLow);
      expect(firstCurve.supplyPerYearInterestRateSlopeHigh).to.equal(curve.supplyPerYearInterestRateSlopeHigh);
      expect(firstCurve.supplyPerYearInterestRateBase).to.equal(curve.supplyPerYearInterestRateBase);
      expect(firstCurve.borrowKink).to.equal(curve.borrowKink);
      expect(firstCurve.borrowPerYearInterestRateSlopeLow).to.equal(curve.borrowPerYearInterestRateSlopeLow);
      expect(firstCurve.borrowPerYearInterestRateSlopeHigh).to.equal(curve.borrowPerYearInterestRateSlopeHigh);
      expect(firstCurve.borrowPerYearInterestRateBase).to.equal(curve.borrowPerYearInterestRateBase);
    });

    it("whitelists token for collateral asset if base asset already registered", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      expect(
        await sandboxController.whitelistCollateralAsset(
          tokenTest.address,
          priceFeedTest.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.not.be.reverted;

      expect(await sandboxController.tokenToPriceFeed(tokenTest.address)).to.equal(priceFeedTest.address);

      await snapshot.restore();
    });

    it("whitelists same base asset if collateral asset is already registered", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      const token = await makeMockERC20({ name: "C1", symbol: "C1" });
      const priceFeed = await makePriceFeed(token.address);

      await sandboxController.whitelistCollateralAsset(
        token.address,
        priceFeed.address,
        exp(1.1, 17),
        exp(1.2, 17),
        exp(1.3, 17),
        exp(1.4, 17),
        exp(1.5, 17),
        exp(1.6, 17)
      );

      expect(await sandboxController.whitelistBaseAsset(token.address, priceFeed.address, curve, minBorrow)).to.not.be.reverted;
      expect(await sandboxController.tokenToPriceFeed(token.address)).to.equal(priceFeed.address);

      await snapshot.restore();
    });

    it("should emit BaseAssetWhitelisted", async function () {
      const token = await makeMockERC20({ name: "T6", symbol: "T6" });
      const priceFeed = await makePriceFeed(token.address);

      const assetsCount = await sandboxController.getBaseAssetLength();

      expect(await sandboxController.whitelistBaseAsset(token.address, priceFeed.address, curve, minBorrow))
        .to.emit(sandboxController, "BaseAssetWhitelisted")
        .withArgs(token.address, priceFeed.address, 18, assetsCount);
    });

    it("owner can do it, dao can do it", async function () {
      const baseAssetsBefore = await sandboxController.getBaseAssetLength();
      const token1 = await makeMockERC20({ name: "T7", symbol: "T7" });
      const feed1 = await makePriceFeed(token1.address);
      await sandboxController.connect(owner).whitelistBaseAsset(token1.address, feed1.address, curve, 100);

      const token2 = await makeMockERC20({ name: "T8", symbol: "T8" });
      const feed2 = await makePriceFeed(token2.address);
      await sandboxController.connect(dao).whitelistBaseAsset(token2.address, feed2.address, curve, 200);

      const baseAssetsAfter = await sandboxController.getBaseAssetLength();
      expect(baseAssetsAfter.sub(baseAssetsBefore)).to.equal(2);
    });
  });

  describe("whitelistCollateralAsset", function () {
    let sandboxController;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.4").toString(),
        minUpdateTime: 500,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("reverts if caller is not authorized", async function () {
      const token = await makeMockERC20({ name: "C1", symbol: "C1" });
      const priceFeed = await makePriceFeed(token.address);
      await expect(
        sandboxController.connect(attacker).whitelistCollateralAsset(token.address, priceFeed.address, 8000, 5000, 6000, 9000, 7000, 9500)
      ).to.be.revertedWithCustomError(sandboxController, "Unauthorized");
    });

    it("reverts if token = 0", async function () {
      const priceFeed = await makePriceFeed(ethers.constants.AddressZero);
      await expect(
        sandboxController.whitelistCollateralAsset(ethers.constants.AddressZero, priceFeed.address, 8000, 5000, 6000, 9000, 7000, 9500)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if feed = 0", async function () {
      const token = await makeMockERC20({ name: "C2", symbol: "C2" });
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, ethers.constants.AddressZero, 8000, 5000, 6000, 9000, 7000, 9500)
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if token already whitelisted as collateral", async function () {
      const token = await makeMockERC20({ name: "C3", symbol: "C3" });
      const priceFeed = await makePriceFeed(token.address);
      await sandboxController.whitelistCollateralAsset(
        token.address,
        priceFeed.address,
        exp(1.1, 17),
        exp(1.2, 17),
        exp(1.3, 17),
        exp(1.4, 17),
        exp(1.5, 17),
        exp(1.6, 17)
      );
      const newFeed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          newFeed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "CollateralTokenAlreadyWhitelisted");
    });

    it("reverts if feed is used by another token", async function () {
      const tokenA = await makeMockERC20({ name: "C4A", symbol: "C4A" });
      const tokenB = await makeMockERC20({ name: "C4B", symbol: "C4B" });
      const priceFeed = await makePriceFeed(tokenA.address);

      await sandboxController.whitelistCollateralAsset(
        tokenA.address,
        priceFeed.address,
        exp(1.1, 17),
        exp(1.2, 17),
        exp(1.3, 17),
        exp(1.4, 17),
        exp(1.5, 17),
        exp(1.6, 17)
      );

      await expect(
        sandboxController.whitelistCollateralAsset(tokenB.address, priceFeed.address, 5000, 8000, 6000, 9000, 7000, 9500)
      ).to.be.revertedWithCustomError(sandboxController, "WrongPriceFeedUnderlying");
    });

    it("reverts if different price feed already used for token", async function () {
      const token = await makeMockERC20({ name: "C5", symbol: "C5" });
      const priceFeedChainlink = await makePriceFeed(token.address);
      const priceFeedRedStone = await makePriceFeed(token.address);
      /// Whitelist token with one price feed vender(for example Chainlink)
      await sandboxController.whitelistBaseAsset(token.address, priceFeedChainlink.address, makeValidCurve(), 100);
      /// Try to whitelist token with different price feed vender(for example RedStone)
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, priceFeedRedStone.address, 5000, 8000, 6000, 9000, 7000, 9500)
      ).to.be.revertedWithCustomError(sandboxController, "DifferentPriceFeedAlreadyUsedForToken");
    });

    it("reverts if feed not a valid aggregator (mock example)", async function () {
      const token = await makeMockERC20({ name: "C5", symbol: "C5" });
      const badFeed = await makeMockERC20({ name: "FakeFeed2", symbol: "FF2" });
      await expect(sandboxController.whitelistCollateralAsset(token.address, badFeed.address, 8000, 5000, 6000, 9000, 7000, 9500)).to.be
        .reverted;
    });

    it("reverts if invalid price feed (answer=0)", async function () {
      const token = await makeMockERC20({ name: "T6", symbol: "T6" });
      const badPriceFeed = await makePriceFeed(token.address, "0");
      await expect(
        sandboxController.whitelistCollateralAsset(token.address, badPriceFeed.address, 5000, 8000, 6000, 9000, 7000, 9500)
      ).to.be.revertedWithCustomError(sandboxController, "InvalidPriceFeed");
    });

    it("reverts if minBorrowCollateralFactor < 10%", async function () {
      const token = await makeMockERC20({ name: "TKN", symbol: "TKN" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(0.9, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minBorrowCollateralFactor > minLiquidateCollateralFactor", async function () {
      const token = await makeMockERC20({ name: "TKN", symbol: "TKN" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minLiquidateCollateralFactor > minLiquidationFactor", async function () {
      const token = await makeMockERC20({ name: "TKN", symbol: "TKN" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.2, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if maxBorrowCollateralFactor > maxLiquidateCollateralFactor", async function () {
      const token = await makeMockERC20({ name: "TKN", symbol: "TKN" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.1, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if maxLiquidateCollateralFactor > maxLiquidationFactor", async function () {
      const token = await makeMockERC20({ name: "TKN", symbol: "TKN" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.3, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if maxLiquidationFactor > 100%", async function () {
      const token = await makeMockERC20({ name: "TKN", symbol: "TKN" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.1, 18)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minBorrowCollateralFactor > maxBorrowCollateralFactor", async function () {
      const token = await makeMockERC20({ name: "CInv", symbol: "CInv" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.2, 17),
          exp(1.1, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minLiquidateCollateralFactor > maxLiquidateCollateralFactor", async function () {
      const token = await makeMockERC20({ name: "CInv2", symbol: "CInv2" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.4, 17),
          exp(1.3, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minLiquidationFactor > maxLiquidationFactor", async function () {
      const token = await makeMockERC20({ name: "CInv3", symbol: "CInv3" });
      const feed = await makePriceFeed(token.address);
      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          feed.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.6, 17),
          exp(1.5, 17)
        )
      ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("whitelists valid collateral and updates state", async function () {
      const token = await makeMockERC20({ name: "C6", symbol: "C6" });
      const priceFeed = await makePriceFeed(token.address);

      const minBorrowCollateralFactor = exp(1.1, 17);
      const maxBorrowCollateralFactor = exp(1.2, 17);
      const minLiquidateCollateralFactor = exp(1.3, 17);
      const maxLiquidateCollateralFactor = exp(1.4, 17);
      const minLiquidationFactor = exp(1.5, 17);
      const maxLiquidationFactor = exp(1.6, 17);

      await sandboxController.whitelistCollateralAsset(
        token.address,
        priceFeed.address,
        minBorrowCollateralFactor,
        maxBorrowCollateralFactor,
        minLiquidateCollateralFactor,
        maxLiquidateCollateralFactor,
        minLiquidationFactor,
        maxLiquidationFactor
      );

      const data = await sandboxController.collateralAssets(token.address);
      expect(data.collateralToken).to.equal(token.address);
      expect(data.priceFeed).to.equal(priceFeed.address);
      expect(data.decimals).to.equal(18);
      expect(data.maxBorrowCollateralFactor).to.equal(maxBorrowCollateralFactor);
      expect(data.minBorrowCollateralFactor).to.equal(minBorrowCollateralFactor);
      expect(data.minLiquidateCollateralFactor).to.equal(minLiquidateCollateralFactor);
      expect(data.maxLiquidateCollateralFactor).to.equal(maxLiquidateCollateralFactor);
      expect(data.minLiquidationFactor).to.equal(minLiquidationFactor);
      expect(data.maxLiquidationFactor).to.equal(maxLiquidationFactor);

      expect(await sandboxController.getCollateralAssetLength()).to.equal(1);

      expect(await sandboxController.collateralAssetTokens(0)).to.equal(token.address);

      expect(await sandboxController.tokenToPriceFeed(token.address)).to.equal(priceFeed.address);
    });

    it("emits CollateralAssetWhitelisted event with correct args", async function () {
      const token = await makeMockERC20({ name: "C6", symbol: "C6" });
      const priceFeed = await makePriceFeed(token.address);

      const minBorrowCollateralFactor = exp(1.1, 17);
      const maxBorrowCollateralFactor = exp(1.2, 17);
      const minLiquidateCollateralFactor = exp(1.3, 17);
      const maxLiquidateCollateralFactor = exp(1.4, 17);
      const minLiquidationFactor = exp(1.5, 17);
      const maxLiquidationFactor = exp(1.6, 17);

      const tx = await sandboxController.whitelistCollateralAsset(
        token.address,
        priceFeed.address,
        minBorrowCollateralFactor,
        maxBorrowCollateralFactor,
        minLiquidateCollateralFactor,
        maxLiquidateCollateralFactor,
        minLiquidationFactor,
        maxLiquidationFactor
      );
      const rcpt = await tx.wait();

      const ev = rcpt.events?.find(e => e.event === "CollateralAssetWhitelisted");
      expect(ev, "Expected CollateralAssetWhitelisted event").to.exist;
      expect(ev.args.token).to.equal(token.address);
      expect(ev.args.priceFeed).to.equal(priceFeed.address);
      expect(ev.args.decimals).to.equal(18);
      expect(ev.args.minBorrowCollateralFactor).to.equal(minBorrowCollateralFactor);
      expect(ev.args.minLiquidateCollateralFactor).to.equal(minLiquidateCollateralFactor);
      expect(ev.args.maxLiquidateCollateralFactor).to.equal(maxLiquidateCollateralFactor);
      expect(ev.args.minLiquidationFactor).to.equal(minLiquidationFactor);
      expect(ev.args.maxLiquidationFactor).to.equal(maxLiquidationFactor);
      expect(ev.args.maxBorrowCollateralFactor).to.equal(maxBorrowCollateralFactor);
    });

    it("owner can do it, dao can do it", async function () {
      const token1 = await makeMockERC20({ name: "C7", symbol: "C7" });
      const feed1 = await makePriceFeed(token1.address);
      await sandboxController
        .connect(owner)
        .whitelistCollateralAsset(
          token1.address,
          feed1.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        );

      const token2 = await makeMockERC20({ name: "C8", symbol: "C8" });
      const feed2 = await makePriceFeed(token2.address);
      await sandboxController
        .connect(dao)
        .whitelistCollateralAsset(
          token2.address,
          feed2.address,
          exp(1.1, 17),
          exp(1.2, 17),
          exp(1.3, 17),
          exp(1.4, 17),
          exp(1.5, 17),
          exp(1.6, 17)
        );

      expect(await sandboxController.getCollateralAssetLength()).to.equal(2);
    });
  });

  describe("setConfiguration", function () {
    let sandboxController: any;
    type Config = {
      targetPercent: string;
      storeFrontPriceFactor: string;
      minUpdateTime: number;
      maxUpdateTime: number;
      suggestedAmountOfSeedReserves: string;
      suggestedLockTimeOfSeedReserves: number;
    };
    let config: Config;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({ admin: owner, dao: dao });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
      config = {
        targetPercent: ethers.utils.parseEther("0.5").toString(),
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        maxUpdateTime: 604800,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
      };
    });

    it("reverts if caller is not owner", async function () {
      await expect(sandboxController.connect(dao).setConfiguration(config)).to.be.revertedWithCustomError(sandboxController, "NotOwner");
      await expect(sandboxController.connect(attacker).setConfiguration(config)).to.be.revertedWithCustomError(
        sandboxController,
        "NotOwner"
      );
    });

    it("reverts if storeFrontPriceFactor > 1e18", async function () {
      config.storeFrontPriceFactor = parseEther("1").toString();
      await sandboxController.setConfiguration(config);
      expect((await sandboxController.config()).storeFrontPriceFactor).to.equal(parseEther("1").toString());

      config.storeFrontPriceFactor = parseEther("1.001").toString();
      await expect(sandboxController.setConfiguration(config)).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minUpdateTime = 0", async function () {
      config.minUpdateTime = 0;
      await expect(sandboxController.setConfiguration(config)).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if suggestedAmountOfSeedReserves = 0", async function () {
      config.suggestedAmountOfSeedReserves = "0";
      await expect(sandboxController.setConfiguration(config)).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if suggestedLockTimeOfSeedReserves = 0", async function () {
      config.suggestedLockTimeOfSeedReserves = 0;
      await expect(sandboxController.setConfiguration(config)).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("updates configuration with valid values and emits event", async function () {
      expect((await sandboxController.config()).storeFrontPriceFactor).to.equal(parseEther("0.6").toString());
      expect((await sandboxController.config()).minUpdateTime).to.equal(MIN_UPDATE_TIME);
      expect((await sandboxController.config()).maxUpdateTime).to.equal(DEFAULT_UPDATE_TIME);
      expect((await sandboxController.config()).suggestedAmountOfSeedReserves).to.equal(ethers.utils.parseEther("500").toString());
      expect((await sandboxController.config()).suggestedLockTimeOfSeedReserves).to.equal(86400);
      expect((await sandboxController.config()).targetPercent).to.equal(ethers.utils.parseEther("0.5").toString());

      const tx = await sandboxController.setConfiguration({
        storeFrontPriceFactor: parseEther("0.4").toString(),
        minUpdateTime: 400,
        maxUpdateTime: 500,
        suggestedAmountOfSeedReserves: 10,
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.4").toString(),
      });
      const rcpt = await tx.wait();
      const ev = rcpt.events?.find((e: any) => e.event === "ConfigurationChanged");
      /// old config
      expect(ev.args.oldConfig.storeFrontPriceFactor).to.equal(parseEther("0.6").toString());
      expect(ev.args.oldConfig.minUpdateTime).to.equal(MIN_UPDATE_TIME);
      expect(ev.args.oldConfig.maxUpdateTime).to.equal(DEFAULT_UPDATE_TIME);
      expect(ev.args.oldConfig.suggestedAmountOfSeedReserves).to.equal(ethers.utils.parseEther("500").toString());
      expect(ev.args.oldConfig.suggestedLockTimeOfSeedReserves).to.equal(86400);
      expect(ev.args.oldConfig.targetPercent).to.equal(ethers.utils.parseEther("0.5").toString());
      /// new config
      expect(ev.args.newConfig.storeFrontPriceFactor).to.equal(parseEther("0.4").toString());
      expect(ev.args.newConfig.minUpdateTime).to.equal(400);
      expect(ev.args.newConfig.maxUpdateTime).to.equal(500);
      expect(ev.args.newConfig.suggestedAmountOfSeedReserves).to.equal(10);
      expect(ev.args.newConfig.suggestedLockTimeOfSeedReserves).to.equal(1000);
      expect(ev.args.newConfig.targetPercent).to.equal(ethers.utils.parseEther("0.4").toString());
    });
  });

  describe("setFeeEnabled", function () {
    let sandboxController: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("reverts if caller is not owner", async function () {
      await expect(sandboxController.connect(owner).setFeeEnabled(true)).to.be.revertedWithCustomError(sandboxController, "NotDao");
      await expect(sandboxController.connect(attacker).setFeeEnabled(true)).to.be.revertedWithCustomError(sandboxController, "NotDao");
    });

    it("sets feeEnabled and emits event", async function () {
      expect(await sandboxController.feeEnabled()).to.equal(false);
      const tx = await sandboxController.connect(dao).setFeeEnabled(true);
      const rcpt = await tx.wait();
      const ev = rcpt.events?.find((e: any) => e.event === "FeeEnabledSet");
      expect(ev.args[0]).to.equal(true);
      expect(await sandboxController.feeEnabled()).to.equal(true);
    });
  });

  describe("addBaseAssetCurve", function () {
    let sandboxController: any;
    let token: any;
    let priceFeed: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
      token = await makeMockERC20({ name: "T9", symbol: "T9" });
      priceFeed = await makePriceFeed(token.address);
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, priceFeed.address, makeValidCurve(), 10);
    });

    it("reverts if token = 0", async function () {
      await expect(sandboxController.addBaseAssetCurve(ethers.constants.AddressZero, makeValidCurve())).to.be.revertedWithCustomError(
        sandboxController,
        "ZeroAddress"
      );
    });

    it("reverts if token not whitelisted", async function () {
      const token2 = await makeMockERC20({ name: "T10", symbol: "T10" });
      await expect(sandboxController.addBaseAssetCurve(token2.address, makeValidCurve())).to.be.revertedWithCustomError(
        sandboxController,
        "BaseTokenNotWhitelisted"
      );
    });

    it("reverts if curve invalid", async function () {
      await expect(sandboxController.addBaseAssetCurve(token.address, makeInvalidCurveZeroBase())).to.be.revertedWithCustomError(
        sandboxController,
        "InvalidCurveConfiguration"
      );
      await expect(sandboxController.addBaseAssetCurve(token.address, makeInvalidCurveKinkTooHigh())).to.be.revertedWithCustomError(
        sandboxController,
        "InvalidCurveConfiguration"
      );
    });

    it("reverts if caller not authorized", async function () {
      await expect(sandboxController.connect(attacker).addBaseAssetCurve(token.address, makeValidCurve())).to.be.revertedWithCustomError(
        sandboxController,
        "Unauthorized"
      );
    });

    it("works if called by owner or dao, checks that a new curve is appended, checks BaseAssetCurveAdded event", async function () {
      const newCurve = makeValidCurve();
      let tx = await sandboxController.connect(owner).addBaseAssetCurve(token.address, newCurve);
      let rcpt = await tx.wait();
      let ev = rcpt.events?.find((e: any) => e.event === "BaseAssetCurveAdded");
      expect(ev).to.exist;
      expect(ev.args.token).to.equal(token.address);
      expect(ev.args.curveIndex).to.equal(1);
      expect(ev.args.baseAssetCurve.supplyKink).to.equal(newCurve.supplyKink);
      expect(ev.args.baseAssetCurve.supplyPerYearInterestRateSlopeLow).to.equal(newCurve.supplyPerYearInterestRateSlopeLow);
      expect(ev.args.baseAssetCurve.supplyPerYearInterestRateSlopeHigh).to.equal(newCurve.supplyPerYearInterestRateSlopeHigh);
      expect(ev.args.baseAssetCurve.supplyPerYearInterestRateBase).to.equal(newCurve.supplyPerYearInterestRateBase);
      expect(ev.args.baseAssetCurve.borrowKink).to.equal(newCurve.borrowKink);
      expect(ev.args.baseAssetCurve.borrowPerYearInterestRateSlopeLow).to.equal(newCurve.borrowPerYearInterestRateSlopeLow);
      expect(ev.args.baseAssetCurve.borrowPerYearInterestRateSlopeHigh).to.equal(newCurve.borrowPerYearInterestRateSlopeHigh);
      expect(ev.args.baseAssetCurve.borrowPerYearInterestRateBase).to.equal(newCurve.borrowPerYearInterestRateBase);

      let curves = await sandboxController.curves(token.address);
      expect(curves.length).to.equal(2);
      expect(curves[1].supplyKink).to.equal(newCurve.supplyKink);
      expect(curves[1].supplyPerYearInterestRateSlopeLow).to.equal(newCurve.supplyPerYearInterestRateSlopeLow);
      expect(curves[1].supplyPerYearInterestRateSlopeHigh).to.equal(newCurve.supplyPerYearInterestRateSlopeHigh);
      expect(curves[1].supplyPerYearInterestRateBase).to.equal(newCurve.supplyPerYearInterestRateBase);
      expect(curves[1].borrowKink).to.equal(newCurve.borrowKink);
      expect(curves[1].borrowPerYearInterestRateSlopeLow).to.equal(newCurve.borrowPerYearInterestRateSlopeLow);
      expect(curves[1].borrowPerYearInterestRateSlopeHigh).to.equal(newCurve.borrowPerYearInterestRateSlopeHigh);
      expect(curves[1].borrowPerYearInterestRateBase).to.equal(newCurve.borrowPerYearInterestRateBase);

      const anotherCurve = makeValidCurve();
      tx = await sandboxController.connect(dao).addBaseAssetCurve(token.address, anotherCurve);
      rcpt = await tx.wait();
      ev = rcpt.events?.find((e: any) => e.event === "BaseAssetCurveAdded");
      expect(ev).to.exist;
      expect(ev.args.token).to.equal(token.address);
      expect(ev.args.baseAssetCurve.supplyKink).to.equal(anotherCurve.supplyKink);
      expect(ev.args.baseAssetCurve.supplyPerYearInterestRateSlopeLow).to.equal(anotherCurve.supplyPerYearInterestRateSlopeLow);
      expect(ev.args.baseAssetCurve.supplyPerYearInterestRateSlopeHigh).to.equal(anotherCurve.supplyPerYearInterestRateSlopeHigh);
      expect(ev.args.baseAssetCurve.supplyPerYearInterestRateBase).to.equal(anotherCurve.supplyPerYearInterestRateBase);
      expect(ev.args.baseAssetCurve.borrowKink).to.equal(anotherCurve.borrowKink);
      expect(ev.args.baseAssetCurve.borrowPerYearInterestRateSlopeLow).to.equal(anotherCurve.borrowPerYearInterestRateSlopeLow);
      expect(ev.args.baseAssetCurve.borrowPerYearInterestRateSlopeHigh).to.equal(anotherCurve.borrowPerYearInterestRateSlopeHigh);
      expect(ev.args.baseAssetCurve.borrowPerYearInterestRateBase).to.equal(anotherCurve.borrowPerYearInterestRateBase);

      curves = await sandboxController.curves(token.address);
      expect(curves.length).to.equal(3);
      expect(curves[2].supplyKink).to.equal(anotherCurve.supplyKink);
      expect(curves[2].supplyPerYearInterestRateSlopeLow).to.equal(anotherCurve.supplyPerYearInterestRateSlopeLow);
      expect(curves[2].supplyPerYearInterestRateSlopeHigh).to.equal(anotherCurve.supplyPerYearInterestRateSlopeHigh);
      expect(curves[2].supplyPerYearInterestRateBase).to.equal(anotherCurve.supplyPerYearInterestRateBase);
      expect(curves[2].borrowKink).to.equal(anotherCurve.borrowKink);
      expect(curves[2].borrowPerYearInterestRateSlopeLow).to.equal(anotherCurve.borrowPerYearInterestRateSlopeLow);
      expect(curves[2].borrowPerYearInterestRateSlopeHigh).to.equal(anotherCurve.borrowPerYearInterestRateSlopeHigh);
      expect(curves[2].borrowPerYearInterestRateBase).to.equal(anotherCurve.borrowPerYearInterestRateBase);
    });
  });

  describe("changeBaseAssetCurve", function () {
    let sandboxController: any;
    let token: any;
    let priceFeed: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
      token = await makeMockERC20({ name: "T11", symbol: "T11" });
      priceFeed = await makePriceFeed(token.address);
      await sandboxController.connect(owner).whitelistBaseAsset(token.address, priceFeed.address, makeValidCurve(), 10);
    });

    it("reverts if token = 0", async function () {
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(ethers.constants.AddressZero, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if token not whitelisted", async function () {
      const token2 = await makeMockERC20({ name: "T12", symbol: "T12" });
      await expect(sandboxController.connect(dao).changeBaseAssetCurve(token2.address, 0, makeValidCurve())).to.be.revertedWithCustomError(
        sandboxController,
        "BaseTokenNotWhitelisted"
      );
    });

    it("reverts if curve index out of range", async function () {
      await expect(sandboxController.connect(dao).changeBaseAssetCurve(token.address, 99, makeValidCurve())).to.be.revertedWithCustomError(
        sandboxController,
        "InvalidCurveConfiguration"
      );
    });

    it("reverts if curve invalid", async function () {
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, makeInvalidCurveZeroBase())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      await expect(
        sandboxController.connect(dao).changeBaseAssetCurve(token.address, 0, makeInvalidCurveKinkTooHigh())
      ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
    });

    it("reverts if caller is not dao", async function () {
      await expect(sandboxController.connect(owner).changeBaseAssetCurve(token.address, 0, makeValidCurve())).to.be.revertedWithCustomError(
        sandboxController,
        "NotDao"
      );
      await expect(
        sandboxController.connect(attacker).changeBaseAssetCurve(token.address, 0, makeValidCurve())
      ).to.be.revertedWithCustomError(sandboxController, "NotDao");
    });

    it("works if dao calls it, checks old vs new curves and emits BaseAssetCurveChanged", async function () {
      const secondCurve = makeValidCurve();
      await sandboxController.connect(owner).addBaseAssetCurve(token.address, secondCurve);
      let existingCurves = await sandboxController.curves(token.address);
      const oldCurve = existingCurves[1];

      const newCurve = {
        supplyKink: 600,
        supplyPerYearInterestRateSlopeLow: 700,
        supplyPerYearInterestRateSlopeHigh: 1100,
        supplyPerYearInterestRateBase: 150,
        borrowKink: 600,
        borrowPerYearInterestRateSlopeLow: 1100,
        borrowPerYearInterestRateSlopeHigh: 2200,
        borrowPerYearInterestRateBase: 2,
      };

      const tx = await sandboxController.connect(dao).changeBaseAssetCurve(token.address, 1, newCurve);
      const rcpt = await tx.wait();
      const ev = rcpt.events?.find((e: any) => e.event === "BaseAssetCurveChanged");
      expect(ev).to.exist;
      expect(ev.args.token).to.equal(token.address);
      expect(ev.args.curveIndex).to.equal(1);
      expect(ev.args.oldCurve.supplyKink).to.equal(oldCurve.supplyKink);
      expect(ev.args.oldCurve.supplyPerYearInterestRateSlopeLow).to.equal(oldCurve.supplyPerYearInterestRateSlopeLow);
      expect(ev.args.oldCurve.supplyPerYearInterestRateSlopeHigh).to.equal(oldCurve.supplyPerYearInterestRateSlopeHigh);
      expect(ev.args.oldCurve.supplyPerYearInterestRateBase).to.equal(oldCurve.supplyPerYearInterestRateBase);
      expect(ev.args.oldCurve.borrowKink).to.equal(oldCurve.borrowKink);
      expect(ev.args.oldCurve.borrowPerYearInterestRateSlopeLow).to.equal(oldCurve.borrowPerYearInterestRateSlopeLow);
      expect(ev.args.oldCurve.borrowPerYearInterestRateSlopeHigh).to.equal(oldCurve.borrowPerYearInterestRateSlopeHigh);
      expect(ev.args.oldCurve.borrowPerYearInterestRateBase).to.equal(oldCurve.borrowPerYearInterestRateBase);

      expect(ev.args.newCurve.supplyKink).to.equal(newCurve.supplyKink);
      expect(ev.args.newCurve.supplyPerYearInterestRateSlopeLow).to.equal(newCurve.supplyPerYearInterestRateSlopeLow);
      expect(ev.args.newCurve.supplyPerYearInterestRateSlopeHigh).to.equal(newCurve.supplyPerYearInterestRateSlopeHigh);
      expect(ev.args.newCurve.supplyPerYearInterestRateBase).to.equal(newCurve.supplyPerYearInterestRateBase);
      expect(ev.args.newCurve.borrowKink).to.equal(newCurve.borrowKink);
      expect(ev.args.newCurve.borrowPerYearInterestRateSlopeLow).to.equal(newCurve.borrowPerYearInterestRateSlopeLow);
      expect(ev.args.newCurve.borrowPerYearInterestRateSlopeHigh).to.equal(newCurve.borrowPerYearInterestRateSlopeHigh);
      expect(ev.args.newCurve.borrowPerYearInterestRateBase).to.equal(newCurve.borrowPerYearInterestRateBase);

      existingCurves = await sandboxController.curves(token.address);
      const updatedCurve = existingCurves[1];
      expect(updatedCurve.supplyKink).to.equal(newCurve.supplyKink);
      expect(updatedCurve.supplyPerYearInterestRateSlopeLow).to.equal(newCurve.supplyPerYearInterestRateSlopeLow);
      expect(updatedCurve.supplyPerYearInterestRateSlopeHigh).to.equal(newCurve.supplyPerYearInterestRateSlopeHigh);
      expect(updatedCurve.supplyPerYearInterestRateBase).to.equal(newCurve.supplyPerYearInterestRateBase);
      expect(updatedCurve.borrowKink).to.equal(newCurve.borrowKink);
      expect(updatedCurve.borrowPerYearInterestRateSlopeLow).to.equal(newCurve.borrowPerYearInterestRateSlopeLow);
      expect(updatedCurve.borrowPerYearInterestRateSlopeHigh).to.equal(newCurve.borrowPerYearInterestRateSlopeHigh);
      expect(updatedCurve.borrowPerYearInterestRateBase).to.equal(newCurve.borrowPerYearInterestRateBase);
    });
  });

  describe("transferOwner", function () {
    let sandboxController: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("reverts if caller not owner", async function () {
      await expect(sandboxController.connect(dao).transferOwner(dao.address)).to.be.revertedWithCustomError(sandboxController, "NotOwner");
      await expect(sandboxController.connect(attacker).transferOwner(attacker.address)).to.be.revertedWithCustomError(
        sandboxController,
        "NotOwner"
      );
    });

    it("reverts if newOwner = 0", async function () {
      await expect(sandboxController.connect(owner).transferOwner(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        sandboxController,
        "ZeroAddress"
      );
    });

    it("transfers owner to new address", async function () {
      expect(await sandboxController.owner()).to.equal(owner.address);
      const tx = await sandboxController.connect(owner).transferOwner(other.address);
      const rcpt = await tx.wait();
      const ev = rcpt.events?.find((e: any) => e.event === "OwnerTransferred");
      expect(ev.args.oldOwner).to.equal(owner.address);
      expect(ev.args.newOwner).to.equal(other.address);
      expect(await sandboxController.owner()).to.equal(other.address);
    });
  });

  describe("transferDao", function () {
    let sandboxController: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("reverts if caller not owner", async function () {
      await expect(sandboxController.connect(owner).transferDao(other.address)).to.be.revertedWithCustomError(sandboxController, "NotDao");
      await expect(sandboxController.connect(attacker).transferDao(attacker.address)).to.be.revertedWithCustomError(
        sandboxController,
        "NotDao"
      );
    });

    it("reverts if newDao = 0", async function () {
      await expect(sandboxController.connect(dao).transferDao(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        sandboxController,
        "ZeroAddress"
      );
    });

    it("transfers dao to new address", async function () {
      expect(await sandboxController.dao()).to.equal(dao.address);
      const tx = await sandboxController.connect(dao).transferDao(other.address);
      const rcpt = await tx.wait();
      const ev = rcpt.events?.find((e: any) => e.event === "DaoTransferred");
      expect(ev.args.oldDao).to.equal(dao.address);
      expect(ev.args.newDao).to.equal(other.address);
      expect(await sandboxController.dao()).to.equal(other.address);
    });
  });

  describe("isBaseTokenWhitelisted", function () {
    let sandboxController: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("returns false if token not whitelisted", async function () {
      const token = await makeMockERC20({ name: "T13", symbol: "T13" });
      expect(await sandboxController.isBaseTokenWhitelisted(token.address)).to.equal(false);
    });

    it("returns true if base asset whitelisted", async function () {
      const token = await makeMockERC20({ name: "T14", symbol: "T14" });
      const priceFeed = await makePriceFeed(token.address);
      await sandboxController.whitelistBaseAsset(token.address, priceFeed.address, makeValidCurve(), 50);
      expect(await sandboxController.isBaseTokenWhitelisted(token.address)).to.equal(true);
    });
  });

  describe("isCollateralTokenWhitelisted", function () {
    let sandboxController: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("returns false if token not whitelisted", async function () {
      const token = await makeMockERC20({ name: "C15", symbol: "C15" });
      expect(await sandboxController.isCollateralTokenWhitelisted(token.address)).to.equal(false);
    });

    it("returns true if collateral asset whitelisted", async function () {
      const token = await makeMockERC20({ name: "C16", symbol: "C16" });
      const priceFeed = await makePriceFeed(token.address);
      await sandboxController.whitelistCollateralAsset(
        token.address,
        priceFeed.address,
        exp(1.1, 17),
        exp(1.2, 17),
        exp(1.3, 17),
        exp(1.4, 17),
        exp(1.5, 17),
        exp(1.6, 17)
      );
      expect(await sandboxController.isCollateralTokenWhitelisted(token.address)).to.equal(true);
    });
  });

  describe("isCurveConfigurationValid", function () {
    let sandboxController: any;

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    it("returns true for valid curve", async function () {
      const c = makeValidCurve();
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateBase: c.supplyPerYearInterestRateBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateBase: c.borrowPerYearInterestRateBase,
      });
      expect(ok).to.equal(true);
    });

    it("returns false if supplyKink >= 1e18", async function () {
      const c = makeValidCurve();
      c.supplyKink = parseEther("1").toString();
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateBase: c.supplyPerYearInterestRateBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateBase: c.borrowPerYearInterestRateBase,
      });
      expect(ok).to.equal(false);
    });

    it("returns false if borrowKink >= 1e18", async function () {
      const c = makeValidCurve();
      c.borrowKink = parseEther("1").toString();
      const ok = await sandboxController.isCurveConfigurationValid({
        supplyKink: c.supplyKink,
        supplyPerYearInterestRateSlopeLow: c.supplyPerYearInterestRateSlopeLow,
        supplyPerYearInterestRateSlopeHigh: c.supplyPerYearInterestRateSlopeHigh,
        supplyPerYearInterestRateBase: c.supplyPerYearInterestRateBase,
        borrowKink: c.borrowKink,
        borrowPerYearInterestRateSlopeLow: c.borrowPerYearInterestRateSlopeLow,
        borrowPerYearInterestRateSlopeHigh: c.borrowPerYearInterestRateSlopeHigh,
        borrowPerYearInterestRateBase: c.borrowPerYearInterestRateBase,
      });
      expect(ok).to.equal(false);
    });
  });

  describe("Reserve Commission and Thresholds", function () {
    let sandboxController: any;
    let owner: any, dao: any, attacker: any;

    before(async function () {
      [owner, dao, attacker] = await ethers.getSigners();
    });

    beforeEach(async function () {
      const opts = defaultSandboxControllerOpts({
        admin: owner,
        dao: dao,
        feeEnabled: false,
        storeFrontPriceFactor: parseEther("0.3").toString(),
        minUpdateTime: 400,
        suggestedAmountOfSeedReserves: "1000",
        suggestedLockTimeOfSeedReserves: 1000,
        targetPercent: ethers.utils.parseEther("0.5").toString(),
      });
      const c = await makeSandboxController(opts);
      sandboxController = c.sandboxController;
    });

    describe("setReserveCommissions", function () {
      it("reverts if caller is not owner", async function () {
        const newReserveCommissions = [parseEther("0.5").toString(), parseEther("0.3").toString(), parseEther("0.2").toString()];
        await expect(sandboxController.connect(dao).setReserveCommissions(newReserveCommissions)).to.be.revertedWithCustomError(
          sandboxController,
          "NotOwner"
        );
        await expect(sandboxController.connect(attacker).setReserveCommissions(newReserveCommissions)).to.be.revertedWithCustomError(
          sandboxController,
          "NotOwner"
        );
      });

      it("reverts if any new reserve commission causes sum with protocol commission to exceed 80%", async function () {
        const newReserveCommissions = [
          parseEther("0.800000000000000001").toString(),
          parseEther("0.3").toString(),
          parseEther("0.2").toString(),
        ];
        await expect(sandboxController.connect(owner).setReserveCommissions(newReserveCommissions)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCommissions"
        );
      });

      it("updates reserve commissions and emits events", async function () {
        const newReserveCommissions = [parseEther("0.5").toString(), parseEther("0.3").toString(), parseEther("0.2").toString()];
        const tx = await sandboxController.connect(owner).setReserveCommissions(newReserveCommissions);
        const rcpt = await tx.wait();
        const events = rcpt.events.filter((e: any) => e.event === "ReserveCommissionChanged");
        expect(events.length).to.equal(3);
        const oldValue = [exp(0.01, 18).toString(), exp(0.02, 18).toString(), exp(0.03, 18).toString()];
        for (let i = 0; i < 3; i++) {
          expect(events[i].args.state).to.equal(i);
          expect(events[i].args.oldValue).to.equal(oldValue[i]);
          expect(events[i].args.newValue).to.equal(newReserveCommissions[i]);
          const value = await sandboxController.reserveCommission(i);
          expect(value).to.equal(newReserveCommissions[i]);
        }
      });
    });

    describe("setProtocolCommissions", function () {
      it("reverts if caller is not owner", async function () {
        const protocolCommissions = [parseEther("0.4").toString(), parseEther("0.2").toString(), parseEther("0.1").toString()];
        await expect(sandboxController.connect(dao).setProtocolCommissions(protocolCommissions)).to.be.revertedWithCustomError(
          sandboxController,
          "NotOwner"
        );
        await expect(sandboxController.connect(attacker).setProtocolCommissions(protocolCommissions)).to.be.revertedWithCustomError(
          sandboxController,
          "NotOwner"
        );
      });

      it("reverts if any new protocol commission causes sum with reserve commission to exceed 80%", async function () {
        await sandboxController
          .connect(owner)
          .setReserveCommissions([parseEther("0.1").toString(), parseEther("0.3").toString(), parseEther("0.1").toString()]);

        const protocolCommissions = [parseEther("0.1").toString(), parseEther("0.600000000000000001"), parseEther("0.1").toString()];
        await expect(sandboxController.connect(owner).setProtocolCommissions(protocolCommissions)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCommissions"
        );
      });

      it("updates protocol commissions and emits events", async function () {
        const newProtocolCommissions = [parseEther("0.4").toString(), parseEther("0.2").toString(), parseEther("0.1").toString()];
        const tx = await sandboxController.connect(owner).setProtocolCommissions(newProtocolCommissions);
        const rcpt = await tx.wait();
        const events = rcpt.events.filter((e: any) => e.event === "ProtocolCommissionChanged");
        expect(events.length).to.equal(3);
        const oldValue = [exp(0.01, 18).toString(), exp(0.02, 18).toString(), exp(0.03, 18).toString()];
        for (let i = 0; i < 3; i++) {
          expect(events[i].args.state).to.equal(i);
          expect(events[i].args.oldValue).to.equal(oldValue[i]);
          expect(events[i].args.newValue).to.equal(newProtocolCommissions[i]);
          const value = await sandboxController.protocolCommission(i);
          expect(value).to.equal(newProtocolCommissions[i]);
        }
      });
    });
  });

  describe("setTreasury", function () {
    it("reverts if caller is not owner", async function () {
      await expect(sandboxController.connect(dao).setTreasury(attacker.address)).to.be.revertedWithCustomError(
        sandboxController,
        "NotOwner"
      );
      await expect(sandboxController.connect(attacker).setTreasury(attacker.address)).to.be.revertedWithCustomError(
        sandboxController,
        "NotOwner"
      );
    });

    it("reverts if _treasury is the zero address", async function () {
      await expect(sandboxController.setTreasury(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        sandboxController,
        "ZeroAddress"
      );
    });

    it("reverts if same treasury is set", async function () {
      await expect(sandboxController.setTreasury(treasury.address)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
    });

    it("sets treasury and emits TreasuryChanged event", async function () {
      const newTreasury = other.address;
      const oldTreasury = await sandboxController.treasury();

      expect(await sandboxController.setTreasury(newTreasury))
        .to.emit(sandboxController, "TreasuryChanged")
        .withArgs(oldTreasury, newTreasury);
      expect(await sandboxController.treasury()).to.equal(newTreasury);
    });
  });
});
