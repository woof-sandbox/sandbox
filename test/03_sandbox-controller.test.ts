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
  SandboxControllerOpts,
} from "./helper/helpers";

import { SandboxController } from "../build/types";

import { BaseAssetCurveStruct, SandboxControllerConfigurationStruct } from "../build/types/SandboxController";

import { parseEther } from "ethers/lib/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe.only("3. SandboxController", function () {
  let owner: SignerWithAddress;
  let dao: SignerWithAddress;
  let attacker: SignerWithAddress;
  let other: SignerWithAddress;
  let treasury: SignerWithAddress;
  let opts: SandboxControllerOpts;
  let sandboxController: SandboxController;

  before(async function () {
    [owner, dao, treasury, attacker, other] = await ethers.getSigners();

    opts = defaultSandboxControllerOpts({
      dao: dao,
      treasury: treasury.address,
    });

    sandboxController = (await makeSandboxController(opts)).sandboxController;
  });

  describe("deployment with typical valid parameters", function () {
    it("verifies initial values after construction", async function () {
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
      expect((await sandboxController.config()).storeFrontPriceFactor).to.equal(opts.config.storeFrontPriceFactor);
      expect((await sandboxController.config()).minUpdateTime).to.equal(MIN_UPDATE_TIME);
      expect((await sandboxController.config()).maxUpdateTime).to.equal(DEFAULT_UPDATE_TIME);
      expect((await sandboxController.config()).suggestedAmountOfSeedReserves).to.equal(opts.config.suggestedAmountOfSeedReserves);
      expect((await sandboxController.config()).suggestedLockTimeOfSeedReserves).to.equal(opts.config.suggestedLockTimeOfSeedReserves);
    });

    it("sets update time boundaries", async function () {
      const configTest = await sandboxController.config();

      expect((await sandboxController.proposalBoundaries())[0]).to.equal(MIN_UPDATE_TIME);
      expect((await sandboxController.proposalBoundaries())[1]).to.equal(DEFAULT_UPDATE_TIME);

      expect((await sandboxController.proposalBoundaries())[0]).to.equal(configTest.minUpdateTime);
      expect((await sandboxController.proposalBoundaries())[1]).to.equal(configTest.maxUpdateTime);
    });
  });

  describe("whitelistBaseAsset - reverts", function () {
    let tokenTest;
    let priceFeedTest;
    let curve: BaseAssetCurveStruct = makeValidCurve();

    before(async function () {
      tokenTest = await makeMockERC20({ name: "TestToken", symbol: "TT" });
      priceFeedTest = await makePriceFeed(tokenTest.address);
    });

    it("should show that token is not whitelised", async function () {
      expect(await sandboxController.isBaseTokenWhitelisted(tokenTest.address)).to.be.false;
    });

    it("should show no curves for base asset", async function () {
      const assetCurves = await sandboxController.curves(tokenTest.address);

      expect(assetCurves.length).to.equal(0);
    });

    it("reverts if caller is not dao", async function () {
      await expect(sandboxController.connect(attacker).whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10))
        .to.be.revertedWithCustomError(sandboxController, "NotDao")
        .withArgs(attacker.address);
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
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply kink > 1e18", async function () {
        curve.supplyKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow kink > 1e18", async function () {
        curve.borrowKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply slope high = 0", async function () {
        curve.supplyPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply slope low = 0", async function () {
        curve.supplyPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow slope high = 0", async function () {
        curve.borrowPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow slope low = 0", async function () {
        curve.borrowPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow base = 0", async function () {
        curve.borrowPerYearInterestRateBase = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply base = 0", async function () {
        curve.supplyPerYearInterestRateBase = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10)
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
    });

    it("whitelists asset", async function () {
      expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.true;
      await expect(sandboxController.whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, minBorrow)).to.not.be.reverted;
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

    it("minBorrow getter works", async function () {
      const data = await sandboxController.baseAssets(tokenTest.address);

      expect(await sandboxController.borrowMin(tokenTest.address)).to.equal(minBorrow);
      expect(await sandboxController.borrowMin(tokenTest.address)).to.equal(data.minBorrow);
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

      await expect(
        sandboxController.whitelistCollateralAsset(
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

      await expect(sandboxController.whitelistBaseAsset(token.address, priceFeed.address, curve, minBorrow)).to.not.be.reverted;
      expect(await sandboxController.tokenToPriceFeed(token.address)).to.equal(priceFeed.address);

      await snapshot.restore();
    });

    it("should emit BaseAssetWhitelisted", async function () {
      const token = await makeMockERC20({ name: "T6", symbol: "T6" });
      const priceFeed = await makePriceFeed(token.address);

      expect(await sandboxController.whitelistBaseAsset(token.address, priceFeed.address, curve, minBorrow))
        .to.emit(sandboxController, "BaseAssetWhitelisted")
        .withArgs(token.address, priceFeed.address, 18);
    });
  });

  describe("whitelistCollateralAsset - reverts", function () {
    let tokenCollateralTest;
    let priceFeedCollateralTest;

    let collateralConfig = {
      minBorrowColF: ethers.utils.parseEther("0.5").toString(),
      maxBorrowColF: ethers.utils.parseEther("0.8").toString(),
      minLiqColF: ethers.utils.parseEther("0.6").toString(),
      maxLiqColF: ethers.utils.parseEther("0.9").toString(),
      minLiqF: ethers.utils.parseEther("0.7").toString(),
      maxLiqF: ethers.utils.parseEther("0.95").toString(),
    };

    before(async function () {
      tokenCollateralTest = await makeMockERC20({ name: "CollateralToken", symbol: "CT" });
      priceFeedCollateralTest = await makePriceFeed(tokenCollateralTest.address);
    });

    it("should not recognize random token as whitelisted", async function () {
      expect(await sandboxController.isCollateralTokenWhitelisted(tokenCollateralTest.address)).to.be.false;
    });

    it("reverts if caller is not dao", async function () {
      await expect(
        sandboxController
          .connect(attacker)
          .whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
      )
        .to.be.revertedWithCustomError(sandboxController, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if token = 0", async function () {
      await expect(
        sandboxController.whitelistCollateralAsset(
          ethers.constants.AddressZero,
          priceFeedCollateralTest.address,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if feed = 0", async function () {
      await expect(
        sandboxController.whitelistCollateralAsset(
          tokenCollateralTest.address,
          ethers.constants.AddressZero,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
    });

    it("reverts if token already whitelisted as collateral", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      await sandboxController.whitelistCollateralAsset(
        tokenCollateralTest.address,
        priceFeedCollateralTest.address,
        collateralConfig.minBorrowColF,
        collateralConfig.maxBorrowColF,
        collateralConfig.minLiqColF,
        collateralConfig.maxLiqColF,
        collateralConfig.minLiqF,
        collateralConfig.maxLiqF
      );

      await expect(
        sandboxController.whitelistCollateralAsset(
          tokenCollateralTest.address,
          priceFeedCollateralTest.address,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      ).to.be.revertedWithCustomError(sandboxController, "CollateralTokenAlreadyWhitelisted");

      await snapshot.restore();
    });

    it("reverts if pricefeed does not match the token", async function () {
      const tokenA = await makeMockERC20({ name: "C1", symbol: "C1" });
      const priceFeedA = await makePriceFeed(tokenA.address);

      await expect(
        sandboxController.whitelistCollateralAsset(
          tokenCollateralTest.address,
          priceFeedA.address,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      ).to.be.revertedWithCustomError(sandboxController, "WrongPriceFeedUnderlying");
    });

    it("reverts if different price feed already used for token", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();

      await sandboxController.whitelistBaseAsset(tokenCollateralTest.address, priceFeedCollateralTest.address, makeValidCurve(), 100);

      const priceFeedA = await makePriceFeed(tokenCollateralTest.address);

      await expect(
        sandboxController.whitelistCollateralAsset(
          tokenCollateralTest.address,
          priceFeedA.address,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      ).to.be.revertedWithCustomError(sandboxController, "DifferentPriceFeedAlreadyUsedForToken");

      await snapshot.restore();
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

    describe("reverts on invalid borrow factors", function () {
      beforeEach(async function () {
        collateralConfig = {
          minBorrowColF: ethers.utils.parseEther("0.5").toString(),
          maxBorrowColF: ethers.utils.parseEther("0.8").toString(),
          minLiqColF: ethers.utils.parseEther("0.6").toString(),
          maxLiqColF: ethers.utils.parseEther("0.9").toString(),
          minLiqF: ethers.utils.parseEther("0.7").toString(),
          maxLiqF: ethers.utils.parseEther("0.95").toString(),
        };
      });

      after(async function () {
        collateralConfig = {
          minBorrowColF: ethers.utils.parseEther("0.5").toString(),
          maxBorrowColF: ethers.utils.parseEther("0.8").toString(),
          minLiqColF: ethers.utils.parseEther("0.6").toString(),
          maxLiqColF: ethers.utils.parseEther("0.9").toString(),
          minLiqF: ethers.utils.parseEther("0.7").toString(),
          maxLiqF: ethers.utils.parseEther("0.95").toString(),
        };
      });

      it("reverts if minBorrowCollateralFactor < 10%", async function () {
        collateralConfig.minBorrowColF = ethers.utils.parseEther("0.1").sub(1).toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if minBorrowCollateralFactor > minLiquidateCollateralFactor", async function () {
        collateralConfig.minBorrowColF = ethers.utils.parseEther("0.65").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if minLiquidateCollateralFactor > minLiquidationFactor", async function () {
        collateralConfig.minLiqColF = ethers.utils.parseEther("0.75").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if maxBorrowCollateralFactor > maxLiquidateCollateralFactor", async function () {
        collateralConfig.maxBorrowColF = ethers.utils.parseEther("0.92").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if maxLiquidateCollateralFactor > maxLiquidationFactor", async function () {
        collateralConfig.maxLiqColF = ethers.utils.parseEther("0.96").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if maxLiquidationFactor > 100%", async function () {
        collateralConfig.maxLiqF = ethers.utils.parseEther("1").add(1).toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if minBorrowCollateralFactor > maxBorrowCollateralFactor", async function () {
        collateralConfig.minBorrowColF = ethers.utils.parseEther("0.6").toString();
        collateralConfig.maxBorrowColF = ethers.utils.parseEther("0.5").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if minLiquidateCollateralFactor > maxLiquidateCollateralFactor", async function () {
        collateralConfig.maxBorrowColF = ethers.utils.parseEther("0.65").toString();
        collateralConfig.minLiqColF = ethers.utils.parseEther("0.7").toString();
        collateralConfig.maxLiqColF = ethers.utils.parseEther("0.65").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });

      it("reverts if minLiquidationFactor > maxLiquidationFactor", async function () {
        collateralConfig.maxLiqColF = ethers.utils.parseEther("0.85").toString();
        collateralConfig.minLiqF = ethers.utils.parseEther("0.9").toString();
        collateralConfig.maxLiqF = ethers.utils.parseEther("0.85").toString();

        await expect(
          sandboxController.whitelistCollateralAsset(
            tokenCollateralTest.address,
            priceFeedCollateralTest.address,
            collateralConfig.minBorrowColF,
            collateralConfig.maxBorrowColF,
            collateralConfig.minLiqColF,
            collateralConfig.maxLiqColF,
            collateralConfig.minLiqF,
            collateralConfig.maxLiqF
          )
        ).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
      });
    });
  });

  describe("whitelistCollateralAsset - happy cases", function () {
    let tokenCollateralTest;
    let priceFeedCollateralTest;

    const collateralConfig = {
      minBorrowColF: ethers.utils.parseEther("0.5").toString(),
      maxBorrowColF: ethers.utils.parseEther("0.8").toString(),
      minLiqColF: ethers.utils.parseEther("0.6").toString(),
      maxLiqColF: ethers.utils.parseEther("0.9").toString(),
      minLiqF: ethers.utils.parseEther("0.7").toString(),
      maxLiqF: ethers.utils.parseEther("0.95").toString(),
    };

    before(async function () {
      tokenCollateralTest = await makeMockERC20({ name: "CollateralToken", symbol: "CT" });
      priceFeedCollateralTest = await makePriceFeed(tokenCollateralTest.address);

      await sandboxController.whitelistCollateralAsset(
        tokenCollateralTest.address,
        priceFeedCollateralTest.address,
        collateralConfig.minBorrowColF,
        collateralConfig.maxBorrowColF,
        collateralConfig.minLiqColF,
        collateralConfig.maxLiqColF,
        collateralConfig.minLiqF,
        collateralConfig.maxLiqF
      );
    });

    it("should show that token is whitelised", async function () {
      expect(await sandboxController.isCollateralTokenWhitelisted(tokenCollateralTest.address)).to.be.true;
    });

    it("should update state for collateral token", async function () {
      const data = await sandboxController.collateralAssets(tokenCollateralTest.address);
      expect(data.collateralToken).to.equal(tokenCollateralTest.address);
      expect(data.priceFeed).to.equal(priceFeedCollateralTest.address);
      expect(data.decimals).to.equal(18);
    });

    it("should record collateral token factors", async function () {
      const data = await sandboxController.collateralAssets(tokenCollateralTest.address);

      expect(data.minBorrowCollateralFactor).to.equal(collateralConfig.minBorrowColF);
      expect(data.maxBorrowCollateralFactor).to.equal(collateralConfig.maxBorrowColF);
      expect(data.minLiquidateCollateralFactor).to.equal(collateralConfig.minLiqColF);
      expect(data.maxLiquidateCollateralFactor).to.equal(collateralConfig.maxLiqColF);
      expect(data.minLiquidationFactor).to.equal(collateralConfig.minLiqF);
      expect(data.maxLiquidationFactor).to.equal(collateralConfig.maxLiqF);
    });

    it("should record collateral token price feed", async function () {
      expect(await sandboxController.tokenToPriceFeed(tokenCollateralTest.address)).to.equal(priceFeedCollateralTest.address);
    });

    it("should emit CollateralAssetWhitelisted event with correct args", async function () {
      const token = await makeMockERC20({ name: "C2", symbol: "C2" });
      const priceFeed = await makePriceFeed(token.address);

      expect(
        await sandboxController.whitelistCollateralAsset(
          token.address,
          priceFeed.address,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      )
        .to.emit(sandboxController, "CollateralAssetWhitelisted")
        .withArgs(token.address, priceFeed.address, 18);
    });

    it("should list collateral with min borrow factor = 10%", async function () {
      const token = await makeMockERC20({ name: "C5", symbol: "C5" });
      const priceFeed = await makePriceFeed(token.address);

      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          priceFeed.address,
          ethers.utils.parseEther("0.1"),
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          collateralConfig.maxLiqF
        )
      ).to.not.be.reverted;
    });

    it("should list collateral with max liq factor = 100%", async function () {
      const token = await makeMockERC20({ name: "C6", symbol: "C6" });
      const priceFeed = await makePriceFeed(token.address);

      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          priceFeed.address,
          collateralConfig.minBorrowColF,
          collateralConfig.maxBorrowColF,
          collateralConfig.minLiqColF,
          collateralConfig.maxLiqColF,
          collateralConfig.minLiqF,
          ethers.utils.parseEther("1")
        )
      ).to.not.be.reverted;
    });

    it("should list collateral with extreem factors", async function () {
      const token = await makeMockERC20({ name: "C7", symbol: "C7" });
      const priceFeed = await makePriceFeed(token.address);

      await expect(
        sandboxController.whitelistCollateralAsset(
          token.address,
          priceFeed.address,
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1"),
          ethers.utils.parseEther("1")
        )
      ).to.not.be.reverted;

      const token2 = await makeMockERC20({ name: "C8", symbol: "C8" });
      const priceFeed2 = await makePriceFeed(token2.address);

      await expect(
        sandboxController.whitelistCollateralAsset(
          token2.address,
          priceFeed2.address,
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.1"),
          ethers.utils.parseEther("0.1")
        )
      ).to.not.be.reverted;
    });
  });

  describe("setConfiguration", function () {
    let newConfig: SandboxControllerConfigurationStruct;

    beforeEach(async function () {
      newConfig = {
        targetPercent: ethers.utils.parseEther("0.45").toString(),
        storeFrontPriceFactor: ethers.utils.parseEther("0.65").toString(),
        minUpdateTime: 1000,
        maxUpdateTime: 24 * 60 * 60,
        suggestedAmountOfSeedReserves: ethers.utils.parseEther("1").toString(),
        suggestedLockTimeOfSeedReserves: 1500,
      };
    });

    it("reverts if caller is dao", async function () {
      await expect(sandboxController.connect(attacker).setConfiguration(newConfig))
        .to.be.revertedWithCustomError(sandboxController, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if storeFrontPriceFactor > 1e18", async function () {
      newConfig.storeFrontPriceFactor = ethers.utils.parseEther("1").add(1).toString();

      await expect(sandboxController.setConfiguration(newConfig)).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if targetPercent > 50%", async function () {
      newConfig.targetPercent = ethers.utils.parseEther("0.5").add(1).toString();

      await expect(sandboxController.setConfiguration(newConfig)).to.be.revertedWithCustomError(sandboxController, "InvalidFactors");
    });

    it("reverts if minUpdateTime = 0", async function () {
      newConfig.minUpdateTime = 0;
      await expect(sandboxController.setConfiguration(newConfig)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
    });

    it("reverts if minUpdateTime > maxUpdateTime", async function () {
      newConfig.minUpdateTime = 24 * 60 * 60 + 1;
      await expect(sandboxController.setConfiguration(newConfig)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
    });

    it("reverts if suggestedAmountOfSeedReserves = 0", async function () {
      newConfig.suggestedAmountOfSeedReserves = 0;
      await expect(sandboxController.setConfiguration(newConfig)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
    });

    it("reverts if suggestedLockTimeOfSeedReserves = 0", async function () {
      newConfig.suggestedLockTimeOfSeedReserves = 0;
      await expect(sandboxController.setConfiguration(newConfig)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
    });

    it("updates configuration with valid values", async function () {
      const snapshot: SnapshotRestorer = await takeSnapshot();
      await sandboxController.setConfiguration(newConfig);

      const data = await sandboxController.config();

      expect(data.targetPercent).to.equal(ethers.utils.parseEther("0.45").toString());
      expect(data.storeFrontPriceFactor).to.equal(ethers.utils.parseEther("0.65").toString());
      expect(data.minUpdateTime).to.equal(1000);
      expect(data.maxUpdateTime).to.equal(24 * 60 * 60);
      expect(data.suggestedAmountOfSeedReserves).to.equal(ethers.utils.parseEther("1").toString());
      expect(data.suggestedLockTimeOfSeedReserves).to.equal(1500);

      await snapshot.restore();
    });

    it("emits event", async function () {
      const tx = await sandboxController.setConfiguration(newConfig);

      const rcpt = await tx.wait();
      const ev = rcpt.events?.find((e: any) => e.event === "ConfigurationChanged");

      /// old config
      expect(ev.args.oldConfig.targetPercent).to.equal(ethers.utils.parseEther("0.5").toString());
      expect(ev.args.oldConfig.storeFrontPriceFactor).to.equal(parseEther("0.6").toString());
      expect(ev.args.oldConfig.minUpdateTime).to.equal(MIN_UPDATE_TIME);
      expect(ev.args.oldConfig.maxUpdateTime).to.equal(DEFAULT_UPDATE_TIME);
      expect(ev.args.oldConfig.suggestedAmountOfSeedReserves).to.equal(ethers.utils.parseEther("500").toString());
      expect(ev.args.oldConfig.suggestedLockTimeOfSeedReserves).to.equal(86400);
      /// new config
      expect(ev.args.newConfig.targetPercent).to.equal(ethers.utils.parseEther("0.45").toString());
      expect(ev.args.newConfig.storeFrontPriceFactor).to.equal(parseEther("0.65").toString());
      expect(ev.args.newConfig.minUpdateTime).to.equal(1000);
      expect(ev.args.newConfig.maxUpdateTime).to.equal(24 * 60 * 60);
      expect(ev.args.newConfig.suggestedAmountOfSeedReserves).to.equal(ethers.utils.parseEther("1").toString());
      expect(ev.args.newConfig.suggestedLockTimeOfSeedReserves).to.equal(1500);
    });
  });

  describe("setFeeEnabled", function () {
    it("reverts if caller is not dao", async function () {
      await expect(sandboxController.connect(attacker).setFeeEnabled(true)).to.be.revertedWithCustomError(sandboxController, "NotDao");
    });

    it("reverts for owner (if caller is not dao)", async function () {
      await expect(sandboxController.connect(owner).setFeeEnabled(true)).to.be.revertedWithCustomError(sandboxController, "NotDao");
    });

    it("sets feeEnabled", async function () {
      expect(await sandboxController.feeEnabled()).to.be.false;

      await expect(sandboxController.connect(dao).setFeeEnabled(true)).to.not.be.reverted;
      expect(await sandboxController.feeEnabled()).to.be.true;
    });

    it("emits event", async function () {
      expect(await sandboxController.feeEnabled()).to.be.true;

      expect(await sandboxController.connect(dao).setFeeEnabled(false))
        .to.emit(sandboxController, "FeeEnabledSet")
        .withArgs(false);
    });

    it("reverts for the same setting", async function () {
      expect(await sandboxController.feeEnabled()).to.be.false;
      await expect(sandboxController.connect(dao).setFeeEnabled(false)).to.be.revertedWithCustomError(
        sandboxController,
        "IncorrectSetting"
      );

      await sandboxController.connect(dao).setFeeEnabled(true);

      await expect(sandboxController.connect(dao).setFeeEnabled(true)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
      await sandboxController.connect(dao).setFeeEnabled(false);
    });
  });

  describe("addBaseAssetCurve", function () {
    let tokenTest: any;
    let priceFeedTest: any;
    let curve: BaseAssetCurveStruct = makeValidCurve();

    before(async function () {
      tokenTest = await makeMockERC20({ name: "T9", symbol: "T9" });
      priceFeedTest = await makePriceFeed(tokenTest.address);
      await sandboxController.connect(dao).whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10);
    });

    describe("reverts on general checks", function () {
      it("reverts if token = 0", async function () {
        await expect(sandboxController.addBaseAssetCurve(ethers.constants.AddressZero, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "ZeroAddress"
        );
      });

      it("reverts if token not whitelisted", async function () {
        const token2 = await makeMockERC20({ name: "T10", symbol: "T10" });
        await expect(sandboxController.addBaseAssetCurve(token2.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "BaseTokenNotWhitelisted"
        );
      });

      it("reverts if caller not authorized", async function () {
        await expect(sandboxController.connect(attacker).addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "Unauthorized"
        );
      });
    });

    describe("reverts on invalid curves", function () {
      afterEach(async function () {
        curve = makeValidCurve();
      });

      it("reverts for zero supply kink", async function () {
        curve.supplyKink = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for zero borrow kink", async function () {
        curve.borrowKink = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for supply kink > 1e18", async function () {
        curve.supplyKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for borrow kink > 1e18", async function () {
        curve.borrowKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for supply slope high = 0", async function () {
        curve.supplyPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for supply slope low = 0", async function () {
        curve.supplyPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for borrow slope high = 0", async function () {
        curve.borrowPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for borrow slope low = 0", async function () {
        curve.borrowPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for borrow base = 0", async function () {
        curve.borrowPerYearInterestRateBase = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });

      it("reverts for supply base = 0", async function () {
        curve.supplyPerYearInterestRateBase = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(sandboxController.addBaseAssetCurve(tokenTest.address, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "InvalidCurveConfiguration"
        );
      });
    });

    describe("happy cases", function () {
      it("should work for dao and contractor", async function () {
        await sandboxController.connect(dao).grantContractorRole(other.address);

        await expect(sandboxController.connect(dao).addBaseAssetCurve(tokenTest.address, curve)).to.not.be.reverted;

        await expect(sandboxController.connect(other).addBaseAssetCurve(tokenTest.address, curve)).to.not.be.reverted;
      });

      it("should append the curve and set storage", async function () {
        let curveTest: BaseAssetCurveStruct = {
          supplyKink: ethers.utils.parseEther("0.3").toString(),
          supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("100"),
          supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
          supplyPerYearInterestRateBase: ethers.BigNumber.from("200"),
          borrowKink: ethers.utils.parseEther("0.6").toString(),
          borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("2000"),
          borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("3000"),
          borrowPerYearInterestRateBase: ethers.BigNumber.from("20"),
        };
        let curvesNumBefore = (await sandboxController.curves(tokenTest.address)).length;
        await sandboxController.connect(dao).addBaseAssetCurve(tokenTest.address, curveTest);

        let curvesNumAfter = (await sandboxController.curves(tokenTest.address)).length;
        expect(curvesNumAfter - curvesNumBefore).to.equal(1);

        let newCurveAfter: BaseAssetCurveStruct = (await sandboxController.curves(tokenTest.address))[curvesNumAfter - 1];

        expect(newCurveAfter.borrowKink).to.be.equal(curveTest.borrowKink);
        expect(newCurveAfter.borrowPerYearInterestRateSlopeLow).to.be.equal(curveTest.borrowPerYearInterestRateSlopeLow);
        expect(newCurveAfter.borrowPerYearInterestRateSlopeHigh).to.be.equal(curveTest.borrowPerYearInterestRateSlopeHigh);
        expect(newCurveAfter.borrowPerYearInterestRateBase).to.be.equal(curveTest.borrowPerYearInterestRateBase);
        expect(newCurveAfter.supplyKink).to.be.equal(curveTest.supplyKink);
        expect(newCurveAfter.supplyPerYearInterestRateSlopeLow).to.be.equal(curveTest.supplyPerYearInterestRateSlopeLow);
        expect(newCurveAfter.supplyPerYearInterestRateSlopeHigh).to.be.equal(curveTest.supplyPerYearInterestRateSlopeHigh);
        expect(newCurveAfter.supplyPerYearInterestRateBase).to.be.equal(curveTest.supplyPerYearInterestRateBase);
      });

      it("should emit event", async function () {
        let curveExpectedIndex = (await sandboxController.curves(tokenTest.address)).length;
        expect(await sandboxController.connect(dao).addBaseAssetCurve(tokenTest.address, curve))
          .to.emit(sandboxController, "BaseAssetCurveAdded")
          .withArgs(tokenTest.address, curve, curveExpectedIndex);
      });
    });
  });

  describe("changeBaseAssetCurve", function () {
    let tokenTest: any;
    let priceFeedTest: any;
    let curve: BaseAssetCurveStruct = makeValidCurve();
    let curveTest: BaseAssetCurveStruct = {
      supplyKink: ethers.utils.parseEther("0.3").toString(),
      supplyPerYearInterestRateSlopeLow: ethers.BigNumber.from("100"),
      supplyPerYearInterestRateSlopeHigh: ethers.BigNumber.from("2000"),
      supplyPerYearInterestRateBase: ethers.BigNumber.from("200"),
      borrowKink: ethers.utils.parseEther("0.6").toString(),
      borrowPerYearInterestRateSlopeLow: ethers.BigNumber.from("2000"),
      borrowPerYearInterestRateSlopeHigh: ethers.BigNumber.from("3000"),
      borrowPerYearInterestRateBase: ethers.BigNumber.from("20"),
    };
    let curveIndex;

    before(async function () {
      tokenTest = await makeMockERC20({ name: "T11", symbol: "T11" });
      priceFeedTest = await makePriceFeed(tokenTest.address);

      await sandboxController.connect(dao).whitelistBaseAsset(tokenTest.address, priceFeedTest.address, curve, 10);
      await sandboxController.connect(dao).addBaseAssetCurve(tokenTest.address, curveTest);

      curveIndex = (await sandboxController.curves(tokenTest.address)).length - 1;
    });

    describe("reverts on general checks", function () {
      it("reverts if token = 0", async function () {
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(ethers.constants.AddressZero, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "ZeroAddress");
      });

      it("reverts if token not whitelisted", async function () {
        const token2 = await makeMockERC20({ name: "T12", symbol: "T12" });
        await expect(sandboxController.connect(dao).changeBaseAssetCurve(token2.address, curveIndex, curve)).to.be.revertedWithCustomError(
          sandboxController,
          "BaseTokenNotWhitelisted"
        );
      });

      it("reverts if caller not authorized", async function () {
        await expect(
          sandboxController.connect(attacker).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "Unauthorized");
      });

      it("reverts if curve index is to high", async function () {
        let curvesNum = (await sandboxController.curves(tokenTest.address)).length;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curvesNum + 1, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });
    });

    describe("reverts on invalid curves", function () {
      afterEach(async function () {
        curve = makeValidCurve();
      });

      it("reverts for zero supply kink", async function () {
        curve.supplyKink = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for zero borrow kink", async function () {
        curve.borrowKink = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply kink > 1e18", async function () {
        curve.supplyKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow kink > 1e18", async function () {
        curve.borrowKink = parseEther("1").add(1).toString();

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply slope high = 0", async function () {
        curve.supplyPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply slope low = 0", async function () {
        curve.supplyPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow slope high = 0", async function () {
        curve.borrowPerYearInterestRateSlopeHigh = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow slope low = 0", async function () {
        curve.borrowPerYearInterestRateSlopeLow = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for borrow base = 0", async function () {
        curve.borrowPerYearInterestRateBase = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });

      it("reverts for supply base = 0", async function () {
        curve.supplyPerYearInterestRateBase = 0;

        expect(await sandboxController.isCurveConfigurationValid(curve)).to.be.false;
        await expect(
          sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCurveConfiguration");
      });
    });
    describe("happy cases", function () {
      it("should work for dao and contractor", async function () {
        const snapshot: SnapshotRestorer = await takeSnapshot();
        await sandboxController.connect(dao).grantContractorRole(other.address);

        await expect(sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)).to.not.be.reverted;

        await expect(sandboxController.connect(other).changeBaseAssetCurve(tokenTest.address, curveIndex, curve)).to.not.be.reverted;

        await snapshot.restore();
      });

      it("should append the curve and set storage", async function () {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        let newCurveBefore: BaseAssetCurveStruct = (await sandboxController.curves(tokenTest.address))[curveIndex];

        expect(newCurveBefore.borrowKink).to.be.equal(curveTest.borrowKink);
        expect(newCurveBefore.borrowPerYearInterestRateSlopeLow).to.be.equal(curveTest.borrowPerYearInterestRateSlopeLow);
        expect(newCurveBefore.borrowPerYearInterestRateSlopeHigh).to.be.equal(curveTest.borrowPerYearInterestRateSlopeHigh);
        expect(newCurveBefore.borrowPerYearInterestRateBase).to.be.equal(curveTest.borrowPerYearInterestRateBase);
        expect(newCurveBefore.supplyKink).to.be.equal(curveTest.supplyKink);
        expect(newCurveBefore.supplyPerYearInterestRateSlopeLow).to.be.equal(curveTest.supplyPerYearInterestRateSlopeLow);
        expect(newCurveBefore.supplyPerYearInterestRateSlopeHigh).to.be.equal(curveTest.supplyPerYearInterestRateSlopeHigh);
        expect(newCurveBefore.supplyPerYearInterestRateBase).to.be.equal(curveTest.supplyPerYearInterestRateBase);

        await sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve);

        let newCurveAfter = (await sandboxController.curves(tokenTest.address))[curveIndex];

        expect(newCurveAfter.borrowKink).to.be.equal(curve.borrowKink);
        expect(newCurveAfter.borrowPerYearInterestRateSlopeLow).to.be.equal(curve.borrowPerYearInterestRateSlopeLow);
        expect(newCurveAfter.borrowPerYearInterestRateSlopeHigh).to.be.equal(curve.borrowPerYearInterestRateSlopeHigh);
        expect(newCurveAfter.borrowPerYearInterestRateBase).to.be.equal(curve.borrowPerYearInterestRateBase);
        expect(newCurveAfter.supplyKink).to.be.equal(curve.supplyKink);
        expect(newCurveAfter.supplyPerYearInterestRateSlopeLow).to.be.equal(curve.supplyPerYearInterestRateSlopeLow);
        expect(newCurveAfter.supplyPerYearInterestRateSlopeHigh).to.be.equal(curve.supplyPerYearInterestRateSlopeHigh);
        expect(newCurveAfter.supplyPerYearInterestRateBase).to.be.equal(curve.supplyPerYearInterestRateBase);

        await snapshot.restore();
      });

      it("should emit event", async function () {
        const snapshot: SnapshotRestorer = await takeSnapshot();

        expect(await sandboxController.connect(dao).changeBaseAssetCurve(tokenTest.address, curveIndex, curve))
          .to.emit(sandboxController, "BaseAssetCurveChanged")
          .withArgs(tokenTest.address, curveTest, curve, curveIndex);

        await snapshot.restore();
      });
    });
  });

  describe("Reserve Commission and Thresholds", function () {
    describe("setMarketStateCommissions", function () {
      it("reverts if caller is not dao", async function () {
        await expect(sandboxController.connect(attacker).setMarketStateCommissions(0, parseEther("0.5"), parseEther("0.2")))
          .to.be.revertedWithCustomError(sandboxController, "NotDao")
          .withArgs(attacker.address);
      });

      it("reverts if sum of commissions exceed 80% (pair 1)", async function () {
        await expect(
          sandboxController.setMarketStateCommissions(0, parseEther("0.5").add(1), parseEther("0.3"))
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCommissions");
        await expect(
          sandboxController.setMarketStateCommissions(0, parseEther("0.5"), parseEther("0.3").add(1))
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCommissions");
      });

      it("reverts if sum of commissions exceed 80% (pair 2)", async function () {
        await expect(
          sandboxController.setMarketStateCommissions(1, parseEther("0.5").add(1), parseEther("0.3"))
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCommissions");
        await expect(
          sandboxController.setMarketStateCommissions(1, parseEther("0.5"), parseEther("0.3").add(1))
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCommissions");
      });

      it("reverts if sum of commissions exceed 80% (pair 3)", async function () {
        await expect(
          sandboxController.setMarketStateCommissions(2, parseEther("0.5").add(1), parseEther("0.3"))
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCommissions");
        await expect(
          sandboxController.setMarketStateCommissions(2, parseEther("0.5"), parseEther("0.3").add(1))
        ).to.be.revertedWithCustomError(sandboxController, "InvalidCommissions");
      });

      it("reverts if index is greater than number of states", async function () {
        await expect(sandboxController.setMarketStateCommissions(3, parseEther("0.5"), parseEther("0.3"))).to.be.revertedWithCustomError(
          sandboxController,
          "IncorrectIndex"
        );
      });

      it("updates reserve commissions (pair 1) and emits events", async function () {
        let commissionsBefore = [await sandboxController.reserveCommission(0), await sandboxController.protocolCommission(0)];
        let commissionsToSet = [parseEther("0.5"), parseEther("0.3")];
        expect(await sandboxController.setMarketStateCommissions(0, commissionsToSet[0], commissionsToSet[1]))
          .to.emit(sandboxController, "CommissionChanged")
          .withArgs(0, commissionsBefore[0], commissionsToSet[0], commissionsBefore[1], commissionsToSet[1]);

        expect(await sandboxController.reserveCommission(0)).to.equal(commissionsToSet[0]);
        expect(await sandboxController.protocolCommission(0)).to.equal(commissionsToSet[1]);
      });

      it("updates reserve commissions (pair 2) and emits events", async function () {
        let commissionsBefore = [await sandboxController.reserveCommission(1), await sandboxController.protocolCommission(1)];
        let commissionsToSet = [parseEther("0.5"), parseEther("0.3")];
        expect(await sandboxController.setMarketStateCommissions(1, commissionsToSet[0], commissionsToSet[1]))
          .to.emit(sandboxController, "CommissionChanged")
          .withArgs(0, commissionsBefore[0], commissionsToSet[0], commissionsBefore[1], commissionsToSet[1]);

        expect(await sandboxController.reserveCommission(1)).to.equal(commissionsToSet[0]);
        expect(await sandboxController.protocolCommission(1)).to.equal(commissionsToSet[1]);
      });

      it("updates reserve commissions (pair 3) and emits events", async function () {
        let commissionsBefore = [await sandboxController.reserveCommission(2), await sandboxController.protocolCommission(2)];
        let commissionsToSet = [parseEther("0.5"), parseEther("0.3")];
        expect(await sandboxController.setMarketStateCommissions(2, commissionsToSet[0], commissionsToSet[1]))
          .to.emit(sandboxController, "CommissionChanged")
          .withArgs(0, commissionsBefore[0], commissionsToSet[0], commissionsBefore[1], commissionsToSet[1]);

        expect(await sandboxController.reserveCommission(2)).to.equal(commissionsToSet[0]);
        expect(await sandboxController.protocolCommission(2)).to.equal(commissionsToSet[1]);
      });

      it("allows to set 0 commissions", async function () {
        await expect(sandboxController.setMarketStateCommissions(0, 0, 0)).to.not.be.reverted;
        await expect(sandboxController.setMarketStateCommissions(1, 0, 0)).to.not.be.reverted;
        await expect(sandboxController.setMarketStateCommissions(2, 0, 0)).to.not.be.reverted;
      });
    });

    describe("getCommissions", function () {
      let curReserves, seedReserves, targetReserves: any;

      before(async function () {
        curReserves = ethers.utils.parseEther("300");
        targetReserves = ethers.utils.parseEther("200");
        seedReserves = ethers.utils.parseEther("100");

        await sandboxController.setMarketStateCommissions(0, ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.2"));
        await sandboxController.setMarketStateCommissions(1, ethers.utils.parseEther("0.2"), ethers.utils.parseEther("0.4"));
        await sandboxController.setMarketStateCommissions(2, ethers.utils.parseEther("0.3"), ethers.utils.parseEther("0.5"));
      });

      it("should return commission for Low state", async function () {
        const feeFlag = await sandboxController.feeEnabled();
        if (!feeFlag) {
          await sandboxController.connect(dao).setFeeEnabled(true);
        }

        let commissions = await sandboxController.getCommissions(curReserves, seedReserves, targetReserves);
        expect(commissions[0]).to.equal(ethers.utils.parseEther("0.1"));
        expect(commissions[1]).to.equal(ethers.utils.parseEther("0.2"));
      });

      it("should return commission for Low state if protocol fee disabled", async function () {
        const feeFlag = await sandboxController.feeEnabled();
        if (feeFlag) {
          await sandboxController.connect(dao).setFeeEnabled(false);
        }

        let commissions = await sandboxController.getCommissions(curReserves, seedReserves, targetReserves);
        expect(commissions[0]).to.equal(ethers.utils.parseEther("0.1"));
        expect(commissions[1]).to.equal(0);
      });

      it("should return commission for Medium state", async function () {
        curReserves = ethers.utils.parseEther("150");
        const feeFlag = await sandboxController.feeEnabled();
        if (!feeFlag) {
          await sandboxController.connect(dao).setFeeEnabled(true);
        }

        let commissions = await sandboxController.getCommissions(curReserves, seedReserves, targetReserves);
        expect(commissions[0]).to.equal(ethers.utils.parseEther("0.2"));
        expect(commissions[1]).to.equal(ethers.utils.parseEther("0.4"));
      });

      it("should return commission for Medium state if protocol fee disabled", async function () {
        curReserves = ethers.utils.parseEther("150");
        const feeFlag = await sandboxController.feeEnabled();
        if (feeFlag) {
          await sandboxController.connect(dao).setFeeEnabled(false);
        }

        let commissions = await sandboxController.getCommissions(curReserves, seedReserves, targetReserves);
        expect(commissions[0]).to.equal(ethers.utils.parseEther("0.2"));
        expect(commissions[1]).to.equal(0);
      });

      it("should return commission for High state", async function () {
        curReserves = ethers.utils.parseEther("50");
        const feeFlag = await sandboxController.feeEnabled();
        if (!feeFlag) {
          await sandboxController.connect(dao).setFeeEnabled(true);
        }

        let commissions = await sandboxController.getCommissions(curReserves, seedReserves, targetReserves);
        expect(commissions[0]).to.equal(ethers.utils.parseEther("0.3"));
        expect(commissions[1]).to.equal(ethers.utils.parseEther("0.5"));
      });

      it("should return commission for High state if protocol fee disabled", async function () {
        curReserves = ethers.utils.parseEther("50");
        const feeFlag = await sandboxController.feeEnabled();
        if (feeFlag) {
          await sandboxController.connect(dao).setFeeEnabled(false);
        }

        let commissions = await sandboxController.getCommissions(curReserves, seedReserves, targetReserves);
        expect(commissions[0]).to.equal(ethers.utils.parseEther("0.3"));
        expect(commissions[1]).to.equal(0);
      });
    });
  });

  describe("proposeDao", function () {
    it("should allow to propose new DAO", async function () {
      await sandboxController.proposeDao(other.address);
      expect(await sandboxController.proposedDao()).to.equal(other.address);
    });

    it("should emit event", async function () {
      expect(await sandboxController.proposeDao(other.address))
        .to.emit(sandboxController, "DaoProposed")
        .withArgs(dao.address, other.address);
    });

    it("should revert if proposed DAO is the zero address", async function () {
      await expect(sandboxController.proposeDao(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        sandboxController,
        "ZeroAddress"
      );
    });

    it("should revert if proposed DAO is the same as current", async function () {
      await expect(sandboxController.proposeDao(dao.address)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
    });
  });

  describe("acceptDao", function () {
    let snapshot: SnapshotRestorer;

    before(async function () {
      await sandboxController.proposeDao(other.address);
      snapshot = await takeSnapshot();
    });

    afterEach(async () => await snapshot.restore());

    it("should allow to accept dao role", async function () {
      await sandboxController.proposeDao(other.address);

      await sandboxController.connect(other).acceptDao();

      expect(await sandboxController.dao()).to.equal(other.address);
    });

    it("should emit event", async function () {
      expect(await sandboxController.connect(other).acceptDao())
        .to.emit(sandboxController, "DaoTransferred")
        .withArgs(dao.address, other.address);
    });

    it("proposed dao should be cleared after accepting", async function () {
      await sandboxController.connect(other).acceptDao();

      expect(await sandboxController.proposedDao()).to.equal(ethers.constants.AddressZero);
    });

    it("should revert if caller is not proposed dao", async function () {
      await expect(sandboxController.connect(attacker).acceptDao())
        .to.be.revertedWithCustomError(sandboxController, "NotProposedDao")
        .withArgs(attacker.address);
    });
  });

  describe("grantContractorRole", function () {
    it("should allow dao to grant contractor role", async function () {
      await sandboxController.connect(dao).grantContractorRole(ethers.constants.AddressZero);

      expect(await sandboxController.contractor()).to.not.be.eq(other.address);

      await sandboxController.connect(dao).grantContractorRole(other.address);

      expect(await sandboxController.contractor()).to.be.eq(other.address);
    });

    it("should emit event", async function () {
      expect(await sandboxController.connect(dao).grantContractorRole(other.address))
        .to.emit(sandboxController, "ContractorGranted")
        .withArgs(ethers.constants.AddressZero, other.address);
    });

    it("reverts if caller is not dao", async function () {
      await expect(sandboxController.connect(attacker).grantContractorRole(other.address))
        .to.be.revertedWithCustomError(sandboxController, "NotDao")
        .withArgs(attacker.address);
    });
  });

  describe("setTreasury", function () {
    it("reverts if caller is not dao", async function () {
      await expect(sandboxController.connect(attacker).setTreasury(attacker.address))
        .to.be.revertedWithCustomError(sandboxController, "NotDao")
        .withArgs(attacker.address);
    });

    it("reverts if _treasury is the zero address", async function () {
      await expect(sandboxController.setTreasury(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        sandboxController,
        "ZeroAddress"
      );
    });

    it("reverts if same treasury is set", async function () {
      const currentTreasury = await sandboxController.treasury();
      await expect(sandboxController.setTreasury(currentTreasury)).to.be.revertedWithCustomError(sandboxController, "IncorrectSetting");
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
